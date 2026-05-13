import { db, type ArcherriesDB } from "./db";

export type OutboxEntry = ArcherriesDB["outbox"]["value"];
export type OutboxNew = Omit<OutboxEntry, "id" | "createdAt" | "retries" | "lastError">;

/** Outbox-Event-Emitter: UI kann auf Änderungen reagieren (Pending-Count etc.). */
const listeners = new Set<() => void>();
function notify() {
  for (const l of listeners) l();
}
export function subscribeOutbox(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function enqueue(entry: OutboxNew): Promise<number> {
  const conn = await db();
  const id = await conn.add("outbox", {
    ...entry,
    createdAt: Date.now(),
    retries: 0,
  });
  notify();
  return id as number;
}

export async function countPending(): Promise<number> {
  const conn = await db();
  return conn.count("outbox");
}

export async function listPending(): Promise<OutboxEntry[]> {
  const conn = await db();
  return conn.getAllFromIndex("outbox", "by-createdAt");
}

export async function removeEntry(id: number): Promise<void> {
  const conn = await db();
  await conn.delete("outbox", id);
  notify();
}

export async function markFailed(id: number, error: string): Promise<void> {
  const conn = await db();
  const entry = await conn.get("outbox", id);
  if (!entry) return;
  entry.retries += 1;
  entry.lastError = error;
  await conn.put("outbox", entry);
  notify();
}

export function notifyOutboxChanged(): void {
  notify();
}
