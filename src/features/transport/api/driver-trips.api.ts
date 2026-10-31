import {
  authFetch,
  handleResponse,
  toQueryString,
} from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";
import {
  driverActionCommandInputSchema,
  driverActionPreviewInputSchema,
  driverActionPreviewSchema,
  driverActionReceiptSchema,
  driverTripDetailSchema,
  driverTripListQuerySchema,
  driverTripPageSchema,
  type DriverActionCommandInput,
  type DriverActionPreview,
  type DriverActionPreviewInput,
  type DriverTripDetail,
  type DriverTripListQuery,
  type DriverTripPage,
} from "../schemas/driver.schema";

const BASE_URL = `${apiBaseUrl}/driver/trips`;
const COMMAND_TIMEOUT_MS = 30_000;

function postOptions(body: unknown) {
  return {
    method: "POST",
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(COMMAND_TIMEOUT_MS),
    skipAuthRefresh: true,
  } as const;
}

export async function listDriverTripsApi(
  input: DriverTripListQuery,
  signal?: AbortSignal,
): Promise<DriverTripPage> {
  const query = driverTripListQuerySchema.parse(input);
  const response = await authFetch(`${BASE_URL}${toQueryString(query)}`, {
    method: "GET",
    signal,
  });
  return driverTripPageSchema.parse(await handleResponse<unknown>(response));
}

export async function getDriverTripApi(
  tripId: string,
  signal?: AbortSignal,
): Promise<DriverTripDetail> {
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(tripId)}`,
    { method: "GET", signal },
  );
  return driverTripDetailSchema.parse(await handleResponse<unknown>(response));
}

export async function previewDriverTripActionApi(
  tripId: string,
  stopId: string,
  input: DriverActionPreviewInput,
): Promise<DriverActionPreview> {
  const body = driverActionPreviewInputSchema.parse(input);
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(tripId)}/stops/${encodeURIComponent(stopId)}/action-preview`,
    postOptions(body),
  );
  return driverActionPreviewSchema.parse(
    await handleResponse<unknown>(response),
  );
}

async function submitDriverTripAction(
  action: "deliver" | "fail",
  tripId: string,
  stopId: string,
  input: DriverActionCommandInput,
) {
  const body = driverActionCommandInputSchema.parse(input);
  const response = await authFetch(
    `${BASE_URL}/${encodeURIComponent(tripId)}/stops/${encodeURIComponent(stopId)}/${action}`,
    postOptions(body),
  );
  return driverActionReceiptSchema.parse(
    await handleResponse<unknown>(response),
  );
}

export function deliverDriverTripStopApi(
  tripId: string,
  stopId: string,
  input: DriverActionCommandInput,
) {
  return submitDriverTripAction("deliver", tripId, stopId, input);
}

export function failDriverTripStopApi(
  tripId: string,
  stopId: string,
  input: DriverActionCommandInput,
) {
  return submitDriverTripAction("fail", tripId, stopId, input);
}
