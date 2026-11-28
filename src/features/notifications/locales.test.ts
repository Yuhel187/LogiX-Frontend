import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
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
        prefix ? `${prefix}.${key}` : key,
      )) {
        result.set(path, message);
      }
    }
  }
  return result;
}

function placeholders(message: string): string[] {
  return [...message.matchAll(/\{([^{}]+)\}/g)]
    .map((match) => match[1])
    .sort();
}

function findDuplicateKeys(source: string): string[] {
  const duplicates: string[] = [];
  let cursor = 0;
  const skipWhitespace = () => {
    while (/\s/.test(source[cursor] ?? "")) cursor += 1;
  };
  const readString = (): string => {
    const start = cursor++;
    while (cursor < source.length) {
      if (source[cursor] === "\\") cursor += 2;
      else if (source[cursor] === '"') {
        cursor += 1;
        return JSON.parse(source.slice(start, cursor)) as string;
      } else cursor += 1;
    }
    throw new Error("Unterminated JSON string");
  };
  const parseObject = (path: string) => {
    cursor += 1;
    skipWhitespace();
    const keys = new Set<string>();
    if (source[cursor] === "}") {
      cursor += 1;
      return;
    }
    while (cursor < source.length) {
      skipWhitespace();
      const key = readString();
      if (
        keys.has(key) &&
        ((path === "$" && (key === "notifications" || key === "iam")) ||
          path.startsWith("$.notifications") ||
          path.startsWith("$.iam"))
      ) {
        duplicates.push(`${path}.${key}`);
      }
      keys.add(key);
      skipWhitespace();
      if (source[cursor++] !== ":") throw new Error("Invalid JSON object");
      parseValue(`${path}.${key}`);
      skipWhitespace();
      if (source[cursor] === "}") {
        cursor += 1;
        return;
      }
      if (source[cursor++] !== ",") throw new Error("Invalid JSON object");
    }
  };
  const parseArray = (path: string) => {
    cursor += 1;
    skipWhitespace();
    if (source[cursor] === "]") {
      cursor += 1;
      return;
    }
    let idx = 0;
    while (cursor < source.length) {
      parseValue(`${path}[${idx++}]`);
      skipWhitespace();
      if (source[cursor] === "]") {
        cursor += 1;
        return;
      }
      if (source[cursor++] !== ",") throw new Error("Invalid JSON array");
    }
  };
  function parseValue(path: string): void {
    skipWhitespace();
    if (source[cursor] === "{") return parseObject(path);
    if (source[cursor] === "[") return parseArray(path);
    if (source[cursor] === '"') {
      readString();
      return;
    }
    while (cursor < source.length && !/[\s,}\]]/.test(source[cursor] ?? "")) {
      cursor += 1;
    }
  }
  parseValue("$");
  return duplicates;
}

function collectTsxFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectTsxFiles(full));
    } else if (full.endsWith(".tsx")) {
      results.push(full);
    }
  }
  return results;
}

describe("Notifications & Broadcast locale contract", () => {
  it("keeps root and runtime notifications + IAM permission dictionaries aligned in VI and EN", () => {
    expect(rootVi.notifications).toEqual(runtimeVi.notifications);
    expect(rootEn.notifications).toEqual(runtimeEn.notifications);

    expect(rootVi.iam.modules).toEqual(runtimeVi.iam.modules);
    expect(rootEn.iam.modules).toEqual(runtimeEn.iam.modules);
    expect(rootVi.iam.resources).toEqual(runtimeVi.iam.resources);
    expect(rootEn.iam.resources).toEqual(runtimeEn.iam.resources);
    expect(rootVi.iam.matrix.actions).toEqual(runtimeVi.iam.matrix.actions);
    expect(rootEn.iam.matrix.actions).toEqual(runtimeEn.iam.matrix.actions);

    for (const locale of ["vi", "en"] as const) {
      expect(resolveLocaleMessage(locale, "iam.modules.NOTIFICATION")).not.toBe(
        "iam.modules.NOTIFICATION",
      );
      expect(resolveLocaleMessage(locale, "iam.resources.broadcast")).not.toBe(
        "iam.resources.broadcast",
      );
      expect(resolveLocaleMessage(locale, "iam.matrix.actions.send")).not.toBe(
        "iam.matrix.actions.send",
      );
    }
  });

  it("keeps all four dictionaries duplicate-free for notifications and iam", () => {
    const files = [
      "src/locales/vi.json",
      "src/locales/en.json",
      "src/lib/i18n/locales/vi.json",
      "src/lib/i18n/locales/en.json",
    ];
    for (const file of files) {
      const content = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(findDuplicateKeys(content), file).toEqual([]);
    }
  });

  it("keeps notifications leaf keys, non-empty values, and placeholders identical between VI and EN", () => {
    const viLeaves = flattenLeaves((runtimeVi as Dictionary).notifications);
    const enLeaves = flattenLeaves((runtimeEn as Dictionary).notifications);

    expect([...viLeaves.keys()].sort()).toEqual([...enLeaves.keys()].sort());
    for (const [key, viValue] of viLeaves) {
      expect(viValue.trim().length, `vi:notifications.${key}`).toBeGreaterThan(0);
      const enValue = enLeaves.get(key) ?? "";
      expect(enValue.trim().length, `en:notifications.${key}`).toBeGreaterThan(0);
      expect(placeholders(viValue), key).toEqual(placeholders(enValue));
      expect(resolveLocaleMessage("vi", `notifications.${key}`)).toBe(viValue);
      expect(resolveLocaleMessage("en", `notifications.${key}`)).toBe(enValue);
    }
  });

  it("resolves every statically referenced notifications.* key across UI components and page", () => {
    const tsxFiles = [
      ...collectTsxFiles(resolve(process.cwd(), "src/features/notifications")),
      resolve(process.cwd(), "src/app/(workspace)/broadcasts/page.tsx"),
    ];
    const keys = tsxFiles.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return [...source.matchAll(/"(notifications\.[^"${}]+)"/g)].map(
        (match) => match[1],
      );
    });

    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(resolveLocaleMessage("vi", key), `vi:${key}`).not.toBe(key);
      expect(resolveLocaleMessage("en", key), `en:${key}`).not.toBe(key);
    }
  });
});
