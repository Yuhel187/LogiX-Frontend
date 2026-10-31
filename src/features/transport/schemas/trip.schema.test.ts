import { describe, expect, it } from "vitest";
import {
  addressSnapshotSchema,
  addShipmentsSchema,
  cancelPreviewSchema,
  cancelTripSchema,
  cancelTripReplaySchema,
  depotSnapshotSchema,
  removeShipmentsSchema,
  shipmentSnapshotSchema,
  tripDetailSchema,
  tripPageSchema,
  tripStopSchema,
  tripStatusSchema,
  tripSummarySchema,
} from "./trip.schema";

const id = (value: string) => `00000000-0000-4000-8000-${value.padStart(12, "0")}`;
const instant = "2026-10-25T00:00:00.000Z";
const depotSnapshot = {
  id: id("1"),
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
  version: 2,
};
const addressSnapshot = {
  addressId: id("2"),
  addressVersion: 3,
  addressType: "SHIPPING",
  label: "Home",
  recipientName: "Recipient",
  phone: null,
  addressLine: "2 Second St",
  ward: null,
  district: null,
  province: "HCMC",
  postalCode: null,
  latitude: "10.2",
  longitude: "106.2",
  deliveryNote: null,
};
const shipmentSnapshot = {
  tenantId: id("3"),
  shipmentId: id("4"),
  shipmentNumber: "SHP-0001",
  orderId: id("5"),
  warehouseId: id("1"),
  deliveryAddressSnapshot: addressSnapshot,
  shipmentVersion: 4,
  orderVersion: 8,
  totalWeight: "2.500",
  totalVolume: "0.125000",
  items: [{ productNameSnapshot: "Box", quantity: "1.000" }],
};
const trip = {
  id: id("6"),
  tripNumber: "TRP-0001",
  warehouseId: id("1"),
  depotSnapshot,
  status: "DRAFT",
  plannedStartAt: instant,
  vehicleId: null,
  driverId: null,
  totalWeight: "2.500",
  totalVolume: "0.125000",
  version: 5,
};
const stop = {
  id: id("7"),
  tenantId: id("3"),
  tripId: id("6"),
  shipmentId: id("4"),
  deliveryAddressId: id("2"),
  addressSnapshot,
  latitude: "10.2",
  longitude: "106.2",
  weight: "2.500",
  volume: "0.125000",
  plannedSequence: 1,
  approvedSequence: null,
  status: "PENDING",
  currentAttempt: 0,
  arrivedAt: null,
  completedAt: null,
  createdAt: instant,
  updatedAt: instant,
  version: 1,
  deletedAt: null,
};

