import { z } from "zod";

const uuid = z.uuid();
const version = z.number().int().positive().safe();
const nullableCoordinate = z
  .string()
  .regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/)
  .nullable();
const decimal = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/);
const timestamp = z.string().min(1);

export const TRIP_STATUSES = [
  "DRAFT", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELED",
] as const;
export const tripStatusSchema = z.enum(TRIP_STATUSES);
export type TripStatus = z.infer<typeof tripStatusSchema>;

export const depotSnapshotSchema = z
  .object({
    id: uuid,
    code: z.string(),
    name: z.string(),
    addressLine: z.string(),
    ward: z.string().nullable(),
    district: z.string().nullable(),
    province: z.string(),
    postalCode: z.string().nullable(),
    latitude: nullableCoordinate,
    longitude: nullableCoordinate,
    status: z.enum(["ACTIVE", "INACTIVE"]),
    createdAt: timestamp,
    updatedAt: timestamp,
    version,
  })
  .strict();
export type DepotSnapshot = z.infer<typeof depotSnapshotSchema>;

export const tripSummarySchema = z
  .object({
    id: uuid,
    tripNumber: z.string(),
    warehouseId: uuid,
    depotSnapshot: depotSnapshotSchema,
    status: tripStatusSchema,
    plannedStartAt: timestamp,
    vehicleId: uuid.nullable(),
    driverId: uuid.nullable(),
    totalWeight: decimal,
    totalVolume: decimal,
    version,
  })
  .passthrough();
export type TripSummary = z.infer<typeof tripSummarySchema>;

export const tripPageSchema = z.object({
  items: z.array(tripSummarySchema),
  total: z.number().int().nonnegative(),
  page: version,
  pageSize: version,
});
export type TripPage = z.infer<typeof tripPageSchema>;

export const addressSnapshotSchema = z
  .object({
    addressId: uuid,
    addressVersion: version,
    addressType: z.literal("SHIPPING"),
    label: z.string().nullable(),
    recipientName: z.string(),
    phone: z.string().nullable(),
    addressLine: z.string(),
    ward: z.string().nullable(),
    district: z.string().nullable(),
    province: z.string(),
    postalCode: z.string().nullable(),
    latitude: nullableCoordinate,
    longitude: nullableCoordinate,
    deliveryNote: z.string().nullable(),
  })
  .strict()
  .refine(
    ({ latitude, longitude }) =>
      (latitude === null && longitude === null) ||
      (latitude !== null &&
        longitude !== null &&
        Math.abs(Number(latitude)) <= 90 &&
        Math.abs(Number(longitude)) <= 180),
    { message: "Address coordinates must be a valid pair." }
  );

export const shipmentSnapshotSchema = z
  .object({
    tenantId: uuid,
    shipmentId: uuid,
    shipmentNumber: z.string().min(1),
    orderId: uuid,
    warehouseId: uuid,
    deliveryAddressSnapshot: addressSnapshotSchema,
    shipmentVersion: version,
    orderVersion: version,
    totalWeight: decimal,
    totalVolume: decimal,
    items: z.array(z.object({}).passthrough()),
  })
  .passthrough();

export const tripStopSchema = z
  .object({
    id: uuid,
    tenantId: uuid,
    tripId: uuid,
    shipmentId: uuid,
    deliveryAddressId: uuid,
    addressSnapshot: addressSnapshotSchema,
    latitude: nullableCoordinate,
    longitude: nullableCoordinate,
    weight: decimal.nullable(),
    volume: decimal.nullable(),
    plannedSequence: z.number().int().positive(),
    approvedSequence: z.number().int().positive().nullable(),
    status: z.enum(["PENDING", "DELIVERED", "FAILED"]),
    currentAttempt: z.number().int().nonnegative().safe(),
    arrivedAt: timestamp.nullable(),
    completedAt: timestamp.nullable(),
    createdAt: timestamp,
    updatedAt: timestamp,
    version,
    deletedAt: timestamp.nullable(),
  })
  .strict()
  .refine(
    ({ latitude, longitude }) =>
      (latitude === null && longitude === null) ||
      (latitude !== null &&
        longitude !== null &&
        Math.abs(Number(latitude)) <= 90 &&
        Math.abs(Number(longitude)) <= 180),
    { message: "Stop coordinates must be a valid pair." }
  );
export type TripStop = z.infer<typeof tripStopSchema>;

export const shipmentMembershipSchema = z
  .object({
    id: uuid,
    tripId: uuid,
    shipmentId: uuid,
    warehouseId: uuid,
    orderId: uuid.nullable(),
    shipmentVersion: version.nullable(),
    orderVersion: version.nullable(),
    state: z.enum([
      "CLAIM_PENDING",
      "ACTIVE",
      "RELEASE_PENDING",
      "RELEASED",
    ]),
    weight: decimal,
    volume: decimal,
    assignedAt: timestamp,
    removedAt: timestamp.nullable(),
    claimReceipt: z.unknown().nullable(),
    releaseReceipt: z.unknown().nullable(),
    shipmentSnapshot: shipmentSnapshotSchema.nullable(),
  })
  .strict();
export type ShipmentMembership = z.infer<typeof shipmentMembershipSchema>;

export const tripDetailSchema = tripSummarySchema.extend({
  vehicleSnapshot: z.object({
    code: z.string(),
    licensePlate: z.string(),
  }).passthrough().nullable().optional(),
  driverSnapshot: z.object({
    code: z.string(),
    displayName: z.string(),
  }).passthrough().nullable().optional(),
  approvedRoutePlanId: uuid.nullable().optional(),
  shipments: z.array(shipmentMembershipSchema),
  stops: z.array(tripStopSchema),
});
export type TripDetail = z.infer<typeof tripDetailSchema>;

