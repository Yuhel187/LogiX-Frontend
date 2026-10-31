import { authFetch, handleResponse } from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";
import { z } from "zod";
import {
  approveRouteInputSchema, manualRouteInputSchema, optimizeRouteInputSchema,
  overrideRouteInputSchema, reopenTripInputSchema, routeApprovalPreviewSchema,
  routePlanSchema, routePlansSchema, routePreviewInputSchema,
  type ApproveRouteInput, type ManualRouteInput, type OptimizeRouteInput,
  type OverrideRouteInput, type ReopenTripInput, type RoutePreviewInput,
} from "../schemas/route.schema";
import { tripDetailSchema } from "../schemas/trip.schema";
import { TRIP_COMMAND_TIMEOUT_MS } from "./trips.api";

const base = (tripId: string) => `${apiBaseUrl}/trips/${encodeURIComponent(z.uuid().parse(tripId))}`;
async function post<T>(
  tripId: string,
  path: string,
  body: unknown,
  schema: z.ZodType<T>
): Promise<T> {
  const response = await authFetch(`${base(tripId)}/${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TRIP_COMMAND_TIMEOUT_MS),
    skipAuthRefresh: true,
  });
  return schema.parse(await handleResponse<unknown>(response));
}
export async function listRoutePlansApi(tripId: string, signal?: AbortSignal) {
  const response = await authFetch(`${base(tripId)}/route-plans`, { method: "GET", signal });
  return routePlansSchema.parse(await handleResponse<unknown>(response));
}
export async function getRoutePlanApi(tripId: string, planId: string, signal?: AbortSignal) {
  const response = await authFetch(`${base(tripId)}/route-plans/${encodeURIComponent(z.uuid().parse(planId))}`, {
    method: "GET", signal,
  });
  return routePlanSchema.parse(await handleResponse<unknown>(response));
}
export const createManualRouteApi = (tripId: string, input: ManualRouteInput) =>
  post(tripId, "route-plans/manual", manualRouteInputSchema.parse(input), routePlanSchema);
export const optimizeTripRouteApi = (tripId: string, input: OptimizeRouteInput) =>
  post(tripId, "route-optimizations", optimizeRouteInputSchema.parse(input), routePlanSchema);
export const previewRouteApprovalApi = (tripId: string, input: RoutePreviewInput) =>
  post(tripId, "route-approval-preview", routePreviewInputSchema.parse(input), routeApprovalPreviewSchema);
export const approveTripRouteApi = (tripId: string, input: ApproveRouteInput) =>
  post(tripId, "approve-route", approveRouteInputSchema.parse(input), tripDetailSchema);
export const overrideTripRouteApi = (tripId: string, input: OverrideRouteInput) =>
  post(tripId, "override-route", overrideRouteInputSchema.parse(input), tripDetailSchema);
export const reopenTripApi = (tripId: string, input: ReopenTripInput) =>
  post(tripId, "reopen", reopenTripInputSchema.parse(input), tripDetailSchema);
