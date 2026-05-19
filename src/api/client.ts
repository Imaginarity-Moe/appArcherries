// Auf IONOS Shared Hosting intercepted der Reverse-Proxy /api/<route>-Anfragen
// (gibt /index.html zurück), bevor Apache mod_rewrite greift. Wir umgehen das,
// indem wir index.php direkt im Pfad nennen — das ist eine echte Datei, die
// von IONOS unangetastet bleibt. PATH_INFO trägt dann die Route.
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api/index.php";

import { getCached, setCached } from "../lib/cache";

const TOKEN_KEY = "archerries.token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  // IONOS-Shared-Hosting hat Spitzen-Last → TCP-Connection-Refused / 504 Gateway Timeout
  // sind keine echten App-Fehler. Wir retryen bis 2x bei Network-Errors und 504/503.
  const maxAttempts = 3;
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, { ...init, headers });
      const text = await res.text();
      const data = text ? safeJson(text) : null;

      if (!res.ok) {
        // 4xx → kein Retry, ist eine echte App-Fehlerantwort
        // 503/504 → Retry, IONOS-Shared-Hänger
        const retriable = res.status === 503 || res.status === 504;
        if (retriable && attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 600 * attempt));
          continue;
        }
        let msg = `Request failed (${res.status})`;
        if (data && typeof data === "object" && "error" in data) {
          msg = String((data as { error: unknown }).error);
        }
        throw new ApiError(res.status, msg, data);
      }
      return data as T;
    } catch (err) {
      lastErr = err;
      // ApiError = bewusste Backend-Antwort, nicht retryen außer 503/504 (oben behandelt)
      if (err instanceof ApiError) throw err;
      // Network-Error (TypeError "Failed to fetch") → retry
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 600 * attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastErr ?? new Error("Request failed after retries");
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

/**
 * Offline-aware GET: versucht Netzwerk, fällt bei Netzwerkfehler oder offline auf IDB-Cache zurück.
 * Bei erfolgreichem Netzwerkruf wird der Cache aktualisiert.
 */
export async function apiCached<T>(path: string): Promise<T> {
  if (navigator.onLine) {
    try {
      const data = await api<T>(path);
      await setCached(path, data);
      return data;
    } catch (err) {
      // Netzwerk-Fehler: auf Cache zurückfallen. ApiError (4xx/5xx) wird durchgereicht.
      if (err instanceof ApiError) throw err;
      const cached = await getCached<T>(path);
      if (cached !== null) return cached;
      throw err;
    }
  }
  const cached = await getCached<T>(path);
  if (cached !== null) return cached;
  throw new ApiError(0, "Offline und kein Cache verfügbar", null);
}

/**
 * Stale-While-Revalidate: Wenn Cache vorhanden, sofort zurückgeben und parallel im Hintergrund
 * vom Netzwerk frisch holen. `onRefresh` wird aufgerufen sobald die frische Antwort eintrifft —
 * UI kann dann ihren State updaten. Bei fehlendem Cache identisch zu apiCached (Network-First).
 *
 * Backend-Fehler (ApiError) in der Hintergrund-Revalidate werden geschluckt — der Cache-Wert
 * bleibt sichtbar. Vor allem für Listen-Endpoints (Dashboard, Stats) gedacht.
 */
export async function apiSWR<T>(
  path: string,
  onRefresh?: (fresh: T) => void
): Promise<T> {
  const cached = await getCached<T>(path);

  if (cached !== null) {
    if (navigator.onLine) {
      // Im Hintergrund refreshen — nicht awaiten
      api<T>(path)
        .then(async (fresh) => {
          await setCached(path, fresh);
          if (onRefresh) onRefresh(fresh);
        })
        .catch(() => {
          // Stale-Cache bleibt sichtbar — Background-Fehler wird verschluckt.
        });
    }
    return cached;
  }

  // Kein Cache → wie apiCached: Netzwerk versuchen.
  return apiCached<T>(path);
}