export const eligibleShipmentSchema = z.object({
  shipmentId: uuid,
  shipmentNumber: z.string().min(1).optional(),
  orderId: uuid,
  warehouseId: uuid,
  shipmentVersion: version,
  orderVersion: version,
  status: z.literal("READY_TO_SHIP"),
  totalWeight: decimal,
  totalVolume: decimal,
});
export type EligibleShipment = z.infer<typeof eligibleShipmentSchema>;

export const eligibleShipmentPageSchema = z.object({
  items: z.array(eligibleShipmentSchema),
  total: z.number().int().nonnegative(),
  page: version,
  pageSize: version,
});
export type EligibleShipmentPage = z.infer<typeof eligibleShipmentPageSchema>;

export const tripOperationSchema = z.object({
  tripId: uuid,
  requestId: uuid,
  kind: z.enum([
    "CREATE",
    "UPDATE",
    "ASSIGNMENT",
    "ADD",
    "REMOVE",
    "CANCEL",
    "SHIPMENT_CANCELED",
  ]),
  status: z.enum(["PENDING", "COMPLETED", "REJECTED"]),
  version,
  results: z.array(
    z.object({
      shipmentId: uuid,
      state: z.enum([
        "CLAIM_PENDING",
        "ACTIVE",
        "RELEASE_PENDING",
        "RELEASED",
      ]),
      reason: z.string().optional(),
    })
  ),
});
export type TripOperation = z.infer<typeof tripOperationSchema>;

export const cancelPreviewSchema = z.object({
  previewToken: z.string().min(1),
  tripId: uuid,
  expectedVersion: version,
  expiresAt: timestamp,
  activeShipmentCount: z.number().int().nonnegative(),
  releaseCount: z.number().int().nonnegative(),
  blockers: z.array(z.unknown()),
});
export type CancelPreview = z.infer<typeof cancelPreviewSchema>;

export const createTripSchema = z
  .object({
    requestId: uuid,
    warehouseId: uuid,
    plannedStartAt: z.iso.datetime(),
    vehicleId: uuid.nullable().optional(),
    driverId: uuid.nullable().optional(),
  })
  .strict();
export type CreateTripInput = z.infer<typeof createTripSchema>;

export const updateTripSchema = z
  .object({
    requestId: uuid,
    expectedVersion: version,
    plannedStartAt: z.iso.datetime().optional(),
    vehicleId: uuid.nullable().optional(),
    driverId: uuid.nullable().optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.plannedStartAt !== undefined ||
      input.vehicleId !== undefined ||
      input.driverId !== undefined,
    { message: "At least one editable trip field is required." }
  );
export type UpdateTripInput = z.infer<typeof updateTripSchema>;

export const addShipmentsSchema = z
  .object({
    requestId: uuid,
    expectedTripVersion: version,
    shipments: z
      .array(z.object({ shipmentId: uuid, expectedShipmentVersion: version }).strict())
      .min(1),
  })
  .strict()
  .refine(
    ({ shipments }) =>
      new Set(shipments.map((shipment) => shipment.shipmentId)).size ===
      shipments.length,
    { message: "Shipment IDs must be unique." }
  );
export type AddShipmentsInput = z.infer<typeof addShipmentsSchema>;

export const assignTripSchema = z
  .object({
    requestId: uuid,
    expectedVersion: version,
    vehicleId: uuid.nullable().optional(),
    driverId: uuid.nullable().optional(),
  })
  .strict()
  .refine(
    (input) => input.vehicleId !== undefined || input.driverId !== undefined,
    { message: "At least one assignment field is required." }
  );
export type AssignTripInput = z.infer<typeof assignTripSchema>;

export const removeShipmentsSchema = z
  .object({
    requestId: uuid,
    expectedTripVersion: version,
    shipmentIds: z.array(uuid).min(1),
  })
  .strict()
  .refine(
    ({ shipmentIds }) => new Set(shipmentIds).size === shipmentIds.length,
    { message: "Shipment IDs must be unique." }
  );
export type RemoveShipmentsInput = z.infer<typeof removeShipmentsSchema>;

export const cancelPreviewInputSchema = z
  .object({ expectedVersion: version })
  .strict();
export const cancelTripSchema = z
  .object({
    requestId: uuid,
    expectedVersion: version,
    previewToken: z.string().min(1),
    confirmed: z.literal(true),
    reason: z.string().trim().min(1).max(1000),
  })
  .strict();
export type CancelTripInput = z.infer<typeof cancelTripSchema>;

export const cancelTripReplaySchema = z.union([
  cancelTripSchema,
  cancelTripSchema.omit({ previewToken: true }).extend({ previewId: uuid }).strict(),
]);
export type CancelTripReplayInput = z.infer<typeof cancelTripReplaySchema>;

export const tripListParamsSchema = z
  .object({
    warehouseId: uuid.optional(),
    status: tripStatusSchema.optional(),
    vehicleId: uuid.optional(),
    driverId: uuid.optional(),
    plannedStartFrom: z.iso.datetime().optional(),
    plannedStartTo: z.iso.datetime().optional(),
    search: z.string().optional(),
    page: version.default(1),
    pageSize: version.default(20),
  })
  .strict()
  .refine(
    ({ plannedStartFrom, plannedStartTo }) =>
      !plannedStartFrom ||
      !plannedStartTo ||
      plannedStartFrom <= plannedStartTo,
    { message: "plannedStartFrom must not be after plannedStartTo." }
  );
export type TripListParams = z.input<typeof tripListParamsSchema>;
