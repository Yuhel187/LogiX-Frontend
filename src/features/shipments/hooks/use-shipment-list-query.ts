"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { SHIPMENT_PAGE_SIZE } from "../constants/shipment.constants";
import {
  shipmentStatusSchema,
  type ShipmentListParams,
} from "../schemas/shipment.schema";

const date = z.iso.date();
const uuid = z.string().uuid();
export function useShipmentListQuery() {
  const search = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  const rawPage = Number(search.get("page") ?? 1);
  const status = shipmentStatusSchema.safeParse(search.get("status")).data;
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
    status,
    createdFrom: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    createdTo: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
  };
  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(search.toString());
    if (!("page" in changes)) next.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(next.size ? `${pathname}?${next}` : pathname, {
      scroll: false,
    });
  };
  return {
    params,
    from: from ?? "",
    to: to ?? "",
    update,
    reset: () => router.replace(pathname, { scroll: false }),
  };
}
