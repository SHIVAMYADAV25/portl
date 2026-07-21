import * as SQLite from "expo-sqlite";
import { api, ApiUnreachableError } from "./api";

const DB_NAME = "portl-offline.db";
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS outbox (
          id TEXT PRIMARY KEY,
          endpoint TEXT NOT NULL,
          method TEXT NOT NULL,
          body TEXT,
          label TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

export interface OutboxItem {
  id: string;
  endpoint: string;
  method: "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** Human-readable summary shown in the "pending sync" UI, e.g. "Register Yuva — Flipkart" */
  label: string;
  createdAt: string;
}

export async function enqueue(item: Omit<OutboxItem, "id" | "createdAt">) {
  const db = await getDb();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date().toISOString();
  await db.runAsync(
    "INSERT INTO outbox (id, endpoint, method, body, label, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    id,
    item.endpoint,
    item.method,
    item.body ? JSON.stringify(item.body) : null,
    item.label,
    createdAt
  );
  return { ...item, id, createdAt };
}

export async function listPending(): Promise<OutboxItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    endpoint: string;
    method: "POST" | "PUT" | "DELETE";
    body: string | null;
    label: string;
    created_at: string;
  }>("SELECT * FROM outbox ORDER BY created_at ASC");
  return rows.map((r) => ({
    id: r.id,
    endpoint: r.endpoint,
    method: r.method,
    body: r.body ? JSON.parse(r.body) : undefined,
    label: r.label,
    createdAt: r.created_at,
  }));
}

async function remove(id: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM outbox WHERE id = ?", id);
}

/** Attempts to send every queued item in order. Stops (without throwing) at the first
 * unreachable error so a still-offline device doesn't spin through retries pointlessly. */
export async function flushQueue(): Promise<{ sent: number; remaining: number }> {
  const pending = await listPending();
  let sent = 0;
  for (const item of pending) {
    try {
      if (item.method === "POST") await api.post(item.endpoint, item.body);
      else if (item.method === "PUT") await api.put(item.endpoint, item.body);
      else await api.delete(item.endpoint);
      await remove(item.id);
      sent += 1;
    } catch (err) {
      if (err instanceof ApiUnreachableError) break; // still offline — stop and try again later
      // Any other error (e.g. 4xx) — drop it rather than retry forever with a bad payload.
      await remove(item.id);
    }
  }
  const remaining = (await listPending()).length;
  return { sent, remaining };
}

export async function pendingCount(): Promise<number> {
  return (await listPending()).length;
}
