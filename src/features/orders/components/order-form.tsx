"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { WarehousePicker } from "@/features/master-data";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { formatDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createOrderApi, getOrderApi, updateOrderApi } from "../api/orders.api";
import type { OrderDetail } from "../schemas/order.schema";
import { createIdempotencyKey } from "../utils/idempotency";
import { canCreateOrder, canEditOrder } from "../utils/order-actions";
import { resolveOrderError } from "../utils/order-errors";
import {
  EMPTY_FORM_ERRORS,
  emptyOrderForm,
  hasFormErrors,
  orderToFormValues,
  toCreateOrderInput,
  toUpdateOrderInput,
  validateOrderForm,
  type OrderFormErrors,
  type OrderFormValues,
} from "../utils/order-form";
import { computeLoadPreview } from "../utils/load-preview";
import { CustomerAddressSelect, formatAddressLine } from "./customer-address-select";
import { CustomerPicker } from "./customer-picker";
import { OrderLinesEditor } from "./order-lines-editor";
import { VersionConflictDialog } from "./version-conflict-dialog";

/** Returning `null` means the submit was a no-op and the form stays open. */
type SubmitOrder = (values: OrderFormValues) => Promise<OrderDetail | null>;

interface OrderFormProps {
  initialValues: OrderFormValues;
  /** Shown when the order's saved address is no longer selectable. */
  currentAddressLabel?: string;
  submitLabel: string;
  backHref: string;
  onSubmit: SubmitOrder;
  onSaved: (order: OrderDetail) => void;
  onVersionConflict?: () => void;
}

const FIELD_IDS = {
  customerId: "order-customer",
  deliveryAddressId: "order-delivery-address",
} as const;

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

