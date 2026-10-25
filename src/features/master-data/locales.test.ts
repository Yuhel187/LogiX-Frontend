import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import rootEn from "@/locales/en.json";
import rootVi from "@/locales/vi.json";
import runtimeEn from "@/lib/i18n/locales/en.json";
import runtimeVi from "@/lib/i18n/locales/vi.json";
import { resolveLocaleMessage } from "@/lib/i18n";

type Dictionary = Record<string, unknown>;

function readLocale(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function duplicateDriverKeys(source: string): string[] {
  const duplicates: string[] = [];
  let index = 0;

  const skipWhitespace = () => {
    while (/\s/.test(source[index] ?? "")) index += 1;
  };

  const readString = (): string => {
    const start = index;
    index += 1;
    while (index < source.length) {
      if (source[index] === "\\") {
        index += 2;
      } else if (source[index] === '"') {
        index += 1;
        return JSON.parse(source.slice(start, index)) as string;
      } else {
        index += 1;
      }
    }
    throw new Error("Unterminated JSON string");
  };

  const parseObject = (path: string): void => {
    index += 1;
    skipWhitespace();
    const keys = new Set<string>();
    if (source[index] === "}") {
      index += 1;
      return;
    }

    while (index < source.length) {
      skipWhitespace();
      const key = readString();
      if (keys.has(key)) {
        const keyPath = `${path}.${key}`;
        if (
          (path === "$.masterData" && key === "driver") ||
          path === "$.masterData.driver" ||
          path.startsWith("$.masterData.driver.")
        ) {
          duplicates.push(keyPath);
        }
      }
      keys.add(key);
      skipWhitespace();
      if (source[index] !== ":") throw new Error("Invalid JSON object");
      index += 1;
      parseValue(`${path}.${key}`);
      skipWhitespace();
      if (source[index] === "}") {
        index += 1;
        return;
      }
      if (source[index] !== ",") throw new Error("Invalid JSON object");
      index += 1;
    }
  };

  const parseArray = (path: string): void => {
    index += 1;
    skipWhitespace();
    let item = 0;
    if (source[index] === "]") {
      index += 1;
      return;
    }
    while (index < source.length) {
      parseValue(`${path}[${item}]`);
      item += 1;
      skipWhitespace();
      if (source[index] === "]") {
        index += 1;
        return;
      }
      if (source[index] !== ",") throw new Error("Invalid JSON array");
      index += 1;
    }
  };

  function parseValue(path: string): void {
    skipWhitespace();
    if (source[index] === "{") {
      parseObject(path);
      return;
    }
    if (source[index] === "[") {
      parseArray(path);
      return;
    }
    if (source[index] === '"') {
      readString();
      return;
    }
    while (
      index < source.length &&
      !/[\s,}\]]/.test(source[index] ?? "")
    ) {
      index += 1;
    }
  }

  parseValue("$");
  return duplicates;
}

function placeholders(value: unknown, path = ""): Map<string, string[]> {
  const found = new Map<string, string[]>();
  if (typeof value === "string") {
    found.set(
      path,
      [...value.matchAll(/\{([^{}]+)\}/g)]
        .map((match) => match[1])
        .sort()
    );
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      for (const [childPath, names] of placeholders(
        child,
        path ? `${path}.${key}` : key
      )) {
        found.set(childPath, names);
      }
    }
  }
  return found;
}

function expectPlaceholderParity(left: unknown, right: unknown) {
  expect([...placeholders(left).entries()]).toEqual([
    ...placeholders(right).entries(),
  ]);
}

describe("Driver locale contract", () => {
  it("keeps VI/EN source dictionaries and runtime dictionaries aligned", () => {
    expect(
      ((rootVi as Dictionary).masterData as Dictionary).driver
    ).toEqual(((runtimeVi as Dictionary).masterData as Dictionary).driver);
    expect(
      ((rootEn as Dictionary).masterData as Dictionary).driver
    ).toEqual(((runtimeEn as Dictionary).masterData as Dictionary).driver);
  });

  it("rejects duplicate keys in the changed namespace across all four dictionaries", () => {
    const files = [
      "src/locales/vi.json",
      "src/locales/en.json",
      "src/lib/i18n/locales/vi.json",
      "src/lib/i18n/locales/en.json",
    ];
    for (const file of files) {
      expect(duplicateDriverKeys(readLocale(file)), file).toEqual([]);
    }
  });

  it("keeps interpolation placeholders identical between VI and EN", () => {
    const vi = ((rootVi as Dictionary).masterData as Dictionary).driver;
    const en = ((rootEn as Dictionary).masterData as Dictionary).driver;
    expectPlaceholderParity(vi, en);
    expectPlaceholderParity(
      ((runtimeVi as Dictionary).masterData as Dictionary).driver,
      ((runtimeEn as Dictionary).masterData as Dictionary).driver
    );
  });

  it("resolves changed keys through the actual runtime locale provider", () => {
    expect(resolveLocaleMessage("en", "masterData.driver.title")).toBe("Drivers");
    expect(resolveLocaleMessage("vi", "masterData.driver.title")).toBe("Tài xế");
    expect(
      resolveLocaleMessage("en", "masterData.driver.validation.codeRequired")
    ).toBe("Driver code is required.");
    expect(
      resolveLocaleMessage("en", "masterData.driver.missingKey")
    ).toBe("masterData.driver.missingKey");
    expect(
      resolveLocaleMessage("en", "masterData.pageOf", {
        page: 2,
        lastPage: 5,
        total: 42,
      })
    ).toBe("Page 2 of 5 — 42 records");
  });

  it("resolves every statically referenced driver key in both languages", () => {
    const files = [
      "src/features/master-data/components/drivers/drivers-screen.tsx",
      "src/features/master-data/components/drivers/driver-form-dialog.tsx",
      "src/features/master-data/components/drivers/driver-user-picker.tsx",
      "src/features/master-data/components/drivers/driver-relink-dialog.tsx",
      "src/features/master-data/schemas/driver.schema.ts",
      "src/features/master-data/utils/driver-error-message.ts",
    ];
    const keys = files.flatMap((file) =>
      [...readLocale(file).matchAll(/"(masterData\.driver\.[^"]+)"/g)].map(
        (match) => match[1]
      )
    );
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(resolveLocaleMessage("vi", key), key).not.toBe(key);
      expect(resolveLocaleMessage("en", key), key).not.toBe(key);
    }
  });

  it("resolves every relink/error/validation leaf through the runtime provider", () => {
    const driver = rootEn.masterData.driver;
    for (const section of ["relink", "errors", "validation"] as const) {
      for (const key of Object.keys(driver[section])) {
        const path = `masterData.driver.${section}.${key}`;
        expect(resolveLocaleMessage("en", path), path).not.toBe(path);
        expect(resolveLocaleMessage("vi", path), path).not.toBe(path);
      }
    }
  });

  it("uses the checked runtime dictionaries rather than an untracked locale source", () => {
    const provider = readLocale("src/lib/i18n/index.tsx");
    expect(provider).toContain('from "./locales/vi.json"');
    expect(provider).toContain('from "./locales/en.json"');
    expect(
      (
        JSON.parse(readLocale("src/lib/i18n/locales/en.json")) as Dictionary
      ).masterData
    ).toEqual((runtimeEn as Dictionary).masterData);
  });
});
