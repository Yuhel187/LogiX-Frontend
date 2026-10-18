"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductPicker, type Product } from "@/features/master-data";
import { useTranslation } from "@/lib/i18n";
import { formatDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  emptyLine,
  type LineErrors,
  type OrderLineDraft,
} from "../utils/order-form";

interface OrderLinesEditorProps {
  lines: OrderLineDraft[];
  errors: Record<string, LineErrors>;
  disabled?: boolean;
  onChange: (lines: OrderLineDraft[]) => void;
}

export function OrderLinesEditor({
  lines,
  errors,
  disabled = false,
  onChange,
}: OrderLinesEditorProps) {
  const { t, locale } = useTranslation();

  const updateLine = (key: string, changes: Partial<OrderLineDraft>) => {
    onChange(
      lines.map((line) => (line.key === key ? { ...line, ...changes } : line))
    );
  };

  const selectProduct = (key: string, productId: string, product?: Product) => {
    updateLine(key, {
      productId,
      unit: product?.baseUnit ?? "",
      unitWeight: product?.weight ?? "",
      unitVolume: product?.volume ?? "",
    });
  };

  const removeLine = (key: string) => {
    onChange(lines.filter((line) => line.key !== key));
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead className="min-w-[260px]">{t("orders.form.lineProduct")}</TableHead>
              <TableHead className="w-40">{t("orders.form.lineQuantity")}</TableHead>
              <TableHead className="w-20">{t("orders.form.lineUnit")}</TableHead>
              <TableHead className="text-right">{t("orders.form.lineUnitWeight")}</TableHead>
              <TableHead className="text-right">{t("orders.form.lineUnitVolume")}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, index) => {
              const lineErrors = errors[line.key];
              return (
                <TableRow key={line.key} className="align-top">
                  <TableCell className="pt-3 text-xs text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <ProductPicker
                      value={line.productId}
                      onChange={(productId, product) =>
                        selectProduct(line.key, productId, product)
                      }
                      placeholder={t("orders.form.productPlaceholder")}
                      disabled={disabled}
                      className={cn(
                        lineErrors?.productId && "border-destructive"
                      )}
                    />
                    {lineErrors?.productId ? (
                      <p className="mt-1 text-xs text-destructive">
                        {lineErrors.productId}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(line.key, { quantity: event.target.value })
                      }
                      aria-label={t("orders.form.lineQuantity")}
                      aria-invalid={Boolean(lineErrors?.quantity) || undefined}
                      disabled={disabled}
                    />
                    {lineErrors?.quantity ? (
                      <p className="mt-1 text-xs text-destructive">
                        {lineErrors.quantity}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="pt-3 text-xs">{line.unit}</TableCell>
                  <TableCell className="pt-3 text-right font-mono text-xs">
                    {line.unitWeight ? formatDecimal(line.unitWeight, locale) : null}
                  </TableCell>
                  <TableCell className="pt-3 text-right font-mono text-xs">
                    {line.unitVolume ? formatDecimal(line.unitVolume, locale) : null}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeLine(line.key)}
                      disabled={disabled || lines.length <= 1}
                      aria-label={t("orders.form.removeLine")}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...lines, emptyLine()])}
        disabled={disabled}
      >
        <Plus className="size-3.5" />
        {t("orders.form.addLine")}
      </Button>
    </div>
  );
}
