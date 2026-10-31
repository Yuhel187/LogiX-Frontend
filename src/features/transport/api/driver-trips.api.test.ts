import { beforeEach, describe, expect, it, vi } from "vitest";
import { authFetch } from "@/lib/api";
import {
  deliverDriverTripStopApi,
  failDriverTripStopApi,
  getDriverTripApi,
  listDriverTripsApi,
  previewDriverTripActionApi,
} from "./driver-trips.api";

vi.mock("@/lib/config", () => ({
  apiBaseUrl: "https://gateway.example/api/v1",
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, authFetch: vi.fn() };
});

const apiFetch = vi.mocked(authFetch);
const baseUrl = "https://gateway.example/api/v1/driver/trips";
const tripId = "00000000-0000-4000-8000-000000000001";
const stopId = "00000000-0000-4000-8000-000000000002";
const shipmentId = "00000000-0000-4000-8000-000000000003";
const driverId = "00000000-0000-4000-8000-000000000004";
const userId = "00000000-0000-4000-8000-000000000005";
const requestId = "00000000-0000-4000-8000-000000000006";
const instant = "2026-10-25T00:00:00.000Z";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const detail = {
  tripId,
  tripNumber: "TRP-0001",
  status: "IN_PROGRESS",
  plannedStartAt: instant,
  actualStartAt: instant,
  completedAt: null,
  warehouseId: tripId,
  depotSnapshot: { name: "Central depot", code: "WH-1" },
  vehicleSnapshot: { plateNumber: "ABC-123" },
  driverSnapshot: { displayName: "Alex Driver" },
  approvedRoutePlanId: tripId,
  version: 3,
  nextStopId: stopId,
  stops: [
    {
      stopId,
      shipmentId,
      shipmentNumber: "SHP-1",
      approvedSequence: 1,
      status: "PENDING",
      version: 2,
      isNext: true,
      contact: {
        recipientName: "Taylor",
        phone: "+12025550123",
        addressLine: "1 Main St",
        ward: null,
        district: "Central",
        province: "Metro",
        postalCode: null,
        deliveryNote: null,
      },
    },
  ],
};

const receipt = {
  requestId,
  tripId,
  tripStopId: stopId,
  shipmentId,
  driverId,
  assigneeUserId: userId,
  actorUserId: userId,
  actorMode: "DRIVER",
  status: "DELIVERED",
  reason: null,
  actingReason: null,
  attempt: 1,
  occurredAt: instant,
  tripVersion: 4,
  stopVersion: 3,
};

describe("Driver trip API contract", () => {
  beforeEach(() => apiFetch.mockReset());

  it("loads current trips with tenant-scoped Super Admin filter parameters", async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse({ items: [], total: 0, page: 1, pageSize: 20 }),
    );
    await expect(
      listDriverTripsApi({
        scope: "current",
        driverId,
        page: 1,
        pageSize: 20,
      }),
    ).resolves.toMatchObject({ items: [], total: 0 });
    expect(apiFetch).toHaveBeenCalledWith(
      `${baseUrl}?scope=current&driverId=${driverId}&page=1&pageSize=20`,
      { method: "GET", signal: undefined },
    );
  });

  it("validates the detail snapshot and stop contract", async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse(detail));
    await expect(getDriverTripApi(tripId)).resolves.toMatchObject({
      tripId,
      nextStopId: stopId,
      stops: [{ shipmentNumber: "SHP-1", isNext: true }],
    });
    expect(apiFetch).toHaveBeenCalledWith(`${baseUrl}/${tripId}`, {
      method: "GET",
      signal: undefined,
    });

    apiFetch.mockResolvedValueOnce(
      jsonResponse({ ...detail, stops: [{ ...detail.stops[0], status: "ARRIVED" }] }),
    );
    await expect(getDriverTripApi(tripId)).rejects.toThrow();
  });

  it("gets a signed Super Admin action preview with exact current versions", async () => {
    const input = {
      action: "FAIL" as const,
      expectedTripVersion: 3,
      expectedStopVersion: 2,
      actingReason: "Covering assigned Driver",
      reason: "Recipient unavailable",
    };
    apiFetch.mockResolvedValueOnce(
      jsonResponse({
        tripId,
        stopId,
        action: "FAIL",
        statusBefore: "PENDING",
        statusAfter: "FAILED",
        expectedTripVersion: 3,
        expectedStopVersion: 2,
        assignedDriverId: driverId,
        actingReason: input.actingReason,
        reason: input.reason,
        previewToken: "signed.preview.token",
        expiresAt: instant,
      }),
    );
    await expect(
      previewDriverTripActionApi(tripId, stopId, input),
    ).resolves.toMatchObject({
      statusAfter: "FAILED",
      previewToken: "signed.preview.token",
    });
    expect(apiFetch).toHaveBeenCalledWith(
      `${baseUrl}/${tripId}/stops/${stopId}/action-preview`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(input),
        skipAuthRefresh: true,
      }),
    );
  });

  it.each([
    ["deliver", deliverDriverTripStopApi, "DELIVERED"],
    ["fail", failDriverTripStopApi, "FAILED"],
  ] as const)(
    "submits %s using the immutable receipt endpoint contract",
    async (action, submit, status) => {
      const input = {
        requestId,
        expectedTripVersion: 3,
        expectedStopVersion: 2,
        confirmed: true as const,
        ...(action === "fail" ? { reason: "Recipient unavailable" } : {}),
      };
      const expectedReceipt = { ...receipt, status };
      apiFetch.mockResolvedValueOnce(jsonResponse(expectedReceipt));
      await expect(submit(tripId, stopId, input)).resolves.toMatchObject({
        requestId,
        status,
      });
      expect(apiFetch).toHaveBeenCalledWith(
        `${baseUrl}/${tripId}/stops/${stopId}/${action}`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(input),
          skipAuthRefresh: true,
        }),
      );
    },
  );

  it("replays the exact saved command instead of changing versions or preview token", async () => {
    const input = {
      requestId,
      expectedTripVersion: 3,
      expectedStopVersion: 2,
      confirmed: true as const,
      previewToken: "original.expired.preview",
      actingReason: "Covering assigned Driver",
      reason: "Recipient unavailable",
    };
    apiFetch.mockRejectedValueOnce(new Error("Response lost"));
    apiFetch.mockRejectedValueOnce(new Error("Response lost"));
    await expect(
      failDriverTripStopApi(tripId, stopId, input),
    ).rejects.toThrow("Response lost");
    await expect(
      failDriverTripStopApi(tripId, stopId, input),
    ).rejects.toThrow("Response lost");
    expect(apiFetch.mock.calls[0]?.[1]?.body).toBe(
      apiFetch.mock.calls[1]?.[1]?.body,
    );
  });

  it("rejects malformed command input before making an HTTP request", async () => {
    await expect(
      deliverDriverTripStopApi(tripId, stopId, {
        requestId,
        expectedTripVersion: 0,
        expectedStopVersion: 2,
        confirmed: true,
      }),
    ).rejects.toThrow();
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
