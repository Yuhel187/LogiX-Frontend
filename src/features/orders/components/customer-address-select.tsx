"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const placeholder = !customerId
    ? t("orders.form.addressNeedsCustomer")
    : isLoading
      ? t("common.loading")
      : addresses.length === 0 && !showCurrent
        ? t("orders.form.addressEmpty")
        : t("orders.form.addressPlaceholder");

  return (
    <div className="space-y-1">
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled || !customerId || isLoading}
      >
        <SelectTrigger
          id={id}
          aria-invalid={invalid || undefined}
          className={cn("w-full", invalid && "border-destructive")}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {showCurrent ? (
            <SelectItem value={value} disabled>
              {currentAddressLabel}
            </SelectItem>
          ) : null}
          {addresses.map((address) => (
            <SelectItem key={address.id} value={address.id}>
              <span className="flex flex-col text-left">
                <span className="font-medium">
                  {address.label || address.recipientName}
                  {address.isDefault
                    ? ` · ${t("orders.form.addressDefault")}`
                    : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatAddressLine(address)}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loadFailure ? (
        <p className="text-xs text-destructive">
          {resolveOrderError(loadFailure.cause, t).message}
        </p>
      ) : null}
    </div>
  );
}
