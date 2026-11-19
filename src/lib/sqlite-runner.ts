import fs from "node:fs";
import path from "node:path";
import { SqliteAgentRunner } from "@copilotkit/sqlite-runner";

const defaultDbPath = path.join(process.cwd(), ".data", "threads.db");
const sqliteDbPath = process.env.COPILOTKIT_SQLITE_PATH || defaultDbPath;

const dbDir = path.dirname(sqliteDbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Global singleton prevents reopening the SQLite handle across Next.js dev HMR reloads.
const globalForSqlite = globalThis as unknown as {
  sqliteRunner?: SqliteAgentRunner;
};

export const sqliteRunner =
  globalForSqlite.sqliteRunner ??
  new SqliteAgentRunner({ dbPath: sqliteDbPath });

if (process.env.NODE_ENV !== "production") {
  globalForSqlite.sqliteRunner = sqliteRunner;
}

interface SqliteRunnerWithDb {
  db?: {
    prepare: (sql: string) => { run: (...args: unknown[]) => unknown };
  };
}

export function deleteThreadFromSqlite(threadId: string): void {
  try {
    const db = (sqliteRunner as unknown as SqliteRunnerWithDb).db;
    if (db) {
      db.prepare("DELETE FROM agent_runs WHERE thread_id = ?").run(threadId);
      db.prepare("DELETE FROM run_state WHERE thread_id = ?").run(threadId);
    }
  } catch (err) {
    console.error("[sqliteRunner] Failed to delete thread from sqlite:", err);
  }
}
