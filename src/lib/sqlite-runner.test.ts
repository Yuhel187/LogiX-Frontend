import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

describe("sqliteRunner persistence and deletion", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "logix-sqlite-test-"));
  const dbPath = path.join(tempDir, "threads.db");
  let closeDb: (() => void) | undefined;

  afterAll(() => {
    closeDb?.();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("initializes schema, stores run events, and removes a deleted thread", async () => {
    process.env.COPILOTKIT_SQLITE_PATH = dbPath;
    const mod = await import("./sqlite-runner");
    const runner = mod.sqliteRunner as unknown as {
      storeRun: (
        threadId: string,
        runId: string,
        events: unknown[],
        input: unknown,
        parentRunId?: string | null
      ) => void;
      getHistoricRuns: (threadId: string) => unknown[];
      db?: { close?: () => void };
    };
    closeDb = () => runner.db?.close?.();

    runner.storeRun(
      "logix_thread_test1",
      "run-1",
      [{ type: "RUN_STARTED", threadId: "logix_thread_test1", runId: "run-1" }],
      { threadId: "logix_thread_test1", runId: "run-1", messages: [] },
      null
    );
    expect(runner.getHistoricRuns("logix_thread_test1")).toHaveLength(1);

    mod.deleteThreadFromSqlite("logix_thread_test1");
    expect(runner.getHistoricRuns("logix_thread_test1")).toHaveLength(0);
  }, 20_000);
});
