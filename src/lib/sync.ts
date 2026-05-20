import { api, ApiError, getToken } from "../api/client";
import { db } from "./db";
import { invalidateCache } from "./cache";
import {
  listPending,
  markFailed,
  notifyOutboxChanged,
  removeEntry,
} from "./outbox";
import {
  listPendingUploads,
  markUploadFailed,
  notifyUploadOutboxChanged,
  removeUploadEntry,
} from "./uploadOutbox";

let draining = false;
let scheduledTimer: number | null = null;

/** Listener die feuern wenn ein Drain-Zyklus mit mindestens einem gesendeten Entry endet. */
const drainListeners = new Set<() => void>();

export function subscribeDrained(fn: () => void): () => void {
  drainListeners.add(fn);
  return () => drainListeners.delete(fn);
}

function notifyDrained() {
  for (const fn of drainListeners) {
    try {
      fn();
    } catch (e) {
      console.warn("[sync] drain listener failed", e);
    }
  }
}

/**
 * Versucht alle ausstehenden Outbox-Einträge an den Server zu senden.
 * Wird automatisch bei `online`-Event aufgerufen + alle 30s wenn online.
 */
export async function drain(): Promise<{ sent: number; failed: number }> {
  if (draining) return { sent: 0, failed: 0 };
  if (!navigator.onLine) return { sent: 0, failed: 0 };

  draining = true;
  let sent = 0;
  let failed = 0;

  try {
    const entries = await listPending();
    for (const entry of entries) {
      if (!navigator.onLine) break;
      try {
        const resolvedPath = await resolveTempIds(entry.path);
        const resolvedBody = await resolveTempIdsInBody(entry.body);

        const init: RequestInit = { method: entry.method };
        if (entry.method !== "DELETE" && resolvedBody !== undefined) {
          init.body = JSON.stringify(resolvedBody);
        }
        const response = await api<{ training?: { id: number } }>(resolvedPath, init);

        // POST /trainings legt ein Training mit temporärer ID an — Mapping speichern
        if (entry.method === "POST" && entry.path === "/trainings") {
          const tempId = extractTempIdFromBody(entry.body);
          if (tempId && response.training?.id) {
            await saveIdMapping(tempId, response.training.id, "training");
          }
        }

        // Caches die zu diesem Endpoint passen invalidieren
        await invalidateForPath(entry.path);

        await removeEntry(entry.id!);
        sent++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        // 4xx-Fehler (außer 408, 429) sind nicht durch Retry lösbar — verwerfen
        if (err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 408 && err.status !== 429) {
          console.warn("[sync] dropping unrecoverable entry", entry, err);
          await removeEntry(entry.id!);
        } else {
          await markFailed(entry.id!, msg);
          failed++;
        }
      }
    }
  } finally {
    draining = false;
    notifyOutboxChanged();
    if (sent > 0) notifyDrained();
  }

  // Auch Upload-Outbox abarbeiten — eigene Loop, andere Fehlerbehandlung
  const u = await drainUploads();
  return { sent: sent + u.sent, failed: failed + u.failed };
}

/**
 * Versucht alle ausstehenden Binär-Uploads als multipart/form-data zu senden.
 * Resolve temp-IDs im Pfad (z.B. /trainings/tmp_xyz/targets/-3/image — falls
 * Target-ID negativ war, ist Upload aktuell nicht möglich, weil das Target
 * erst nach JSON-Sync eine echte ID bekommt; in dem Fall lassen wir den
 * Eintrag bis zur nächsten Drain-Runde liegen).
 */
