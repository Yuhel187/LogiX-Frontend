"use client";

import { useEffect, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
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
import {
  listCustomerAddressesApi,
  type CustomerAddress,
} from "@/features/master-data";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { resolveOrderError } from "../utils/order-errors";

interface CustomerAddressSelectProps {
  id?: string;
  customerId: string;
  value: string;
  onChange: (addressId: string) => void;
  /**
   * Label for the order's current address when it is no longer selectable
   * (disabled or switched to billing after the order was drafted).
   */
  currentAddressLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
}

export function formatAddressLine(address: {
  addressLine: string;
  ward?: string | null;
  district?: string | null;
  province?: string | null;
}): string {
  return [address.addressLine, address.ward, address.district, address.province]
    .filter(Boolean)
    .join(", ");
}

/** Orders may only ship to ACTIVE SHIPPING addresses; anything else is rejected by the backend. */
function isDeliverable(address: CustomerAddress): boolean {
  return address.status === "ACTIVE" && address.addressType === "SHIPPING";
}

export function CustomerAddressSelect({
  id,
  customerId,
  value,
  onChange,
  currentAddressLabel,
  disabled = false,
  invalid = false,
}: CustomerAddressSelectProps) {
  const { t } = useTranslation();
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null);
  const [result, setResult] = useState<{
    customerId: string;
    addresses: CustomerAddress[];
    failure: { cause: unknown } | null;
  } | null>(null);

  const isLoading = Boolean(customerId) && result?.customerId !== customerId;
  const addresses =
    result?.customerId === customerId ? result.addresses : [];
  const loadFailure =
    result?.customerId === customerId ? result.failure : null;
  const isOpen =
    openCustomerId === customerId && Boolean(customerId) && !disabled && !isLoading;
  const showCurrent =
    Boolean(value && currentAddressLabel) &&
    !addresses.some((address) => address.id === value);

  useEffect(() => {
    if (!customerId) return;
    let active = true;
    listCustomerAddressesApi(customerId)
      .then((items) => {
        if (!active) return;
        setResult({
          customerId,
          addresses: items.filter(isDeliverable),
          failure: null,
        });
      })
      .catch((cause) => {
        if (!active) return;
        setResult({
          customerId,
          addresses: [],
          failure: { cause },
        });
      });
    return () => {
      active = false;
    };
  }, [customerId]);

  const addressTitle = (address: CustomerAddress) =>
    `${address.label || address.recipientName}${
      address.isDefault ? ` · ${t("orders.form.addressDefault")}` : ""
    }`;
  const selectedAddress = addresses.find((address) => address.id === value);
  // The trigger is one line tall; the full address is only shown in the list.
  const selectedLabel = selectedAddress
    ? addressTitle(selectedAddress)
    : showCurrent
      ? currentAddressLabel
      : undefined;

  const placeholder = !customerId
    ? t("orders.form.addressNeedsCustomer")
    : isLoading
      ? t("common.loading")
      : addresses.length === 0 && !showCurrent
        ? t("orders.form.addressEmpty")
        : t("orders.form.addressPlaceholder");

  return (
    <div className="min-w-0 space-y-1">
      <Popover
        modal={false}
        open={isOpen}
        onOpenChange={(open) => setOpenCustomerId(open ? customerId : null)}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-label={t("orders.form.deliveryAddress")}
            aria-expanded={isOpen}
            aria-invalid={invalid || undefined}
            disabled={disabled || !customerId || isLoading}
            className={cn(
              "h-8 w-full min-w-0 justify-between gap-2 font-normal",
              !selectedLabel && "text-muted-foreground",
              invalid && "border-destructive"
            )}
          >
            <span className="min-w-0 truncate">{selectedLabel || placeholder}</span>
            <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          collisionPadding={16}
          className="w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0"
        >
          <Command>
            <CommandInput
              aria-label={t("orders.form.addressSearch")}
              placeholder={t("orders.form.addressSearch")}
            />
            <CommandList className="max-h-[min(18rem,calc(var(--radix-popover-content-available-height)-3.5rem))] overscroll-contain">
              <CommandEmpty>{t(addresses.length === 0 ? "orders.form.addressEmpty" : "orders.form.addressNoResults")}</CommandEmpty>
              <CommandGroup>
                {showCurrent ? (
                  <CommandItem value={value} disabled>
                    <span className="min-w-0 whitespace-normal [overflow-wrap:anywhere]">{currentAddressLabel}</span>
                  </CommandItem>
                ) : null}
                {addresses.map((address) => (
                  <CommandItem
                    key={address.id}
                    value={address.id}
                    keywords={[addressTitle(address), formatAddressLine(address)]}
                    data-checked={address.id === value}
                    onSelect={() => {
                      onChange(address.id);
                      setOpenCustomerId(null);
                    }}
                    className="items-start py-2 [&>svg]:mt-0.5 [&>svg]:shrink-0"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 whitespace-normal text-left [overflow-wrap:anywhere]">
                      <span className="font-medium">{addressTitle(address)}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatAddressLine(address)}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {loadFailure ? (
        <p className="text-xs text-destructive">
          {resolveOrderError(loadFailure.cause, t).message}
        </p>
      ) : null}
    </div>
  );
}
