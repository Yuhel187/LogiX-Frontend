import { authFetch, handleResponse, toQueryString } from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";
import {
  dispatchPreviewSchema,
  shipmentDetailSchema,
  shipmentPageSchema,
  type DispatchInput,
  type DispatchPreview,
  type ShipmentDetail,
  type ShipmentListParams,
  type ShipmentPage,
} from "../schemas/shipment.schema";
import type { ShipmentAction } from "../constants/shipment.constants";

const BASE = `${apiBaseUrl}/shipments`;
export async function listShipmentsApi(
  params: ShipmentListParams = {},
  signal?: AbortSignal
): Promise<ShipmentPage> {
  const response = await authFetch(`${BASE}${toQueryString({ ...params })}`, {
    method: "GET",
    signal,
  });
  return shipmentPageSchema.parse(await handleResponse<unknown>(response));
}
export async function getShipmentApi(id: string, signal?: AbortSignal): Promise<ShipmentDetail> {
  const response = await authFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: "GET",
    signal,
  });
  return shipmentDetailSchema.parse(await handleResponse<unknown>(response));
}
export async function getDispatchPreviewApi(id: string, signal?: AbortSignal): Promise<DispatchPreview> {
  const response = await authFetch(
    `${BASE}/${encodeURIComponent(id)}/dispatch-preview`,
    { method: "GET", signal }
  );
  return dispatchPreviewSchema.parse(await handleResponse<unknown>(response));
}
export async function commandShipmentApi(
  id: string,
  action: ShipmentAction,
  input: { version: number; confirmed?: true; reason?: string } | DispatchInput
): Promise<ShipmentDetail> {
  const response = await authFetch(
    `${BASE}/${encodeURIComponent(id)}/${action}`,
    { method: "POST", body: JSON.stringify(input) }
  );
  return shipmentDetailSchema.parse(await handleResponse<unknown>(response));
}