async function drainUploads(): Promise<{ sent: number; failed: number }> {
  if (!navigator.onLine) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const entries = await listPendingUploads();
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api/index.php";
  const token = getToken();

  for (const entry of entries) {
    if (!navigator.onLine) break;
    try {
      const resolvedPath = await resolveTempIds(entry.path);
      // Falls Pfad noch eine negative ID enthält (target_id < 0), Upload zurückstellen
      if (/\/-\d+\//.test(resolvedPath) || /\/-\d+$/.test(resolvedPath)) {
        continue;
      }
      const fd = new FormData();
      fd.append("file", entry.blob, entry.filename);
      const res = await fetch(`${base}${resolvedPath}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        // 4xx als unrecoverable verwerfen (außer 408/429), 5xx als retry
        if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
          console.warn("[sync] dropping unrecoverable upload", entry, res.status);
          await removeUploadEntry(entry.id!);
        } else {
          await markUploadFailed(entry.id!, `HTTP ${res.status}`);
          failed++;
        }
        continue;
      }
      // Erfolg — Caches invalidieren (Training neu laden zeigt echtes image_path)
      await invalidateForPath(entry.path);
      await removeUploadEntry(entry.id!);
      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await markUploadFailed(entry.id!, msg);
      failed++;
    }
  }
  notifyUploadOutboxChanged();
  if (sent > 0) notifyDrained();
  return { sent, failed };
}

async function resolveTempIds(path: string): Promise<string> {
  const conn = await db();
  let resolved = path;
  // Pattern: /trainings/tmp_xyz oder /trainings/tmp_xyz/targets
  const match = resolved.match(/tmp_[a-zA-Z0-9]+/g);
  if (match) {
    for (const tempId of match) {
      const mapping = await conn.get("id_map", tempId);
      if (mapping) resolved = resolved.split(tempId).join(String(mapping.realId));
    }
  }
  return resolved;
}

async function resolveTempIdsInBody(body: unknown): Promise<unknown> {
  if (body === null || body === undefined) return body;
  const conn = await db();
  const json = JSON.stringify(body);
  const matches = json.match(/tmp_[a-zA-Z0-9]+/g);
  if (!matches) return body;
  let resolved = json;
  for (const tempId of matches) {
    const mapping = await conn.get("id_map", tempId);
    if (mapping) resolved = resolved.split(`"${tempId}"`).join(String(mapping.realId));
  }
  return JSON.parse(resolved);
}

function extractTempIdFromBody(body: unknown): string | null {
  if (body && typeof body === "object" && "tempId" in body) {
    return (body as { tempId: string }).tempId;
  }
  return null;
}

async function saveIdMapping(tempId: string, realId: number, resource: "training" | "parcours"): Promise<void> {
  const conn = await db();
  await conn.put("id_map", { tempId, realId, resource, resolvedAt: Date.now() });
}

async function invalidateForPath(path: string): Promise<void> {
  // Liste-Caches immer invalidieren bei zugehörigem POST/PATCH/DELETE
  if (path.startsWith("/trainings")) {
    await invalidateCache(/^\/trainings/);
    await invalidateCache(/^\/stats/);
  } else if (path.startsWith("/parcours")) {
    await invalidateCache(/^\/parcours/);
  }
}

/** Wird aus main.tsx beim App-Start aufgerufen. */
export function startSync(): void {
  // Sofort versuchen
  drain().catch((e) => console.warn("[sync] initial drain failed", e));

  // Bei Reconnect
  window.addEventListener("online", () => {
    drain().catch((e) => console.warn("[sync] online drain failed", e));
  });

  // Periodisch (alle 30s) — fängt langsamen Online-Übergang ab, wo `online`-Event verspätet kommt
  scheduledTimer = window.setInterval(() => {
    if (navigator.onLine) drain().catch(() => {});
  }, 30_000);
}

export function stopSync(): void {
  if (scheduledTimer !== null) {
    clearInterval(scheduledTimer);
    scheduledTimer = null;
  }
}

/** Hilfs-Funktion: prüft ob ein Fehler ein Netzwerkfehler ist (vs. 4xx/5xx vom Server). */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof ApiError) return false; // Server hat geantwortet
  if (err instanceof TypeError) return true; // "Failed to fetch"
  return !navigator.onLine;
}
