"use client";

import { useEffect, useState } from "react";
import { ChevronDown, FilterX, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WarehousePicker } from "@/features/master-data";
import { useTranslation } from "@/lib/i18n";
import { ORDER_STATUSES, type OrderStatus } from "../schemas/order.schema";
import { ORDER_SEARCH_MAX_LENGTH } from "../constants/order.constants";
import type { OrderListFilters } from "../hooks/use-order-list-query";
import { CustomerPicker } from "./customer-picker";

const SEARCH_DEBOUNCE_MS = 350;

interface OrderFiltersProps {
  filters: OrderListFilters;
  hasActiveFilters: boolean;
  onChange: (changes: Partial<Omit<OrderListFilters, "page">>) => void;
  onReset: () => void;
}

export function OrderFilters({
  filters,
  hasActiveFilters,
  onChange,
  onReset,
}: OrderFiltersProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState(filters.q);
  const [syncedQ, setSyncedQ] = useState(filters.q);

  // Back/forward or reset changes the URL; mirror it into the input without an effect.
  if (syncedQ !== filters.q) {
    setSyncedQ(filters.q);
    setSearch(filters.q);
  }

  useEffect(() => {
    const next = search.trim();
    if (next === filters.q) return;
    const timer = setTimeout(() => onChange({ q: next }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, filters.q, onChange]);

  const toggleStatus = (status: OrderStatus, checked: boolean) => {
    const next = checked
      ? ORDER_STATUSES.filter(
          (item) => item === status || filters.statuses.includes(item)
        )
      : filters.statuses.filter((item) => item !== status);
    onChange({ statuses: next });
  };

  const statusLabel =
    filters.statuses.length === 0
      ? t("orders.list.allStatuses")
      : filters.statuses.length === 1
        ? t(`orders.status.${filters.statuses[0]}`)
        : t("orders.list.statusCount", { count: filters.statuses.length });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:max-w-xs lg:flex-1">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            maxLength={ORDER_SEARCH_MAX_LENGTH}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("orders.list.searchPlaceholder")}
            aria-label={t("orders.list.searchPlaceholder")}
            className="pl-8"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="justify-between lg:w-48">
              <span className="truncate">{statusLabel}</span>
              <ChevronDown className="size-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {ORDER_STATUSES.map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={filters.statuses.includes(status)}
                onCheckedChange={(checked) =>
                  toggleStatus(status, checked === true)
                }
                onSelect={(event) => event.preventDefault()}
              >
                {t(`orders.status.${status}`)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <CustomerPicker
          value={filters.customerId}
          onChange={(customerId) => onChange({ customerId })}
          placeholder={t("orders.list.allCustomers")}
          allowClear
          className="lg:w-56"
        />

        <div className="lg:w-56">
          <WarehousePicker
            value={filters.warehouseId}
            onChange={(warehouseId) => onChange({ warehouseId })}
            placeholder={t("orders.list.allWarehouses")}
            allLabel={t("orders.list.allWarehouses")}
            allowClear
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="shrink-0">{t("orders.list.createdFrom")}</span>
          <Input
            type="date"
            value={filters.createdFrom}
            max={filters.createdTo || undefined}
            onChange={(event) => onChange({ createdFrom: event.target.value })}
            className="w-40"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="shrink-0">{t("orders.list.createdTo")}</span>
          <Input
            type="date"
            value={filters.createdTo}
            min={filters.createdFrom || undefined}
            onChange={(event) => onChange({ createdTo: event.target.value })}
            className="w-40"
          />
        </label>

        {hasActiveFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-muted-foreground sm:ml-auto"
          >
            <FilterX className="size-3.5" />
            {t("orders.list.resetFilters")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
