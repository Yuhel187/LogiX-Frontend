import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, authFetch } from "@/lib/api";
import {
  assignTripApi,
  cancelTripApi,
  createTripApi,
  dispatchTripApi,
  getTripApi,
  getTripDispatchOperationApi,
  listEligibleShipmentsApi,
  listTripsApi,
  previewCancelTripApi,
  previewTripDispatchApi,
  replayCancelTripApi,
  updateTripApi,
} from "./trips.api";

vi.mock("@/lib/config", () => ({
  apiBaseUrl: "https://gateway.example/api/v1",
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, authFetch: vi.fn() };
});

const apiFetch = vi.mocked(authFetch);
const baseUrl = "https://gateway.example/api/v1/trips";
const tripId = "00000000-0000-4000-8000-000000000001";
const requestId = "00000000-0000-4000-8000-000000000002";
const planId = "00000000-0000-4000-8000-000000000003";
const instant = "2026-10-25T00:00:00.000Z";
const depotSnapshot = {
  id: tripId,
  code: "WH-1",
  name: "Depot",
  addressLine: "1 Main St",
  ward: null,
  district: null,
  province: "HCMC",
  postalCode: null,
  latitude: "10.1",
  longitude: "106.1",
  status: "ACTIVE",
  createdAt: instant,
  updatedAt: instant,
  version: 1,
};
const trip = {
  id: tripId,
  tripNumber: "TRP-0001",
  warehouseId: tripId,
  depotSnapshot,
  status: "DRAFT",
  plannedStartAt: instant,
  vehicleId: null,
  driverId: null,
  totalWeight: "0.000",
  totalVolume: "0.000000",
  version: 1,
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Transport API adapters", () => {
  beforeEach(() => apiFetch.mockReset());

  it("reads all supported lifecycle statuses without claiming a new mutation is available", async () => {
    for (const status of [
      "DRAFT", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELED",
    ] as const) {
      apiFetch.mockResolvedValueOnce(jsonResponse({
        items: [{ ...trip, status }], total: 1, page: 1, pageSize: 20,
      }));
      await expect(listTripsApi({ status })).resolves.toMatchObject({
        items: [{ status }],
      });
      expect(apiFetch).toHaveBeenLastCalledWith(
        expect.stringContaining(`status=${status}`),
        { method: "GET", signal: undefined }
      );
    }
    apiFetch.mockResolvedValueOnce(jsonResponse({
      items: [{ ...trip, status: "PLANNED" }], total: 1, page: 1, pageSize: 20,
    }));
    await expect(listTripsApi({})).rejects.toThrow();
  });

  it("passes an opaque signed preview unchanged into explicit cancellation", async () => {
    const preview = {
      previewToken: "signed.cancel.preview",
      tripId,
      expectedVersion: 1,
      expiresAt: instant,
      activeShipmentCount: 0,
      releaseCount: 0,
      blockers: [],
    };
    apiFetch.mockResolvedValueOnce(jsonResponse(preview));
    await expect(previewCancelTripApi(tripId, { expectedVersion: 1 }))
      .resolves.toEqual(preview);
    apiFetch.mockResolvedValueOnce(jsonResponse({
      tripId,
      requestId,
      kind: "CANCEL",
      status: "COMPLETED",
      version: 3,
      results: [],
    }));
    await cancelTripApi(tripId, {
      requestId,
      expectedVersion: 1,
      previewToken: preview.previewToken,
      confirmed: true,
      reason: "Weather",
    });

    expect(apiFetch).toHaveBeenLastCalledWith(`${baseUrl}/${tripId}/cancel`,
      expect.objectContaining({
        body: JSON.stringify({
          requestId,
          expectedVersion: 1,
          previewToken: preview.previewToken,
          confirmed: true,
          reason: "Weather",
        }),
        skipAuthRefresh: true,
      }));
  });

  it("parses the raw dispatch preview and submits the exact signed command", async () => {
    const preview = {
      tripId,
      version: 4,
      approvedPlanId: planId,
      inputHash: "a".repeat(64),
      dispatchVersion: 1,
      shipmentCount: 2,
      previewToken: "signed.dispatch.preview",
      expiresAt: instant,
    };
    apiFetch.mockResolvedValueOnce(jsonResponse(preview));
    await expect(previewTripDispatchApi(tripId, { version: 4 }))
      .resolves.toEqual(preview);
    expect(apiFetch).toHaveBeenLastCalledWith(
      `${baseUrl}/${tripId}/dispatch-preview`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ version: 4 }),
      })
    );

    const command = {
      requestId,
      version: preview.version,
      previewToken: preview.previewToken,
      confirmed: true as const,
    };
    const operation = {
      tripId,
      requestId,
      kind: "DISPATCH",
      status: "PENDING",
      stage: "RECEIPTED",
      payloadHash: "b".repeat(64),
      version: 5,
      result: null,
      error: null,
      nextRetryAt: instant,
      results: [],
    };
    apiFetch.mockResolvedValueOnce(jsonResponse(operation, 202));
    await expect(dispatchTripApi(tripId, command))
      .resolves.toMatchObject({ status: "PENDING", stage: "RECEIPTED" });
    expect(apiFetch).toHaveBeenLastCalledWith(
      `${baseUrl}/${tripId}/dispatch`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(command),
        skipAuthRefresh: true,
      })
    );
  });

  it("uses the recovery GET that actively advances the persisted dispatch operation", async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse({
      tripId,
      requestId,
      kind: "DISPATCH",
      status: "COMPLETED",
      stage: "COMPLETED",
      payloadHash: "c".repeat(64),
      version: 6,
      result: {
        tripId,
        status: "IN_PROGRESS",
        version: 6,
        dispatchVersion: 1,
        dispatchedAt: instant,
      },
      error: null,
      nextRetryAt: null,
      results: [],
    }));
    await expect(getTripDispatchOperationApi(tripId, requestId))
      .resolves.toMatchObject({ status: "COMPLETED", result: { status: "IN_PROGRESS" } });
    expect(apiFetch).toHaveBeenCalledWith(
      `${baseUrl}/${tripId}/operations/${requestId}`,
      { method: "GET", signal: undefined }
    );
  });

  it("reads latest state after an uncertain local edit without resubmitting it", async () => {
    const timeout = new DOMException("Timed out", "TimeoutError");
    apiFetch.mockRejectedValueOnce(timeout);
    await expect(updateTripApi(tripId, {
      requestId,
      expectedVersion: 1,
      plannedStartAt: instant,
    })).rejects.toBe(timeout);
    apiFetch.mockResolvedValueOnce(jsonResponse({
      ...trip, version: 2, shipments: [], stops: [],
    }));
    await expect(getTripApi(tripId)).resolves.toMatchObject({ version: 2 });
    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(apiFetch).toHaveBeenLastCalledWith(`${baseUrl}/${tripId}`, {
      method: "GET",
      signal: undefined,
    });
  });

  it("replays a saved legacy cancel body without treating it as a fresh preview", async () => {
    const saved = {
      requestId,
      expectedVersion: 1,
      previewId: tripId,
      confirmed: true as const,
      reason: "Weather",
    };
    apiFetch.mockResolvedValueOnce(jsonResponse({
      tripId, requestId, kind: "CANCEL", status: "COMPLETED", version: 3, results: [],
    }));
    await expect(replayCancelTripApi(tripId, saved))
      .resolves.toMatchObject({ status: "COMPLETED" });
    expect(apiFetch).toHaveBeenLastCalledWith(`${baseUrl}/${tripId}/cancel`,
      expect.objectContaining({ method: "POST", skipAuthRefresh: true }));
    const body = apiFetch.mock.calls[0]?.[1]?.body;
    if (typeof body !== "string") throw new Error("Expected a JSON request body.");
    expect(JSON.parse(body)).toEqual(saved);
    apiFetch.mockResolvedValueOnce(jsonResponse({
      statusCode: 422,
      error: "BUSINESS_RULE_VIOLATION",
      message: "Preview required",
      details: { rule: "CANCEL_PREVIEW_EXPIRED_OR_INVALID" },
      timestamp: instant,
    }, 422));
    await expect(replayCancelTripApi(tripId, saved))
      .rejects.toMatchObject({ status: 422, code: "BUSINESS_RULE_VIOLATION" });
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });

  it("serializes URL filters and validates a direct paginated response", async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse({ items: [trip], total: 1, page: 1, pageSize: 20 })
    );
    await expect(
      listTripsApi({
        warehouseId: tripId,
        status: "DRAFT",
        search: "TRP/1",
        page: 1,
        pageSize: 20,
      })
    ).resolves.toMatchObject({ total: 1, items: [trip] });
    expect(apiFetch).toHaveBeenCalledWith(
      `${baseUrl}?warehouseId=${tripId}&status=DRAFT&search=TRP%2F1&page=1&pageSize=20`,
      { method: "GET", signal: undefined }
    );
  });

  it("sends create fields with the persisted request ID and parses the direct trip", async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse(trip, 201));
    await expect(
      createTripApi({
        requestId,
        warehouseId: tripId,
        plannedStartAt: instant,
      })
    ).resolves.toMatchObject({ id: tripId, version: 1 });
    expect(apiFetch).toHaveBeenCalledWith(baseUrl, {
      method: "POST",
      body: JSON.stringify({
        requestId,
        warehouseId: tripId,
        plannedStartAt: instant,
      }),
      signal: expect.any(AbortSignal),
      skipAuthRefresh: true,
    });
  });

  it("uses the public eligible pool query without a search parameter", async () => {
    const page = {
      items: [
        {
          shipmentId: tripId,
          shipmentNumber: "SHP-0001",
          orderId: requestId,
          warehouseId: tripId,
          shipmentVersion: 3,
          orderVersion: 4,
          status: "READY_TO_SHIP",
          totalWeight: "1.200",
          totalVolume: "0.025000",
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    };
    apiFetch.mockResolvedValueOnce(jsonResponse(page));
    await expect(
      listEligibleShipmentsApi({
        warehouseId: tripId,
        page: 1,
        pageSize: 20,
      })
    ).resolves.toEqual(page);
    expect(apiFetch).toHaveBeenCalledWith(
      `${baseUrl}/eligible-shipments?warehouseId=${tripId}&page=1&pageSize=20`,
      { method: "GET", signal: undefined }
    );
  });

  it("sends a separate versioned assignment command to the accepted endpoint", async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse(trip));
    await assignTripApi(tripId, {
      requestId,
      expectedVersion: 7,
      vehicleId: tripId,
      driverId: null,
    });
    expect(apiFetch).toHaveBeenCalledWith(`${baseUrl}/${tripId}/assignment`, {
      method: "POST",
      body: JSON.stringify({
        requestId,
        expectedVersion: 7,
        vehicleId: tripId,
        driverId: null,
      }),
      signal: expect.any(AbortSignal),
      skipAuthRefresh: true,
    });
  });

  it("uses the expected version for cancellation preview and maps top-level error codes", async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          statusCode: 409,
          error: "CONCURRENCY_CONFLICT",
          message: "stale trip version",
          details: { currentVersion: 2 },
          correlationId: "corr-1",
          timestamp: instant,
        },
        409
      )
    );
    await expect(
      previewCancelTripApi(tripId, { expectedVersion: 1 })
    ).rejects.toMatchObject({
      code: "CONCURRENCY_CONFLICT",
      details: { currentVersion: 2 },
    } satisfies Partial<ApiError>);
    expect(apiFetch).toHaveBeenCalledWith(`${baseUrl}/${tripId}/cancel-preview`, {
      method: "POST",
      body: JSON.stringify({ expectedVersion: 1 }),
      signal: expect.any(AbortSignal),
      skipAuthRefresh: true,
    });
  });

  it("does not accept malformed or non-safe response versions", async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse({
        items: [{ ...trip, version: Number.MAX_SAFE_INTEGER + 1 }],
        total: 1,
        page: 1,
        pageSize: 20,
      })
    );
    await expect(
      listTripsApi({ page: 1, pageSize: 20 })
    ).rejects.toMatchObject({ name: "ZodError" });
  });
});
