import { openDB, type IDBPDatabase, type DBSchema } from "idb";

export interface ArcherriesDB extends DBSchema {
  /** Response-Cache für GET-Endpoints. Key = canonical path inkl. query. */
  responses: {
    key: string;
    value: {
      path: string;
      data: unknown;
      fetchedAt: number;
    };
  };
  /** Outbox: pending Writes, die bei nächster Online-Phase gesendet werden. */
  outbox: {
    key: number;
    value: {
      id?: number;
      method: "POST" | "PATCH" | "DELETE";
      path: string;
      body: unknown;
      createdAt: number;
      retries: number;
      lastError?: string;
    };
    indexes: { "by-createdAt": number };
  };
  /** Mapping temp-IDs (offline angelegt) → echte Server-IDs nach Sync. */
  id_map: {
    key: string;
    value: {
      tempId: string;
      realId: number;
      resource: "training" | "parcours";
      resolvedAt: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<ArcherriesDB>> | null = null;

export function db(): Promise<IDBPDatabase<ArcherriesDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ArcherriesDB>("archerries", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("responses")) {
          db.createObjectStore("responses", { keyPath: "path" });
        }
        if (!db.objectStoreNames.contains("outbox")) {
          const store = db.createObjectStore("outbox", { keyPath: "id", autoIncrement: true });
          store.createIndex("by-createdAt", "createdAt");
        }
        if (!db.objectStoreNames.contains("id_map")) {
          db.createObjectStore("id_map", { keyPath: "tempId" });
        }
      },
    });
  }
  return dbPromise;
}
