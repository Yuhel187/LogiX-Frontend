"use client";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import {
  SHIPMENT_LIST_VIEWS,
  SHIPMENT_PAGE_SIZE,
  SHIPMENT_PREPARATION_STATUSES,
} from "../constants/shipment.constants";
import {
  shipmentStatusSchema,
  type ShipmentListParams,
} from "../schemas/shipment.schema";

const date = z.iso.date();
const uuid = z.string().uuid();
const viewSchema = z.enum(SHIPMENT_LIST_VIEWS);
export function useShipmentListQuery() {
  const search = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  const rawPage = Number(search.get("page") ?? 1);
  const status = shipmentStatusSchema.safeParse(search.get("status")).data;
  const parsedView = viewSchema.safeParse(search.get("view")).data;
  const incompatibleStatus =
    status !== undefined &&
    ((parsedView === "preparation" &&
      !SHIPMENT_PREPARATION_STATUSES.some((value) => value === status)) ||
      (parsedView === "ready" && status !== "READY_TO_SHIP"));
  const invalidView =
    (search.has("view") && !parsedView) ||
    search.getAll("view").length > 1 ||
    (search.has("status") && !status) ||
    search.getAll("status").length > 1 ||
    incompatibleStatus;
  const view = invalidView ? "all" : (parsedView ?? "all");
  const canonical = new URLSearchParams(search.toString());
  if (invalidView) canonical.delete("view");
  if ((search.has("status") && !status) || search.getAll("status").length > 1)
    canonical.delete("status");
  const canonicalQuery = canonical.toString();
  const rawQuery = search.toString();
  useEffect(() => {
    if (canonicalQuery !== rawQuery)
      router.replace(
        canonicalQuery ? `${pathname}?${canonicalQuery}` : pathname,
        { scroll: false }
      );
  }, [canonicalQuery, rawQuery, pathname, router]);
  const selectedStatus =
    search.getAll("status").length > 1 ? undefined : status;
  const warehouseId = uuid.safeParse(search.get("warehouseId")).data;
  const orderId = uuid.safeParse(search.get("orderId")).data;
  const from = date.safeParse(search.get("createdFrom")).data;
  const to = date.safeParse(search.get("createdTo")).data;
  const page =
    Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 21_474_836
      ? rawPage
      : 1;
  const params: ShipmentListParams = {
    page,
    pageSize: SHIPMENT_PAGE_SIZE,
    warehouseId,
    orderId,
    ...(view === "preparation" && !selectedStatus
      ? { statuses: SHIPMENT_PREPARATION_STATUSES }
      : { status: view === "ready" ? "READY_TO_SHIP" : selectedStatus }),
    createdFrom: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    createdTo: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
  };
  const invalidFilters =
    (
      [
        ["warehouseId", warehouseId],
        ["orderId", orderId],
        ["createdFrom", from],
        ["createdTo", to],
      ] as const
    ).some(
      ([key, value]) =>
        search.has(key) && (!value || search.getAll(key).length > 1)
    ) ||
    (search.has("page") &&
      (page !== rawPage || search.getAll("page").length > 1)) ||
    (from !== undefined && to !== undefined && from > to) ||
    search.has("statuses");
  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(canonicalQuery);
    if (!("page" in changes)) next.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.push(next.size ? `${pathname}?${next}` : pathname, {
      scroll: false,
    });
  };
  return {
    params,
    view,
    status: view === "ready" ? "READY_TO_SHIP" : selectedStatus,
    invalidQuery: invalidView || canonicalQuery !== rawQuery || invalidFilters,
    from: from ?? "",
    to: to ?? "",
    update,
    changeView: (value: string) => {
      const nextView = viewSchema.parse(value);
      const keepStatus =
        selectedStatus !== undefined &&
        (nextView === "all" ||
          (nextView === "preparation" &&
            SHIPMENT_PREPARATION_STATUSES.some(
              (value) => value === selectedStatus
            )) ||
          (nextView === "ready" && selectedStatus === "READY_TO_SHIP"));
      update({
        view: nextView === "all" ? "" : nextView,
        status: keepStatus ? selectedStatus : "",
      });
    },
    reset: () =>
      router.push(view === "all" ? pathname : `${pathname}?view=${view}`, {
        scroll: false,
      }),
  };
}
