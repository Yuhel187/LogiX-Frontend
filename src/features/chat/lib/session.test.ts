import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSessionAndThread,
  createNewThreadId,
  getInitialThreadId,
  getOrCreateSessionId,
  getOrCreateThreadId,
  saveThreadId,
  syncThreadScope,
} from "./session";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

describe("chat session & thread storage helpers", () => {
  beforeEach(() => {
    const storage = createMemoryStorage();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", {
      location: { search: "" },
      localStorage: storage,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists and reuses threadId and sessionId in localStorage", () => {
    const t1 = getOrCreateThreadId();
    const t2 = getOrCreateThreadId();
    expect(t1).toMatch(/^logix_thread_/);
    expect(t2).toBe(t1);

    const s1 = getOrCreateSessionId();
    const s2 = getOrCreateSessionId();
    expect(s1).toMatch(/^logix_session_/);
    expect(s2).toBe(s1);
  });

  it("prefers ?threadId= query param and updates localStorage", () => {
    vi.stubGlobal("window", {
      location: { search: "?threadId=logix_thread_from_url" },
      localStorage,
    });

    expect(getInitialThreadId()).toBe("logix_thread_from_url");
    expect(localStorage.getItem("logix_chat_thread_id")).toBe("logix_thread_from_url");
  });

  it("rotates threadId when switching user or tenant scope", () => {
    const initial = createNewThreadId();
    expect(syncThreadScope("user-1:tenant-1")).toBeNull();
    expect(getOrCreateThreadId()).toBe(initial);

    // Same scope keeps current thread.
    expect(syncThreadScope("user-1:tenant-1")).toBeNull();
    expect(getOrCreateThreadId()).toBe(initial);

    // Switching tenant generates a new isolated threadId.
    const rotated = syncThreadScope("user-1:tenant-2");
    expect(rotated).toMatch(/^logix_thread_/);
    expect(rotated).not.toBe(initial);
    expect(getOrCreateThreadId()).toBe(rotated);

    saveThreadId("logix_thread_manual");
    expect(getOrCreateThreadId()).toBe("logix_thread_manual");

    clearSessionAndThread();
    expect(localStorage.getItem("logix_chat_thread_id")).toBeNull();
  });
});
