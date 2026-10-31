import { z } from "zod";
import { addressSnapshotSchema } from "./trip.schema";

// Transport contract: libs/messaging/src/interfaces/trip-route.contract.ts.
const uuid = z.uuid();
const version = z.number().int().positive().safe();
const decimal = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/);
const timestamp = z.iso.datetime({ offset: true });
const coordinate = z.string().regex(/^-?\d+(?:\.\d+)?$/);
export const routeVehicleSnapshotSchema = z.object({
  id: uuid,
  code: z.string(),
  licensePlate: z.string(),
  capacityWeight: decimal.nullable(),
  capacityVolume: decimal.nullable(),
  version,
}).passthrough();
export const routeDriverSnapshotSchema = z.object({
  id: uuid,
  userId: uuid,
  code: z.string(),
  displayName: z.string(),
  version,
}).passthrough();
export const routePlanSchema = z.object({
  id: uuid,
  tenantId: uuid,
  tripId: uuid,
  planVersion: version,
  version,
  routeRequestId: uuid,
  source: z.enum(["MANUAL", "OPTIMIZED", "OVERRIDE"]),
  inputHash: z.string().regex(/^[a-f0-9]{64}$/),
  inputSnapshot: z.object({
    depot: z.object({
      name: z.string(),
      address: z.string(),
      latitude: coordinate,
      longitude: coordinate,
    }).passthrough(),
    stops: z.array(z.object({
      stopId: uuid,
      shipmentId: uuid,
      sequence: version,
      demandWeight: decimal,
      demandVolume: decimal,
      addressSnapshot: addressSnapshotSchema,
    }).passthrough()),
  }).passthrough(),
  optimizationRunId: uuid.nullable(),
  solverName: z.string().nullable(),
  solverVersion: z.string().nullable(),
  objective: z.string().nullable(),
  totalDistance: decimal.nullable(),
  estimatedCost: decimal.nullable(),
  metrics: z.object({
    total_duration_minutes: z.number().finite().nonnegative().optional(),
    polyline: z.array(z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
    ])).optional(),
    distance_provider: z.string().optional(),
  }).passthrough().nullable(),
  originalPlanId: uuid.nullable(),
  overrideReason: z.string().nullable(),
  approvedBy: uuid.nullable(),
  approvedAt: timestamp.nullable(),
  vehicleSnapshot: routeVehicleSnapshotSchema.nullable(),
  driverSnapshot: routeDriverSnapshotSchema.nullable(),
  createdAt: timestamp,
  stops: z.array(z.object({
    tripStopId: uuid,
    sequence: version,
    eta: timestamp.nullable(),
    legDistance: decimal.nullable(),
    legDurationSeconds: z.number().int().nonnegative().nullable(),
  }).strict()),
}).passthrough();
export type RoutePlan = z.infer<typeof routePlanSchema>;
export const routePlansSchema = z.object({ items: z.array(routePlanSchema) });

export const routeApprovalPreviewSchema = z.object({
  previewToken: z.string().min(1),
  expiresAt: timestamp,
  tripId: uuid,
  expectedVersion: version,
  planId: uuid,
  planVersion: version,
  inputHash: z.string().regex(/^[a-f0-9]{64}$/),
  action: z.enum(["APPROVE", "OVERRIDE"]),
  orderedStopIds: z.array(uuid).min(1).max(100),
  reason: z.string().nullable(),
  vehicleSnapshot: routeVehicleSnapshotSchema,
  driverSnapshot: routeDriverSnapshotSchema,
  totalWeight: decimal,
  totalVolume: decimal,
});
export type RouteApprovalPreview = z.infer<typeof routeApprovalPreviewSchema>;

const orderedStopIds = z.array(uuid).min(1).max(100).refine(
  (ids) => new Set(ids).size === ids.length, "Stop IDs must be unique."
);
const reason = z.string().trim().min(1).max(1_000);
export const manualRouteInputSchema = z.object({
  requestId: uuid,
  expectedTripVersion: version,
  orderedStopIds,
}).strict();
export const optimizeRouteInputSchema = manualRouteInputSchema.omit({ orderedStopIds: true });
const selection = z.object({
  expectedVersion: version,
  planId: uuid,
  planVersion: version,
  inputHash: z.string().regex(/^[a-f0-9]{64}$/),
});
export const routePreviewInputSchema = selection.extend({
  orderedStopIds: orderedStopIds.optional(),
  reason: reason.optional(),
}).strict().refine(
  (input) => (input.orderedStopIds === undefined) === (input.reason === undefined),
  "Override needs both an order and a reason."
);
export const approveRouteInputSchema = selection.extend({
  requestId: uuid,
  previewToken: z.string().min(1).max(4_096),
  confirmed: z.literal(true),
}).strict();
export const overrideRouteInputSchema = approveRouteInputSchema.extend({ orderedStopIds, reason });
export const reopenTripInputSchema = z.object({
  requestId: uuid,
  expectedVersion: version,
  reason,
}).strict();
export type ManualRouteInput = z.infer<typeof manualRouteInputSchema>;
export type OptimizeRouteInput = z.infer<typeof optimizeRouteInputSchema>;
export type RoutePreviewInput = z.infer<typeof routePreviewInputSchema>;
export type ApproveRouteInput = z.infer<typeof approveRouteInputSchema>;
export type OverrideRouteInput = z.infer<typeof overrideRouteInputSchema>;
export type ReopenTripInput = z.infer<typeof reopenTripInputSchema>;
