import { db } from "./db";

export async function getCached<T>(path: string): Promise<T | null> {
  const conn = await db();
  const entry = await conn.get("responses", path);
  return entry ? (entry.data as T) : null;
}

export async function setCached<T>(path: string, data: T): Promise<void> {
  const conn = await db();
  await conn.put("responses", { path, data, fetchedAt: Date.now() });
}

/**
 * Mutiert einen gecachten Eintrag in-place. Wenn nichts gecached ist, no-op.
 * Nützlich für optimistic Updates während offline.
 */
export async function mutateCached<T>(
  path: string,
  mutator: (current: T) => T
): Promise<void> {
  const conn = await db();
  const entry = await conn.get("responses", path);
  if (!entry) return;
  const next = mutator(entry.data as T);
  await conn.put("responses", { path, data: next, fetchedAt: entry.fetchedAt });
}

/** Invalidiert (löscht) Cache-Einträge die zum Pattern passen. */
export async function invalidateCache(pattern: string | RegExp): Promise<void> {
  const conn = await db();
  const tx = conn.transaction("responses", "readwrite");
  const store = tx.objectStore("responses");
  const keys = await store.getAllKeys();
  for (const k of keys) {
    const matches = typeof pattern === "string" ? k.startsWith(pattern) : pattern.test(k);
    if (matches) await store.delete(k);
  }
  await tx.done;
}

export async function clearAllCache(): Promise<void> {
  const conn = await db();
  await conn.clear("responses");
}
