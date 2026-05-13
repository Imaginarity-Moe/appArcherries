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

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    if (data && typeof data === "object" && "error" in data) {
      msg = String((data as { error: unknown }).error);
    }
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
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
