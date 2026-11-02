"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "@/lib/i18n";
import { formatDecimal } from "@/lib/format";
import type { LowStockItem } from "../types/dashboard.types";

export interface LowStockAlertTableProps {
  items: LowStockItem[];
}

export function LowStockAlertTable({ items }: LowStockAlertTableProps) {
  const { t, locale } = useTranslation();

  return (
    <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            {t("dashboard.grids.lowStock.title")}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {t("dashboard.grids.lowStock.description")}
          </CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs">
          <Link href="/inventory">
            {t("dashboard.grids.lowStock.viewInventory")}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="flex h-40 items-center justify-center p-6 text-center text-xs text-muted-foreground">
            {t("dashboard.grids.lowStock.empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-xs font-medium">
                    {t("dashboard.grids.lowStock.skuCode")}
                  </TableHead>
                  <TableHead className="text-xs font-medium">
                    {t("dashboard.grids.lowStock.productName")}
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium">
                    {t("dashboard.grids.lowStock.availableSafety")}
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium">
                    {t("dashboard.grids.lowStock.action")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={`${item.warehouseName}-${item.productId}`}
                    className="border-border/40 hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="font-mono text-xs font-semibold text-rose-600 dark:text-rose-400">
                      {item.skuCode}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium text-foreground">
                        {item.productName}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {item.warehouseName}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                        {formatDecimal(String(item.availableQuantity), locale)}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}/ {formatDecimal(String(item.safetyStock), locale)} {item.unit}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-[11px] border-border/80 hover:border-primary hover:text-primary gap-1"
                      >
                        <Link href="/inventory">
                          <Plus className="h-3 w-3" />
                          {t("dashboard.grids.lowStock.reorder")}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
