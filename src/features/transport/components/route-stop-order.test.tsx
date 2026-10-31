import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RouteStopOrder } from "./route-stop-order";

let locale = "en";
vi.mock("@/lib/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/i18n")>();
  return {
    ...actual,
    useTranslation: () => ({
      locale,
      t: (key: string, params?: Record<string, string | number>) =>
        actual.resolveLocaleMessage(locale, key, params),
    }),
  };
});
const stops = [
  { id: "first", label: "Recipient <one>", address: "Shipping snapshot 1" },
  { id: "second", label: "Recipient two", address: "Shipping snapshot 2" },
];

describe("Route order controls", () => {
  it.each(["vi", "en"])("renders localized accessible order controls in %s", (language) => {
    locale = language;
    const html = renderToStaticMarkup(
      <RouteStopOrder stops={stops} disabled={false} onChange={vi.fn()} />
    );
    expect(html).toContain("Recipient &lt;one&gt;");
    expect(html).toContain("Shipping snapshot 1");
    expect(html).not.toContain("transport.route.");
    expect(html.match(/disabled=""/g)).toHaveLength(2);
    expect(html.match(/aria-label=/g)).toHaveLength(5);
  });

  it("locks every ordering control on read-only or pending trips", () => {
    const html = renderToStaticMarkup(
      <RouteStopOrder stops={stops} disabled onChange={vi.fn()} />
    );
    expect(html.match(/disabled=""/g)).toHaveLength(4);
  });
});