function OrderForm({
  initialValues,
  currentAddressLabel,
  submitLabel,
  backHref,
  onSubmit,
  onSaved,
  onVersionConflict,
}: OrderFormProps) {
  const { t, locale } = useTranslation();
  const [values, setValues] = useState<OrderFormValues>(initialValues);
  const [errors, setErrors] = useState<OrderFormErrors>(EMPTY_FORM_ERRORS);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const preview = useMemo(() => computeLoadPreview(values.lines), [values.lines]);
  const keepsSavedAddress =
    values.customerId === initialValues.customerId &&
    values.deliveryAddressId === initialValues.deliveryAddressId;

  const clearFieldError = (field: keyof OrderFormErrors["fields"]) => {
    setErrors((current) =>
      current.fields[field]
        ? { ...current, fields: { ...current.fields, [field]: undefined } }
        : current
    );
  };

  const changeCustomer = (customerId: string) => {
    setValues((current) =>
      current.customerId === customerId
        ? current
        : { ...current, customerId, deliveryAddressId: "" }
    );
    clearFieldError("customerId");
    clearFieldError("deliveryAddressId");
  };

  const applyServerError = (cause: unknown) => {
    const resolved = resolveOrderError(cause, t);
    if (resolved.reason === "ORDER_VERSION_CONFLICT" && onVersionConflict) {
      onVersionConflict();
      return;
    }
    if (resolved.field) {
      setErrors({ fields: { [resolved.field]: resolved.message }, lines: {} });
      return;
    }
    const line = resolved.lineIndex === null ? undefined : values.lines[resolved.lineIndex];
    if (line) {
      setErrors({ fields: {}, lines: { [line.key]: { productId: resolved.message } } });
      return;
    }
    setFormError(resolved.message);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setFormError(null);

    const validation = validateOrderForm(values, t);
    setErrors(validation);
    if (hasFormErrors(validation)) return;

    setIsSubmitting(true);
    try {
      const saved = await onSubmit(values);
      if (saved) onSaved(saved);
    } catch (cause) {
      applyServerError(cause);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {formError ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("orders.form.headerSection")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor={FIELD_IDS.customerId}>{t("orders.form.customer")}</Label>
            <CustomerPicker
              id={FIELD_IDS.customerId}
              value={values.customerId}
              onChange={changeCustomer}
              placeholder={t("orders.form.customerPlaceholder")}
              disabled={isSubmitting}
              invalid={Boolean(errors.fields.customerId)}
              className="w-full"
            />
            <FieldError message={errors.fields.customerId} />
          </div>
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor={FIELD_IDS.deliveryAddressId}>
              {t("orders.form.deliveryAddress")}
            </Label>
            <CustomerAddressSelect
              id={FIELD_IDS.deliveryAddressId}
              customerId={values.customerId}
              value={values.deliveryAddressId}
              onChange={(deliveryAddressId) => {
                setValues((current) => ({ ...current, deliveryAddressId }));
                clearFieldError("deliveryAddressId");
              }}
              currentAddressLabel={keepsSavedAddress ? currentAddressLabel : undefined}
              disabled={isSubmitting}
              invalid={Boolean(errors.fields.deliveryAddressId)}
            />
            <FieldError message={errors.fields.deliveryAddressId} />
          </div>
          <div className="min-w-0 space-y-1.5">
            <Label>{t("orders.form.warehouse")}</Label>
            <WarehousePicker
              value={values.warehouseId}
              onChange={(warehouseId) => {
                setValues((current) => ({ ...current, warehouseId }));
                clearFieldError("warehouseId");
              }}
              placeholder={t("orders.form.warehousePlaceholder")}
              disabled={isSubmitting}
              className={cn("w-full", errors.fields.warehouseId && "border-destructive")}
            />
            <FieldError message={errors.fields.warehouseId} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("orders.form.linesSection")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <OrderLinesEditor
            lines={values.lines}
            errors={errors.lines}
            disabled={isSubmitting}
            onChange={(lines) => {
              setValues((current) => ({ ...current, lines }));
              clearFieldError("lines");
            }}
          />
          <FieldError message={errors.fields.lines} />
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {t("orders.form.loadPreview")}
            </p>
            <dl className="grid gap-3 sm:grid-cols-3">
              <PreviewValue label={t("orders.detail.totalQuantity")}>
                {formatDecimal(preview.totalQuantity, locale)}
              </PreviewValue>
              <PreviewValue label={t("orders.detail.totalWeight")}>
                {formatDecimal(preview.totalWeight, locale)}
              </PreviewValue>
              <PreviewValue label={t("orders.detail.totalVolume")}>
                {formatDecimal(preview.totalVolume, locale)}
              </PreviewValue>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("orders.form.loadPreviewHint")}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" asChild>
          <Link href={backHref}>{t("orders.actions.discard")}</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function PreviewValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm font-semibold">{children}</dd>
    </div>
  );
}

function ScreenHeader({
  title,
  description,
  backHref,
}: {
  title: string;
  description: string;
  backHref: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {t("orders.actions.back")}
      </Link>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function BlockedNotice({ title, message, backHref }: {
  title: string;
  message: string;
  backHref: string;
}) {
  const { t } = useTranslation();
  return (
    <Alert>
      <AlertTriangle />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{message}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href={backHref}>{t("orders.actions.back")}</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function OrderCreateScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { hasPermission } = useAuth();
  // One key per form session: retries of the same draft are deduplicated server-side.
  const [idempotencyKey] = useState(createIdempotencyKey);
  const [initialValues] = useState(emptyOrderForm);

  if (!canCreateOrder(hasPermission)) {
    return (
      <BlockedNotice
        title={t("orders.form.forbiddenTitle")}
        message={t("orders.form.forbiddenCreate")}
        backHref="/orders"
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <ScreenHeader
        title={t("orders.form.createTitle")}
        description={t("orders.form.createDescription")}
        backHref="/orders"
      />
      <OrderForm
        initialValues={initialValues}
        submitLabel={t("orders.actions.saveDraft")}
        backHref="/orders"
        onSubmit={(values) => createOrderApi(toCreateOrderInput(values), idempotencyKey)}
        onSaved={(order) => {
          toast.success(t("orders.toast.created", { orderNumber: order.orderNumber }));
          router.push(`/orders/${order.id}`);
        }}
      />
    </div>
  );
}

export function OrderEditScreen({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [reloadToken, setReloadToken] = useState(0);
  const [conflictOpen, setConflictOpen] = useState(false);
  const requestKey = `${orderId}|${reloadToken}`;
  const [result, setResult] = useState<{
    key: string;
    order: OrderDetail | null;
    failure: { cause: unknown } | null;
  } | null>(null);

  useEffect(() => {
    let active = true;
    getOrderApi(orderId)
      .then((order) => {
        if (active) setResult({ key: requestKey, order, failure: null });
      })
      .catch((cause) => {
        if (active) setResult({ key: requestKey, order: null, failure: { cause } });
      });
    return () => {
      active = false;
    };
  }, [orderId, requestKey]);

  const detailHref = `/orders/${orderId}`;
  const current = result?.key === requestKey ? result : null;

  if (!current) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (current.failure || !current.order) {
    return (
      <BlockedNotice
        title={t("orders.detail.loadFailedTitle")}
        message={resolveOrderError(current.failure?.cause, t).message}
        backHref="/orders"
      />
    );
  }

  const order = current.order;
  if (!canEditOrder(order.status, hasPermission, order.cancellationRequestedAt, order.dispatchGrantedAt)) {
    return (
      <BlockedNotice
        title={t("orders.form.notEditableTitle")}
        message={t("orders.form.notEditable", { orderNumber: order.orderNumber })}
        backHref={detailHref}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <ScreenHeader
        title={t("orders.form.editTitle", { orderNumber: order.orderNumber })}
        description={t("orders.form.editDescription")}
        backHref={detailHref}
      />
      <OrderForm
        // Remount on reload so the form restarts from the latest server state.
        key={`${order.id}|${order.version}|${reloadToken}`}
        initialValues={orderToFormValues(order)}
        currentAddressLabel={formatAddressLine(order.deliveryAddressSnapshot)}
        submitLabel={t("orders.actions.saveChanges")}
        backHref={detailHref}
        onSubmit={async (values) => {
          const patch = toUpdateOrderInput(order, values);
          if (!patch) {
            toast.info(t("orders.form.noChanges"));
            return null;
          }
          return updateOrderApi(order.id, patch);
        }}
        onSaved={(saved) => {
          toast.success(t("orders.toast.updated", { orderNumber: saved.orderNumber }));
          router.push(`/orders/${saved.id}`);
        }}
        onVersionConflict={() => setConflictOpen(true)}
      />
      <VersionConflictDialog
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        onReload={() => setReloadToken((value) => value + 1)}
      />
    </div>
  );
}
