"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getWarehouseApi, listWarehousesApi } from "../../api/warehouses.api";
import type { Warehouse } from "../../schemas/warehouse.schema";

export interface WarehousePickerProps {
  id?: string;
  value?: string;
  onChange: (warehouseId: string, warehouse?: Warehouse) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
  allLabel?: string;
}

export function WarehousePicker({
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  allowClear = false,
  allLabel,
}: WarehousePickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [fetchedWarehouse, setFetchedWarehouse] =
    React.useState<Warehouse | null>(null);
  const [selectedFailure, setSelectedFailure] = React.useState<string | null>(
    null
  );
  const [searchFailure, setSearchFailure] = React.useState(false);
  const [retry, setRetry] = React.useState(0);

  // Compute selected warehouse without synchronous setState in effect
  const selectedWarehouse =
    warehouses.find((w) => w.id === value) ||
    (fetchedWarehouse?.id === value ? fetchedWarehouse : null);

  // Fetch single warehouse metadata asynchronously if value provided and not found yet
  React.useEffect(() => {
    if (!value) return;
    let active = true;

    getWarehouseApi(value)
      .then((data) => {
        if (active) {
          setFetchedWarehouse(data);
          setSelectedFailure(null);
        }
      })
      .catch(() => {
        if (active) setSelectedFailure(value);
      });

    return () => {
      active = false;
    };
  }, [value, retry]);

  // Fetch warehouses on search query or popover open
  React.useEffect(() => {
    if (!open) return;

    let active = true;

    const timer = setTimeout(() => {
      setLoading(true);
      setSearchFailure(false);
      listWarehousesApi({
        q: query.trim() || undefined,
        status: "ACTIVE",
        pageSize: 20,
      })
        .then((res) => {
          if (active) {
            setWarehouses(res.items);
            setLoading(false);
          }
        })
        .catch(() => {
          if (active) {
            setSearchFailure(true);
            setLoading(false);
          }
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, query, retry]);

  const handleSelect = (warehouse: Warehouse) => {
    setFetchedWarehouse(warehouse);
    setSelectedFailure(null);
    onChange(warehouse.id, warehouse);
    setOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFetchedWarehouse(null);
    onChange("");
    setOpen(false);
  };

  return (
    <div className="min-w-0">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal h-8 text-xs",
              !value && "text-muted-foreground",
              className
            )}
          >
            <span className="truncate">
              {selectedWarehouse ? (
                <span className="inline-flex items-center gap-1.5 truncate">
                  <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-foreground font-semibold">
                    {selectedWarehouse.code}
                  </span>
                  <span className="truncate text-foreground font-medium">
                    {selectedWarehouse.name}
                  </span>
                </span>
              ) : allLabel && !value ? (
                allLabel
              ) : (
                (placeholder ?? t("pickers.warehouse.placeholder"))
              )}
            </span>
            <div className="flex items-center gap-1 ml-1 shrink-0">
              {allowClear && value && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={t("pickers.clear")}
                  className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={handleClear}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleClear();
                    }
                  }}
                >
                  <X className="size-3" />
                </span>
              )}
              <ChevronsUpDown className="size-3.5 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[300px] max-w-[calc(100vw-2rem)] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={t("pickers.warehouse.search")}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-60 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{t("pickers.loading")}</span>
                </div>
              )}
              {!loading && searchFailure && (
                <div
                  role="alert"
                  className="space-y-2 p-3 text-xs text-destructive"
                >
                  <p>{t("pickers.warehouse.loadError")}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRetry((n) => n + 1)}
                  >
                    {t("pickers.retry")}
                  </Button>
                </div>
              )}
              {!loading && !searchFailure && warehouses.length === 0 && (
                <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                  {t("pickers.warehouse.empty")}
                </CommandEmpty>
              )}
              {!loading && !searchFailure && (
                <CommandGroup>
                  {allLabel && (
                    <CommandItem
                      value="all"
                      onSelect={() => handleClear()}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 size-3.5",
                          !value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="font-medium text-xs">{allLabel}</span>
                    </CommandItem>
                  )}
                  {warehouses.map((warehouse) => {
                    const isSelected = value === warehouse.id;
                    return (
                      <CommandItem
                        key={warehouse.id}
                        value={warehouse.id}
                        onSelect={() => handleSelect(warehouse)}
                        className="cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Check
                            className={cn(
                              "size-3.5 shrink-0",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] bg-muted px-1 rounded text-muted-foreground font-medium">
                                {warehouse.code}
                              </span>
                              <span className="font-medium text-xs truncate">
                                {warehouse.name}
                              </span>
                            </div>
                            {(warehouse.province || warehouse.district) && (
                              <span className="text-[10px] text-muted-foreground truncate">
                                {[warehouse.district, warehouse.province]
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedFailure === value && value ? (
        <div role="alert" className="mt-1 text-xs text-destructive">
          {t("pickers.warehouse.loadError")}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => setRetry((n) => n + 1)}
          >
            {t("pickers.retry")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
