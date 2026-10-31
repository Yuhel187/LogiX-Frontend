import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { tripError, tripOutcomeUnknown } from "./trip-errors";

const translate = (key: string) => key;

describe("Transport error mapping", () => {
  it("maps top-level platform error codes to localized keys", () => {
    expect(
      tripError(new ApiError(409, "backend wording", "CONCURRENCY_CONFLICT"), translate)
    ).toBe("transport.errors.CONCURRENCY_CONFLICT");
    expect(
      tripError(new ApiError(423, "backend wording", "DRIVER_LINK_LOCKED"), translate)
    ).toBe("transport.errors.DRIVER_LINK_LOCKED");
    const definiteRejection = new ApiError(
      409,
      "backend wording",
      "BUSINESS_RULE_VIOLATION"
    );
    expect(tripError(definiteRejection, translate)).toBe(
      "transport.errors.BUSINESS_RULE_VIOLATION"
    );
    expect(tripOutcomeUnknown(definiteRejection)).toBe(false);
  });

  it("keeps authorization, validation, and not-found errors distinct", () => {
    expect(tripError(new ApiError(401, "unauthorized"), translate)).toBe(
      "transport.errors.unauthorized"
    );
    expect(tripError(new ApiError(403, "forbidden"), translate)).toBe(
      "transport.errors.forbidden"
    );
    expect(tripError(new ApiError(400, "invalid"), translate)).toBe(
      "transport.errors.invalidRequest"
    );
    expect(
      tripError(new ApiError(404, "missing", "ENTITY_NOT_FOUND"), translate)
    ).toBe("transport.errors.ENTITY_NOT_FOUND");
  });

  it("does not treat network/server failures as proof of mutation failure", () => {
    expect(tripOutcomeUnknown(new ApiError(0, "offline"))).toBe(true);
    expect(tripOutcomeUnknown(new ApiError(503, "unavailable"))).toBe(true);
    expect(tripOutcomeUnknown(new ApiError(409, "conflict"))).toBe(false);
    expect(tripError(new ApiError(0, "offline"), translate)).toBe(
      "transport.errors.unknownOutcome"
    );
  });
});
