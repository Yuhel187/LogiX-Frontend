"use client";

import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n";
import type { RecordStatus } from "../../schemas/common.schema";

export interface ResourceColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export interface ResourceRowAction<T> {
  label: string;
  onSelect: (row: T) => void;
  hidden?: (row: T) => boolean;
  destructive?: boolean;
}

interface ResourceTableProps<T extends { id: string; status: RecordStatus }> {
  rows: T[];
  columns: ResourceColumn<T>[];
  actions: ResourceRowAction<T>[];
  isLoading: boolean;
  emptyMessage: string;
}

export function ResourceTable<T extends { id: string; status: RecordStatus }>({
  rows,
  columns,
  actions,
  isLoading,
  emptyMessage,
}: ResourceTableProps<T>) {
  const { t } = useTranslation();
  const columnCount = columns.length + 2;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
            <TableHead className="w-32">
              {t("masterData.columnStatus")}
            </TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`skeleton-${index}`}>
                {Array.from({ length: columnCount }).map((__, cell) => (
                  <TableCell key={`skeleton-${index}-${cell}`}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.cell(row)}
                  </TableCell>
                ))}
                <TableCell>
                  <Badge
                    variant={row.status === "ACTIVE" ? "default" : "secondary"}
                  >
                    {row.status === "ACTIVE"
                      ? t("masterData.statusActive")
                      : t("masterData.statusInactive")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <RowActions row={row} actions={actions} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function RowActions<T>({
  row,
  actions,
}: {
  row: T;
  actions: ResourceRowAction<T>[];
}) {
  const { t } = useTranslation();
  const visible = actions.filter((action) => !action.hidden?.(row));

  if (visible.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("masterData.actions")}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {visible.map((action) => (
          <DropdownMenuItem
            key={action.label}
            onSelect={() => action.onSelect(row)}
            variant={action.destructive ? "destructive" : "default"}
          >
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
