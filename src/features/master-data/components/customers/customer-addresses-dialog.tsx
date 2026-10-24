"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";
import {
  MapPin,
  MoreVertical,
  Plus,
  Star,
  Phone,
  User,
  FileText,
} from "lucide-react";
import type { Customer, CustomerAddress } from "../../schemas/customer.schema";
import {
  listCustomerAddressesApi,
  setDefaultCustomerAddressApi,
  setCustomerAddressStatusApi,
} from "../../api/customers.api";
import { CustomerAddressFormDialog } from "./customer-address-form-dialog";

interface CustomerAddressesDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerAddressesDialog({
  customer,
  open,
  onOpenChange,
}: CustomerAddressesDialogProps) {
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(
    null
  );

  useEffect(() => {
    if (!open || !customer) return;
    let active = true;

    const timer = setTimeout(() => {
      setLoading(true);
      listCustomerAddressesApi(customer.id)
        .then((data) => {
          if (active) setAddresses(data);
        })
        .catch(() => {
          if (active) toast.error(t("common.error"));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, customer, reloadKey, t]);

  const handleSetDefault = async (addressId: string) => {
    if (!customer) return;
    try {
      await setDefaultCustomerAddressApi(customer.id, addressId);
      toast.success(t("masterData.customer.setDefaultSuccess"));
      setReloadKey((k) => k + 1);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleToggleStatus = async (
    addressId: string,
    action: "disable" | "enable"
  ) => {
    if (!customer) return;
    try {
      await setCustomerAddressStatusApi(customer.id, addressId, action);
      toast.success(t("masterData.actionSuccess"));
      setReloadKey((k) => k + 1);
    } catch {
      toast.error(t("common.error"));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between pr-6">
              <div>
                <DialogTitle className="text-xl">
                  {t("masterData.customer.addressesTitle", {
                    name: customer?.name ?? "",
                  })}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {t("masterData.customer.addressesDescription")}
                </DialogDescription>
              </div>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setEditingAddress(null);
                  setAddressFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                {t("masterData.customer.addAddress")}
              </Button>
            </div>

            {customer ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-2">
                <span>
                  <strong className="text-foreground">Mã:</strong>{" "}
                  <code className="font-mono">{customer.code}</code>
                </span>
                {customer.phone ? (
                  <span>
                    <strong className="text-foreground">SĐT:</strong>{" "}
                    {customer.phone}
                  </span>
                ) : null}
                {customer.taxCode ? (
                  <span>
                    <strong className="text-foreground">MST:</strong>{" "}
                    {customer.taxCode}
                  </span>
                ) : null}
                {customer.email ? (
                  <span>
                    <strong className="text-foreground">Email:</strong>{" "}
                    {customer.email}
                  </span>
                ) : null}
              </div>
            ) : null}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 space-y-3">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t("common.loading")}...
              </div>
            ) : addresses.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <MapPin className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-medium">
                  {t("masterData.customer.noAddresses")}
                </p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Thêm địa chỉ giao hàng để có thể tạo đơn hàng cho khách hàng này.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingAddress(null);
                    setAddressFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  {t("masterData.customer.addAddress")}
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {addresses.map((addr) => {
                  const isActive = addr.status === "ACTIVE";
                  const fullAddress = [
                    addr.addressLine,
                    addr.ward,
                    addr.district,
                    addr.province,
                  ]
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <Card
                      key={addr.id}
                      className={`relative border transition-all ${
                        addr.isDefault
                          ? "border-primary/50 shadow-sm bg-primary/[0.02]"
                          : "hover:border-muted-foreground/30"
                      } ${!isActive ? "opacity-60 bg-muted/30" : ""}`}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant={
                                addr.addressType === "SHIPPING"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-[10px] px-1.5 py-0 h-5"
                            >
                              {addr.addressType === "SHIPPING"
                                ? "Giao hàng"
                                : "Thanh toán"}
                            </Badge>

                            {addr.isDefault ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-5 border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1"
                              >
                                <Star className="h-2.5 w-2.5 fill-current" />
                                {t("masterData.customer.defaultBadge")}
                              </Badge>
                            ) : null}

                            {!isActive ? (
                              <Badge
                                variant="destructive"
                                className="text-[10px] px-1.5 py-0 h-5"
                              >
                                {t("masterData.statusInactive")}
                              </Badge>
                            ) : null}
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingAddress(addr);
                                  setAddressFormOpen(true);
                                }}
                              >
                                {t("common.edit")}
                              </DropdownMenuItem>

                              {isActive && !addr.isDefault ? (
                                <DropdownMenuItem
                                  onClick={() => handleSetDefault(addr.id)}
                                >
                                  {t("masterData.customer.setDefault")}
                                </DropdownMenuItem>
                              ) : null}

                              {isActive ? (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() =>
                                    handleToggleStatus(addr.id, "disable")
                                  }
                                >
                                  {t("masterData.disable")}
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleToggleStatus(addr.id, "enable")
                                  }
                                >
                                  {t("masterData.enable")}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {addr.label ? (
                          <div className="font-semibold text-sm">
                            {addr.label}
                          </div>
                        ) : null}

                        <div className="text-xs space-y-1.5 text-muted-foreground">
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>{addr.recipientName}</span>
                            {addr.phone ? (
                              <span className="flex items-center gap-1 text-muted-foreground ml-2">
                                <Phone className="h-3 w-3" />
                                {addr.phone}
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-start gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                            <span className="leading-snug">{fullAddress}</span>
                          </div>

                          {addr.latitude && addr.longitude ? (
                            <div className="font-mono text-[11px] text-muted-foreground/80 pl-5">
                              Tọa độ: {addr.latitude}, {addr.longitude}
                            </div>
                          ) : null}

                          {addr.deliveryNote ? (
                            <div className="flex items-start gap-1.5 text-muted-foreground/90 bg-muted/40 p-2 rounded text-[11px] mt-1.5">
                              <FileText className="h-3 w-3 shrink-0 mt-0.5" />
                              <span>{addr.deliveryNote}</span>
                            </div>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {customer ? (
        <CustomerAddressFormDialog
          open={addressFormOpen}
          onOpenChange={setAddressFormOpen}
          customerId={customer.id}
          address={editingAddress}
          onSaved={() => setReloadKey((k) => k + 1)}
        />
      ) : null}
    </>
  );
}
