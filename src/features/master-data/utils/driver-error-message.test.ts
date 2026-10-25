import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { resolveLocaleMessage } from "@/lib/i18n";
import { resolveDriverErrorMessage } from "./driver-error-message";

const translate = (key: string) => resolveLocaleMessage("en", key);

describe("Driver error localization", () => {
  it.each([
    [409, "CONCURRENCY_CONFLICT", "conflict"],
    [409, "CONFLICT", "conflict"],
    [409, "DRIVER_LINK_LOCKED", "linkLocked"],
    [400, "DRIVER_LINK_UNCHANGED", "differentUser"],
    [403, "CONTEXT_UNKNOWN", "contextChanged"],
    [502, "INVALID_RESPONSE", "previewMismatch"],
    [404, "NOT_FOUND", "notFound"],
    [502, "BAD_GATEWAY", "unavailable"],
    [503, "SERVICE_UNAVAILABLE", "unavailable"],
    [401, "UNAUTHORIZED", "unauthorized"],
    [403, "FORBIDDEN", "forbidden"],
    [400, undefined, "invalid"],
    [0, "NETWORK_ERROR", "generic"],
  ])(
    "maps status %s and code %s to localized %s copy",
    (status, code, message) => {
      const error = new ApiError(
        Number(status),
        "Raw backend message must not be displayed",
        typeof code === "string" ? code : undefined
      );
      const key = message === "differentUser"
        ? "masterData.driver.validation.differentUser"
        : `masterData.driver.errors.${String(message)}`;
      expect(resolveDriverErrorMessage(error, translate)).toBe(translate(key));
      expect(resolveDriverErrorMessage(error, translate)).not.toContain(
        "Raw backend"
      );
    }
  );
});

it("treats connection loss and server failure as unconfirmed mutations", () => {
  const connectionLost = new TypeError("private transport detail");
  const serverFailure = new ApiError(503, "private service message");
  for (const error of [connectionLost, serverFailure]) {
    expect(resolveDriverErrorMessage(error, translate, "mutation")).toBe(
      translate("masterData.driver.errors.unknownOutcome")
    );
  }
  expect(resolveDriverErrorMessage(serverFailure, translate)).toBe(
    translate("masterData.driver.errors.unavailable")
  );
});
