import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import rootEn from "@/locales/en.json";
import rootVi from "@/locales/vi.json";
import runtimeEn from "@/lib/i18n/locales/en.json";
import runtimeVi from "@/lib/i18n/locales/vi.json";
import { resolveLocaleMessage } from "@/lib/i18n";

type Dictionary = Record<string, unknown>;

function flattenLeaves(
  value: unknown,
  prefix = ""
): Map<string, string> {
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

function placeholders(message: string): string[] {
  return [...message.matchAll(/\{([^{}]+)\}/g)]
    .map((match) => match[1])
    .sort();
}

function readDuplicates(source: string): string[] {
  const duplicates: string[] = [];
  let cursor = 0;
  const skipWhitespace = () => {
    while (/\s/.test(source[cursor] ?? "")) cursor += 1;
  };
  const readString = () => {
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
      if (keys.has(key) && (
        path === "$" && (key === "transport" || key === "routes") ||
        path.startsWith("$.transport") || path.startsWith("$.routes")
      )) {
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
    let item = 0;
    while (cursor < source.length) {
      parseValue(`${path}[${item++}]`);
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

function dictionaryFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Transport locale contract", () => {
  it("keeps the real routes entry copy translated and runtime-aligned", () => {
    expect(rootVi.routes).toEqual(runtimeVi.routes);
    expect(rootEn.routes).toEqual(runtimeEn.routes);
    const vi = flattenLeaves(rootVi.routes);
    const en = flattenLeaves(rootEn.routes);
    expect([...vi.keys()].sort()).toEqual([...en.keys()].sort());
    for (const [key, viMessage] of vi) {
      expect(placeholders(viMessage), key).toEqual(placeholders(en.get(key) ?? ""));
      expect(resolveLocaleMessage("vi", `routes.${key}`)).toBe(viMessage);
      expect(resolveLocaleMessage("en", `routes.${key}`)).toBe(en.get(key));
    }
    expect(Object.keys(rootVi.transport.status)).toEqual([
      "DRAFT", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELED",
    ]);
  });

  it("keeps all four Transport dictionaries duplicate-free and runtime-aligned", () => {
    const files = [
      "src/locales/vi.json",
      "src/locales/en.json",
      "src/lib/i18n/locales/vi.json",
      "src/lib/i18n/locales/en.json",
    ];
    for (const file of files) expect(readDuplicates(dictionaryFile(file))).toEqual([]);
    expect((rootVi as Dictionary).transport).toEqual(
      (runtimeVi as Dictionary).transport
    );
    expect((rootEn as Dictionary).transport).toEqual(
      (runtimeEn as Dictionary).transport
    );
  });

  it("keeps English and Vietnamese keys and interpolation placeholders in parity", () => {
    const vi = flattenLeaves((rootVi as Dictionary).transport);
    const en = flattenLeaves((rootEn as Dictionary).transport);
    expect([...vi.keys()].sort()).toEqual([...en.keys()].sort());
    for (const [key, viMessage] of vi) {
      expect(placeholders(viMessage), key).toEqual(
        placeholders(en.get(key) ?? "")
      );
    }
  });

  it("resolves every translated leaf through the installed runtime provider", () => {
    for (const [locale, dictionary] of [
      ["vi", runtimeVi],
      ["en", runtimeEn],
    ] as const) {
      for (const [path, expected] of flattenLeaves(dictionary.transport)) {
        const key = `transport.${path}`;
        expect(resolveLocaleMessage(locale, key), `${locale}:${key}`).toBe(
          expected
        );
      }
    }
    expect(
      resolveLocaleMessage("en", "transport.list.pageSummary", {
        page: 2,
        pages: 4,
        total: 30,
      })
    ).toBe("Page 2 of 4 · 30 trips");
    expect(
      resolveLocaleMessage("vi", "transport.missing.message")
    ).toBe("transport.missing.message");
  });
});
