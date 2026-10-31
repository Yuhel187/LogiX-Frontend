import { describe, expect, it } from "vitest";
import { parseTripListQuery } from "./trip-list-query";

const warehouseId = "00000000-0000-4000-8000-000000000001";

describe("trip list URL state", () => {
  it("maps supported filters and pagination to the backend query", () => {
    const state = parseTripListQuery(
      new URLSearchParams({
        warehouseId,
        status: "DRAFT",
        plannedStartFrom: "2026-10-25",
        plannedStartTo: "2026-10-26",
        search: " TRP-1 ",
        page: "3",
      })
    );
    expect(state.invalid).toBe(false);
    expect(state.params).toEqual({
      warehouseId,
      status: "DRAFT",
      plannedStartFrom: new Date("2026-10-25T00:00:00").toISOString(),
      plannedStartTo: new Date("2026-10-26T23:59:59.999").toISOString(),
      search: "TRP-1",
      page: 3,
      pageSize: 20,
      vehicleId: undefined,
      driverId: undefined,
    });
  });

  it("rejects duplicate, invalid, and inverted URL filters without broadening them", () => {
    const repeated = new URLSearchParams();
    repeated.append("warehouseId", warehouseId);
    repeated.append("warehouseId", "00000000-0000-4000-8000-000000000002");
    const state = parseTripListQuery(repeated);
    expect(state.invalid).toBe(true);
    expect(state.params.warehouseId).toBeUndefined();

    const inverted = parseTripListQuery(
      new URLSearchParams({
        plannedStartFrom: "2026-10-27",
        plannedStartTo: "2026-10-26",
      })
    );
    expect(inverted.invalid).toBe(true);
    expect(inverted.page).toBe(1);
  });

  it("does not accept unknown trip states or invalid page sizes", () => {
    const state = parseTripListQuery(
      new URLSearchParams({ status: "PLANNED", page: "999999999999" })
    );
    expect(state.invalid).toBe(true);
    expect(state.status).toBe("");
    expect(state.page).toBe(1);
    expect(state.params.pageSize).toBe(20);
  });

  it("filters all supported lifecycle states without introducing a planning step", () => {
    for (const status of [
      "DRAFT", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELED",
    ]) {
      const state = parseTripListQuery(new URLSearchParams({ status }));
      expect(state.invalid).toBe(false);
      expect(state.params.status).toBe(status);
    }
  });
});
