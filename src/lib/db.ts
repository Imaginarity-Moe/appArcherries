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
  /** Upload-Outbox: pending Binär-Uploads (Bilder), die bei nächster Online-Phase als multipart/form-data gesendet werden. */
  upload_outbox: {
    key: number;
    value: {
      id?: number;
      path: string;        // Ziel-URL relativ zum API-Base (z.B. "/trainings/123/targets/456/image")
      blob: Blob;          // Bild-Daten
      filename: string;
      kind: string;        // "target_image" | "avatar" | "bow_image" | ... — für Drain-Routing
      meta?: unknown;      // Optional Kontext-Info (z.B. training_id, target_id) für Cache-Invalidierung
      createdAt: number;
      retries: number;
      lastError?: string;
    };
    indexes: { "by-createdAt": number };
  };
}

let dbPromise: Promise<IDBPDatabase<ArcherriesDB>> | null = null;

export function db(): Promise<IDBPDatabase<ArcherriesDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ArcherriesDB>("archerries", 2, {
      upgrade(db, oldVersion) {
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
        if (oldVersion < 2 && !db.objectStoreNames.contains("upload_outbox")) {
          const store = db.createObjectStore("upload_outbox", { keyPath: "id", autoIncrement: true });
          store.createIndex("by-createdAt", "createdAt");
        }
      },
    });
  }
  return dbPromise;
}
