import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import rootEn from "@/locales/en.json";
import rootVi from "@/locales/vi.json";
import runtimeEn from "@/lib/i18n/locales/en.json";
import runtimeVi from "@/lib/i18n/locales/vi.json";
import { resolveLocaleMessage } from "@/lib/i18n";

type Dictionary = Record<string, unknown>;

function flattenLeaves(value: unknown, prefix = ""): Map<string, string> {
  const result = new Map<string, string>();
  if (typeof value === "string") {
    result.set(prefix, value);
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      for (const [path, message] of flattenLeaves(
        child,
        prefix ? `${prefix}.${key}` : key
      )) {
        result.set(path, message);
      }
    }
  }
  return result;
}

describe("public landing page locales", () => {
  it("keeps root and runtime landing dictionaries aligned in VI and EN", () => {
    expect((rootVi as Dictionary).landing).toEqual(
      (runtimeVi as Dictionary).landing
    );
    expect((rootEn as Dictionary).landing).toEqual(
      (runtimeEn as Dictionary).landing
    );
  });

  it("maintains identical leaf key parity and non-empty strings in VI and EN", () => {
    const viLeaves = flattenLeaves((runtimeVi as Dictionary).landing, "landing");
    const enLeaves = flattenLeaves((runtimeEn as Dictionary).landing, "landing");

    expect([...viLeaves.keys()].sort()).toEqual([...enLeaves.keys()].sort());
    for (const [key, value] of viLeaves) {
      expect(value.trim().length, `${key} (vi)`).toBeGreaterThan(0);
    }
    for (const [key, value] of enLeaves) {
      expect(value.trim().length, `${key} (en)`).toBeGreaterThan(0);
    }
  });

  it("resolves every statically referenced landing translation key", () => {
    const componentsDir = resolve(
      process.cwd(),
      "src/app/(public)/_components"
    );
    const files = readdirSync(componentsDir).filter((f) => f.endsWith(".tsx"));
    const keys = files.flatMap((file) => {
      const content = readFileSync(resolve(componentsDir, file), "utf8");
      return [...content.matchAll(/"(landing\.[^"]+)"/g)].map((m) => m[1]);
    });

    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(resolveLocaleMessage("vi", key), key).not.toBe(key);
      expect(resolveLocaleMessage("en", key), key).not.toBe(key);
    }
  });
});