describe("Transport draft trip contracts", () => {
  it("reads the simplified trip lifecycle without accepting removed states", () => {
    for (const status of [
      "DRAFT", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELED",
    ]) {
      expect(tripStatusSchema.parse(status)).toBe(status);
      expect(tripSummarySchema.parse({ ...trip, status }).status).toBe(status);
    }
    for (const status of ["PLANNED", "DISPATCHING", "UNKNOWN"]) {
      expect(tripStatusSchema.safeParse(status).success).toBe(false);
    }
  });

  it("reads terminal stops and preserves legacy arrival evidence without an ARRIVED state", () => {
    for (const status of ["PENDING", "DELIVERED", "FAILED"]) {
      expect(tripStopSchema.parse({
        ...stop, status, arrivedAt: instant,
      })).toMatchObject({ status, arrivedAt: instant });
    }
    expect(tripStopSchema.safeParse({ ...stop, status: "ARRIVED" }).success)
      .toBe(false);
  });

  it("validates direct paginated trip responses and immutable depot snapshots", () => {
    expect(depotSnapshotSchema.parse(depotSnapshot)).toEqual(depotSnapshot);
    expect(
      tripPageSchema.parse({
        items: [trip],
        page: 1,
        pageSize: 20,
        total: 1,
      }).items[0]
    ).toMatchObject(trip);
    expect(
      tripSummarySchema.safeParse({
        ...trip,
        version: Number.MAX_SAFE_INTEGER + 1,
      }).success
    ).toBe(false);
    expect(
      depotSnapshotSchema.safeParse({
        ...depotSnapshot,
        latitude: 10.1,
      }).success
    ).toBe(false);
  });

  it("preserves address and shipment snapshots with decimal-string quantities", () => {
    const membership = {
      id: id("8"),
      tripId: id("6"),
      shipmentId: id("4"),
      warehouseId: id("1"),
      orderId: id("5"),
      shipmentVersion: 4,
      orderVersion: 8,
      state: "ACTIVE",
      weight: "2.500",
      volume: "0.125000",
      assignedAt: instant,
      removedAt: null,
      claimReceipt: { receiptId: "claim-1" },
      releaseReceipt: null,
      shipmentSnapshot,
    };
    expect(shipmentSnapshotSchema.parse(shipmentSnapshot)).toEqual(
      shipmentSnapshot
    );
    expect(tripStopSchema.parse(stop)).toEqual(stop);
    expect(
      tripDetailSchema
        .parse({ ...trip, shipments: [membership], stops: [stop] })
        .shipments[0]
    ).toEqual(membership);
    expect(
      tripStopSchema.safeParse({ ...stop, weight: 2.5 }).success
    ).toBe(false);
    expect(
      tripStopSchema.safeParse({ ...stop, plannedSequence: 0 }).success
    ).toBe(false);
    expect(
      tripStopSchema.safeParse({
        ...stop,
        latitude: null,
        longitude: "106.2",
      }).success
    ).toBe(false);
    expect(
      addressSnapshotSchema.safeParse({
        ...addressSnapshot,
        latitude: null,
        longitude: "106.2",
      }).success
    ).toBe(false);
    expect(
      addressSnapshotSchema.safeParse({
        ...addressSnapshot,
        latitude: "91",
        longitude: "106.2",
      }).success
    ).toBe(false);
    expect(
      tripStopSchema.safeParse({ ...stop, weight: null, volume: null })
        .success
    ).toBe(true);
    expect(
      tripDetailSchema.parse({
        ...trip,
        shipments: [
          {
            ...membership,
            orderId: null,
            shipmentVersion: null,
            orderVersion: null,
            state: "CLAIM_PENDING",
            claimReceipt: null,
            shipmentSnapshot: null,
          },
        ],
        stops: [{ ...stop, latitude: null, longitude: null }],
      }).shipments[0]
    ).toMatchObject({
      orderId: null,
      shipmentVersion: null,
      orderVersion: null,
      state: "CLAIM_PENDING",
    });
  });

  it("validates frozen assignment display labels without replacing them from live Master Data", () => {
    const detail = {
      ...trip, shipments: [], stops: [],
      vehicleSnapshot: { code: "VEH-01", licensePlate: "51C-12345" },
      driverSnapshot: { code: "DRV-01", displayName: "Stored Driver" },
    };
    expect(tripDetailSchema.parse(detail)).toMatchObject({
      vehicleSnapshot: detail.vehicleSnapshot,
      driverSnapshot: detail.driverSnapshot,
    });
    expect(tripDetailSchema.safeParse({
      ...detail, driverSnapshot: { code: "DRV-01", displayName: 42 },
    }).success).toBe(false);
  });

  it("requires unique expected-versioned selections and explicit cancel confirmation", () => {
    const addInput = {
      requestId: id("9"),
      expectedTripVersion: 5,
      shipments: [
        { shipmentId: id("4"), expectedShipmentVersion: 4 },
        { shipmentId: id("10"), expectedShipmentVersion: 6 },
      ],
    };
    expect(addShipmentsSchema.parse(addInput)).toEqual(addInput);
    expect(
      addShipmentsSchema.safeParse({
        ...addInput,
        shipments: [addInput.shipments[0], addInput.shipments[0]],
      }).success
    ).toBe(false);

    const removeInput = {
      requestId: id("11"),
      expectedTripVersion: 5,
      shipmentIds: [id("4")],
    };
    expect(removeShipmentsSchema.parse(removeInput)).toEqual(removeInput);
    expect(
      removeShipmentsSchema.safeParse({
        ...removeInput,
        shipmentIds: [id("4"), id("4")],
      }).success
    ).toBe(false);

    const cancelInput = {
      requestId: id("12"),
      expectedVersion: 5,
      previewToken: "signed.cancel.preview",
      confirmed: true,
      reason: "  Road closed  ",
    };
    expect(cancelTripSchema.parse(cancelInput).reason).toBe("Road closed");
    expect(cancelTripSchema.safeParse({
      ...cancelInput,
      previewToken: "",
    }).success).toBe(false);
    const legacyReplay = {
      requestId: id("12"),
      expectedVersion: 5,
      previewId: id("13"),
      confirmed: true,
      reason: "Road closed",
    };
    expect(cancelTripSchema.safeParse(legacyReplay).success).toBe(false);
    expect(cancelTripReplaySchema.parse(legacyReplay)).toEqual(legacyReplay);
    expect(cancelTripReplaySchema.safeParse({
      ...legacyReplay, previewToken: "signed.cancel.preview",
    }).success).toBe(false);
    expect(cancelTripSchema.safeParse({
      ...cancelInput,
      previewToken: undefined,
      previewId: id("13"),
    }).success).toBe(false);
    expect(
      cancelTripSchema.safeParse({ ...cancelInput, confirmed: false }).success
    ).toBe(false);
    expect(
      cancelTripSchema.safeParse({ ...cancelInput, reason: " " }).success
    ).toBe(false);
  });

  it("validates the signed cancel preview binding and expiry without decoding authority", () => {
    const preview = {
      previewToken: "signed.cancel.preview",
      tripId: id("6"),
      expectedVersion: 5,
      expiresAt: instant,
      activeShipmentCount: 2,
      releaseCount: 2,
      blockers: [],
    };
    expect(cancelPreviewSchema.parse(preview)).toEqual(preview);
    expect(
      cancelPreviewSchema.safeParse({
        ...preview,
        expectedVersion: Number.MAX_SAFE_INTEGER + 1,
      }).success
    ).toBe(false);
    expect(
      cancelPreviewSchema.safeParse({
        ...preview,
        releaseCount: -1,
      }).success
    ).toBe(false);
  });
});
