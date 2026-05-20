import { db, type ArcherriesDB } from "./db";

export type UploadEntry = ArcherriesDB["upload_outbox"]["value"];
export type UploadNew = Omit<UploadEntry, "id" | "createdAt" | "retries" | "lastError">;

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
