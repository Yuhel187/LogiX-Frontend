import { z } from "zod";
import {
  tripListParamsSchema,
  tripStatusSchema,
  type TripListParams,
} from "../schemas/trip.schema";

const date = z.iso.date();
const uuid = z.uuid();
const MAX_PAGE = 2_147_483;

export interface TripListQueryState {
  params: TripListParams;
  warehouseId: string;
  status: string;
  vehicleId: string;
  driverId: string;
  plannedStartFrom: string;
  plannedStartTo: string;
  search: string;
  page: number;
  invalid: boolean;
}

function readSingle(search: URLSearchParams, key: string): string | undefined {
  const values = search.getAll(key);
  return values.length === 1 ? values[0] : undefined;
}

function toDateTime(value: string, endOfDay = false): string | undefined {
  if (!date.safeParse(value).success) return undefined;
  return new Date(
    `${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`
  ).toISOString();
}

export function parseTripListQuery(search: URLSearchParams): TripListQueryState {
  const rawPage = readSingle(search, "page");
  const parsedPage = Number(rawPage ?? "1");
  const page =
    Number.isSafeInteger(parsedPage) &&
    parsedPage > 0 &&
    parsedPage <= MAX_PAGE
      ? parsedPage
      : 1;
  const warehouse = readSingle(search, "warehouseId");
  const vehicle = readSingle(search, "vehicleId");
  const driver = readSingle(search, "driverId");
  const status = readSingle(search, "status");
  const from = readSingle(search, "plannedStartFrom");
  const to = readSingle(search, "plannedStartTo");
  const searchText = readSingle(search, "search") ?? "";

  const warehouseId = warehouse && uuid.safeParse(warehouse).success ? warehouse : "";
  const vehicleId = vehicle && uuid.safeParse(vehicle).success ? vehicle : "";
  const driverId = driver && uuid.safeParse(driver).success ? driver : "";
  const plannedStartFrom = from && date.safeParse(from).success ? from : "";
  const plannedStartTo = to && date.safeParse(to).success ? to : "";
  const validStatus =
    status && tripStatusSchema.safeParse(status).success ? status : "";
  const rangeInvalid =
    plannedStartFrom !== "" &&
    plannedStartTo !== "" &&
    plannedStartFrom > plannedStartTo;
  const invalid =
    search
      .getAll("page")
      .length > 1 ||
    search.has("page") &&
      (!rawPage || String(page) !== rawPage) ||
    search.getAll("warehouseId").length > 1 ||
    (search.has("warehouseId") && !warehouseId) ||
    search.getAll("vehicleId").length > 1 ||
    (search.has("vehicleId") && !vehicleId) ||
    search.getAll("driverId").length > 1 ||
    (search.has("driverId") && !driverId) ||
    search.getAll("status").length > 1 ||
    (search.has("status") && !validStatus) ||
    search.getAll("plannedStartFrom").length > 1 ||
    (search.has("plannedStartFrom") && !plannedStartFrom) ||
    search.getAll("plannedStartTo").length > 1 ||
    (search.has("plannedStartTo") && !plannedStartTo) ||
    search.getAll("search").length > 1 ||
    search.has("pageSize") ||
    rangeInvalid;

  const paramsResult = tripListParamsSchema.safeParse({
    warehouseId: warehouseId || undefined,
    vehicleId: vehicleId || undefined,
    driverId: driverId || undefined,
    status: validStatus || undefined,
    plannedStartFrom: plannedStartFrom
      ? toDateTime(plannedStartFrom)
      : undefined,
    plannedStartTo: plannedStartTo ? toDateTime(plannedStartTo, true) : undefined,
    search: searchText.trim() || undefined,
    page: rangeInvalid ? 1 : page,
    pageSize: 20,
  });

  const params = paramsResult.success
    ? { ...paramsResult.data, pageSize: 20 }
    : { page: 1, pageSize: 20 };

  return {
    params,
    warehouseId,
    status: validStatus,
    vehicleId,
    driverId,
    plannedStartFrom: rangeInvalid ? "" : plannedStartFrom,
    plannedStartTo: rangeInvalid ? "" : plannedStartTo,
    search: searchText,
    page: rangeInvalid ? 1 : page,
    invalid: invalid || !paramsResult.success,
  };
}

export const TRIP_LIST_QUERY_KEYS = [
  "warehouseId",
  "status",
  "vehicleId",
  "driverId",
  "plannedStartFrom",
  "plannedStartTo",
  "search",
  "page",
] as const;
