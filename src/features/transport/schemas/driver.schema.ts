import { z } from "zod";

const uuid = z.uuid();
const version = z.number().int().positive().safe();
const timestamp = z.string().min(1);
const snapshot = z.object({}).passthrough();
const reason = z.string().trim().min(1).max(1_000);
const maxPage = Math.floor(2_147_483_647 / 100);

export const driverTripListQuerySchema = z
  .object({
    scope: z.enum(["current", "history"]).default("current"),
    driverId: uuid.optional(),
    page: z.number().int().positive().max(maxPage).default(1),
    pageSize: z.number().int().positive().max(100).default(20),
  })
  .strict();

export const driverTripSummarySchema = z
  .object({
    tripId: uuid,
    tripNumber: z.string().min(1),
    status: z.enum(["IN_PROGRESS", "COMPLETED", "CANCELED"]),
    plannedStartAt: timestamp,
    warehouseId: uuid,
    vehicleSnapshot: snapshot.nullable(),
    driverSnapshot: snapshot.nullable(),
    version,
    stopCount: z.number().int().nonnegative(),
    completedStopCount: z.number().int().nonnegative(),
    nextStopId: uuid.nullable(),
    nextApprovedSequence: z.number().int().positive().nullable(),
  })
  .strict();

export const driverTripPageSchema = z
  .object({
    items: z.array(driverTripSummarySchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  })
  .strict();

export const driverTripContactSchema = z
  .object({
    recipientName: z.string().nullable(),
    phone: z.string().nullable(),
    addressLine: z.string().nullable(),
    ward: z.string().nullable(),
    district: z.string().nullable(),
    province: z.string().nullable(),
    postalCode: z.string().nullable(),
    deliveryNote: z.string().nullable(),
  })
  .strict();

export const driverTripStopSchema = z
  .object({
    stopId: uuid,
    shipmentId: uuid,
    shipmentNumber: z.string().nullable(),
    approvedSequence: z.number().int().positive(),
    status: z.enum(["PENDING", "DELIVERED", "FAILED"]),
    version,
    isNext: z.boolean(),
    contact: driverTripContactSchema,
  })
  .strict();

export const driverTripDetailSchema = z
  .object({
    tripId: uuid,
    tripNumber: z.string().min(1),
    status: z.enum(["IN_PROGRESS", "COMPLETED", "CANCELED"]),
    plannedStartAt: timestamp,
    actualStartAt: timestamp.nullable(),
    completedAt: timestamp.nullable(),
    warehouseId: uuid,
    depotSnapshot: snapshot,
    vehicleSnapshot: snapshot.nullable(),
    driverSnapshot: snapshot.nullable(),
    approvedRoutePlanId: uuid.nullable(),
    version,
    nextStopId: uuid.nullable(),
    stops: z.array(driverTripStopSchema),
  })
  .strict();

export const driverActionPreviewInputSchema = z
  .object({
    action: z.enum(["DELIVER", "FAIL"]),
    expectedTripVersion: version,
    expectedStopVersion: version,
    actingReason: reason.optional(),
    reason: reason.optional(),
  })
  .strict()
  .refine((input) => input.action === "FAIL" || input.reason === undefined)
  .refine((input) => input.action !== "FAIL" || input.reason !== undefined);

export const driverActionPreviewSchema = z
  .object({
    tripId: uuid,
    stopId: uuid,
    action: z.enum(["DELIVER", "FAIL"]),
    statusBefore: z.literal("PENDING"),
    statusAfter: z.enum(["DELIVERED", "FAILED"]),
    expectedTripVersion: version,
    expectedStopVersion: version,
    assignedDriverId: uuid,
    actingReason: z.string().min(1),
    reason: z.string().nullable(),
    previewToken: z.string().min(1),
    expiresAt: timestamp,
  })
  .strict();

export const driverActionCommandInputSchema = z
  .object({
    requestId: uuid,
    expectedTripVersion: version,
    expectedStopVersion: version,
    confirmed: z.literal(true),
    previewToken: z.string().min(1).max(4096).optional(),
    actingReason: reason.optional(),
    reason: reason.optional(),
  })
  .strict();

export const driverActionReceiptSchema = z
  .object({
    requestId: uuid,
    tripId: uuid,
    tripStopId: uuid,
    shipmentId: uuid,
    driverId: uuid,
    assigneeUserId: uuid,
    actorUserId: uuid,
    actorMode: z.enum(["DRIVER", "SUPER_ADMIN"]),
    status: z.enum(["DELIVERED", "FAILED"]),
    reason: z.string().nullable(),
    actingReason: z.string().nullable(),
    attempt: z.literal(1),
    occurredAt: timestamp,
    tripVersion: version,
    stopVersion: version,
  })
  .strict();

export type DriverTripListQuery = z.infer<typeof driverTripListQuerySchema>;
export type DriverTripSummary = z.infer<typeof driverTripSummarySchema>;
export type DriverTripPage = z.infer<typeof driverTripPageSchema>;
export type DriverTripStop = z.infer<typeof driverTripStopSchema>;
export type DriverTripDetail = z.infer<typeof driverTripDetailSchema>;
export type DriverAction = z.infer<typeof driverActionPreviewInputSchema>["action"];
export type DriverActionPreviewInput = z.infer<
  typeof driverActionPreviewInputSchema
>;
export type DriverActionPreview = z.infer<typeof driverActionPreviewSchema>;
export type DriverActionCommandInput = z.infer<
  typeof driverActionCommandInputSchema
>;
export type DriverActionReceipt = z.infer<typeof driverActionReceiptSchema>;
