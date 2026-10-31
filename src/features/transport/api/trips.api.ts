import {
  authFetch,
  handleResponse,
  toQueryString,
  type AuthFetchOptions,
} from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";
import {
  dispatchCommandSchema,
  dispatchOperationSchema,
  dispatchPreviewInputSchema,
  dispatchPreviewSchema,
  type DispatchCommand,
  type DispatchOperation,
  type DispatchPreview,
} from "../schemas/dispatch.schema";
import {
  addShipmentsSchema,
  assignTripSchema,
  cancelPreviewInputSchema,
  cancelPreviewSchema,
  cancelTripSchema,
  cancelTripReplaySchema,
  createTripSchema,
  eligibleShipmentPageSchema,
  removeShipmentsSchema,
  tripDetailSchema,
  tripOperationSchema,
  tripPageSchema,
  tripSummarySchema,
  updateTripSchema,
  type AddShipmentsInput,
  type AssignTripInput,
  type CancelPreview,
  type CancelTripInput,
  type CancelTripReplayInput,
  type CreateTripInput,
  type EligibleShipmentPage,
  type RemoveShipmentsInput,
  type TripDetail,
  type TripListParams,
  type TripOperation,
  type TripPage,
  type TripSummary,
  type UpdateTripInput,
} from "../schemas/trip.schema";

const BASE_URL = `${apiBaseUrl}/trips`;
export const TRIP_COMMAND_TIMEOUT_MS = 30_000;

function commandOptions(body: unknown): AuthFetchOptions {
  return {
    method: "POST",
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TRIP_COMMAND_TIMEOUT_MS),
    skipAuthRefresh: true,
  };
}

export async function previewTripDispatchApi(
  tripId: string,
  input: { version: number }
): Promise<DispatchPreview> {
  const body = dispatchPreviewInputSchema.parse(input);
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(tripId)}/dispatch-preview`,
    commandOptions(body)
  );
  return dispatchPreviewSchema.parse(await handleResponse<unknown>(response));
}

export async function dispatchTripApi(
  tripId: string,
  input: DispatchCommand
): Promise<DispatchOperation> {
  const body = dispatchCommandSchema.parse(input);
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(tripId)}/dispatch`,
    commandOptions(body)
  );
  return dispatchOperationSchema.parse(await handleResponse<unknown>(response));
}

export async function getTripDispatchOperationApi(
  tripId: string,
  requestId: string,
  signal?: AbortSignal
): Promise<DispatchOperation> {
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(tripId)}/operations/${encodeURIComponent(requestId)}`,
    { method: "GET", signal }
  );
  return dispatchOperationSchema.parse(await handleResponse<unknown>(response));
}

export async function listTripsApi(
  params: TripListParams,
  signal?: AbortSignal
): Promise<TripPage> {
  const response = await authFetch(`${BASE_URL}${toQueryString(params)}`, {
    method: "GET",
    signal,
  });
  return tripPageSchema.parse(await handleResponse<unknown>(response));
}

export async function getTripApi(
  tripId: string,
  signal?: AbortSignal
): Promise<TripDetail> {
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(tripId)}`,
    { method: "GET", signal }
  );
  return tripDetailSchema.parse(await handleResponse<unknown>(response));
}

export async function createTripApi(
  input: CreateTripInput
): Promise<TripSummary> {
  const body = createTripSchema.parse(input);
  const response = await authFetch(BASE_URL, commandOptions(body));
  return tripSummarySchema.parse(await handleResponse<unknown>(response));
}

export async function updateTripApi(
  tripId: string,
  input: UpdateTripInput
): Promise<TripSummary> {
  const body = updateTripSchema.parse(input);
  const response = await authFetch(`${BASE_URL}/${encodeURIComponent(tripId)}`, {
    ...commandOptions(body),
    method: "PATCH",
  });
  return tripSummarySchema.parse(await handleResponse<unknown>(response));
}

export async function listEligibleShipmentsApi(
  params: { warehouseId: string; page: number; pageSize: number },
  signal?: AbortSignal
): Promise<EligibleShipmentPage> {
  const response = await authFetch(
    `${BASE_URL}/eligible-shipments${toQueryString(params)}`,
    { method: "GET", signal }
  );
  return eligibleShipmentPageSchema.parse(
    await handleResponse<unknown>(response)
  );
}

export async function assignTripApi(
  tripId: string,
  input: AssignTripInput
): Promise<TripSummary> {
  const body = assignTripSchema.parse(input);
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(tripId)}/assignment`,
    commandOptions(body)
  );
  return tripSummarySchema.parse(await handleResponse<unknown>(response));
}

export async function addShipmentsApi(
  tripId: string,
  input: AddShipmentsInput
): Promise<TripOperation> {
  const body = addShipmentsSchema.parse(input);
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(tripId)}/shipments`,
    commandOptions(body)
  );
  return tripOperationSchema.parse(await handleResponse<unknown>(response));
}

export async function removeShipmentsApi(
  tripId: string,
  input: RemoveShipmentsInput
): Promise<TripOperation> {
  const body = removeShipmentsSchema.parse(input);
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(tripId)}/shipments/remove`,
    commandOptions(body)
  );
  return tripOperationSchema.parse(await handleResponse<unknown>(response));
}

export async function getTripOperationApi(
  tripId: string,
  requestId: string,
  signal?: AbortSignal
): Promise<TripOperation> {
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(tripId)}/operations/${encodeURIComponent(requestId)}`,
    { method: "GET", signal }
  );
  return tripOperationSchema.parse(await handleResponse<unknown>(response));
}

export async function previewCancelTripApi(
  tripId: string,
  input: { expectedVersion: number }
): Promise<CancelPreview> {
  const body = cancelPreviewInputSchema.parse(input);
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(tripId)}/cancel-preview`,
    { ...commandOptions(body), method: "POST" }
  );
  return cancelPreviewSchema.parse(await handleResponse<unknown>(response));
}

export async function cancelTripApi(
  tripId: string,
  input: CancelTripInput
): Promise<TripOperation> {
  const body = cancelTripSchema.parse(input);
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(tripId)}/cancel`,
    commandOptions(body)
  );
  return tripOperationSchema.parse(await handleResponse<unknown>(response));
}

export async function replayCancelTripApi(
  tripId: string,
  savedInput: CancelTripReplayInput
): Promise<TripOperation> {
  const body = cancelTripReplaySchema.parse(savedInput);
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(tripId)}/cancel`,
    commandOptions(body)
  );
  return tripOperationSchema.parse(await handleResponse<unknown>(response));
}
