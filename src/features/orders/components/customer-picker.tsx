"use client";

import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getCustomerApi,
  listCustomersApi,
  type Customer,
} from "@/features/master-data";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_PAGE_SIZE = 20;

interface CustomerPickerProps {
  id?: string;
  value: string;
  onChange: (customerId: string, customer?: Customer) => void;
  placeholder: string;
  disabled?: boolean;
  allowClear?: boolean;
  invalid?: boolean;
  className?: string;
}

/** Only ACTIVE customers are offered: the backend rejects inactive ones for new orders. */
export function CustomerPicker({
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
  allowClear = false,
  invalid = false,
  className,
}: CustomerPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<{
    key: string;
    items: Customer[];
    failed: boolean;
  } | null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [selectedFailure, setSelectedFailure] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const searchKey = open ? JSON.stringify([query.trim(), retry]) : null;
  const isSearching = searchKey !== null && search?.key !== searchKey;
  const customers = search?.key === searchKey ? search.items : [];
  const displayed = selected?.id === value ? selected : null;

  useEffect(() => {
    if (!value || selected?.id === value) return;
    let active = true;
    getCustomerApi(value)
      .then((customer) => {
        if (active) {
          setSelected(customer);
          setSelectedFailure(null);
        }
      })
      .catch(() => {
        if (active) setSelectedFailure(value);
      });
    return () => {
      active = false;
    };
  }, [value, selected?.id, retry]);

  useEffect(() => {
    if (searchKey === null) return;
    let active = true;
    const timer = setTimeout(() => {
      listCustomersApi({
        q: query.trim() || undefined,
        status: "ACTIVE",
        pageSize: SEARCH_PAGE_SIZE,
      })
        .then((page) => {
          if (active)
            setSearch({ key: searchKey, items: page.items, failed: false });
        })
        .catch(() => {
          if (active) setSearch({ key: searchKey, items: [], failed: true });
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchKey, query]);

  const handleSelect = (customer: Customer) => {
    setSelected(customer);
    setSelectedFailure(null);
    onChange(customer.id, customer);
    setOpen(false);
  };

  const handleClear = (event?: MouseEvent) => {
    event?.stopPropagation();
    setSelected(null);
    onChange("");
  };

  return (
    <div className="min-w-0">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid || undefined}
            disabled={disabled}
            className={cn(
              "h-8 w-full justify-between font-normal",
              !displayed && "text-muted-foreground",
              invalid && "border-destructive",
              className
            )}
          >
            <span className="truncate">
              {displayed ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                    {displayed.code}
                  </span>
                  <span className="truncate font-medium text-foreground">
                    {displayed.name}
                  </span>
                </span>
              ) : (
                placeholder
              )}
            </span>
            <span className="ml-1 flex shrink-0 items-center gap-1">
              {allowClear && value ? (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={t("orders.actions.clear")}
                  className="cursor-pointer rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={handleClear}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      handleClear();
                    }
                  }}
                >
                  <X className="size-3" />
                </span>
              ) : null}
              <ChevronsUpDown className="size-3.5 opacity-50" />
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[320px] max-w-[calc(100vw-2rem)] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={t("orders.form.customerSearch")}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-60 overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{t("common.loading")}</span>
                </div>
              ) : search?.failed ? (
                <div
                  role="alert"
                  className="space-y-2 p-3 text-xs text-destructive"
                >
                  <p>{t("orders.form.customerLoadError")}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRetry((n) => n + 1)}
                  >
                    {t("orders.actions.retry")}
                  </Button>
                </div>
              ) : customers.length === 0 ? (
                <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                  {t("orders.form.customerEmpty")}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {customers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.id}
                      onSelect={() => handleSelect(customer)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "size-3.5 shrink-0",
                          customer.id === value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="rounded bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">
                        {customer.code}
                      </span>
                      <span className="truncate text-xs font-medium">
                        {customer.name}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedFailure === value && value ? (
        <div role="alert" className="mt-1 text-xs text-destructive">
          {t("orders.form.customerLoadError")}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => setRetry((n) => n + 1)}
          >
            {t("orders.actions.retry")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
