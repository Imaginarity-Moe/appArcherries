import { db, type ArcherriesDB } from "./db";
import { getToken } from "../api/client";

export type UploadEntry = ArcherriesDB["upload_outbox"]["value"];
export type UploadNew = Omit<UploadEntry, "id" | "createdAt" | "retries" | "lastError">;

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api/index.php";

export type UploadResult<T> =
  | { ok: true; pending: false; data: T }
  | { ok: true; pending: true; pendingUrl: string };

/**
 * Bild-Upload mit Offline-Fallback. Versucht online zu posten;
 * bei Netzwerk-Fehler oder Offline queuet die Datei in `upload_outbox`
 * und gibt eine blob: URL als optimistischen Session-Preview zurück.
 *
 * 4xx-Antworten (außer 408/429) werden propagiert — echter App-Fehler.
 */
export async function tryUploadOrQueue<T>(opts: {
  path: string;
  file: File | Blob;
  filename: string;
  kind: string;
  meta?: unknown;
}): Promise<UploadResult<T>> {
  const { path, file, filename, kind, meta } = opts;

  if (navigator.onLine) {
    try {
      const fd = new FormData();
      fd.append("file", file, filename);
      const token = getToken();
      const res = await fetch(`${BASE}${path}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (res.ok) {
        const data = (await res.json()) as T;
        return { ok: true, pending: false, data };
      }
      // 4xx (außer 408/429) propagieren als echter Fehler
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Upload fehlgeschlagen (${res.status})`);
      }
      // 5xx / 408 / 429 → fall through zur Queue
    } catch (err) {
      if (!isNetErr(err)) throw err;
      // fall through zur Queue
    }
  }

  await enqueueUpload({ path, blob: file as Blob, filename, kind, meta });
  return { ok: true, pending: true, pendingUrl: URL.createObjectURL(file) };
}

function isNetErr(err: unknown): boolean {
  if (err instanceof TypeError) return true; // "Failed to fetch"
  return !navigator.onLine;
}

const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function subscribeUploadOutbox(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function enqueueUpload(entry: UploadNew): Promise<number> {
  const conn = await db();
  const id = await conn.add("upload_outbox", {
    ...entry,
    createdAt: Date.now(),
    retries: 0,
  });
  notify();
  return id as number;
}

export async function countPendingUploads(): Promise<number> {
  const conn = await db();
  return conn.count("upload_outbox");
}

export async function listPendingUploads(): Promise<UploadEntry[]> {
  const conn = await db();
  return conn.getAllFromIndex("upload_outbox", "by-createdAt");
}

export async function removeUploadEntry(id: number): Promise<void> {
  const conn = await db();
  await conn.delete("upload_outbox", id);
  notify();
}

export async function markUploadFailed(id: number, error: string): Promise<void> {
  const conn = await db();
  const entry = await conn.get("upload_outbox", id);
  if (!entry) return;
  entry.retries += 1;
  entry.lastError = error;
  await conn.put("upload_outbox", entry);
  notify();
}

export function notifyUploadOutboxChanged(): void {
  notify();
}
