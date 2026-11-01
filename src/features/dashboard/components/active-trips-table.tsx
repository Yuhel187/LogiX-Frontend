"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "@/lib/i18n";
import type { ActiveTripItem } from "../types/dashboard.types";

export interface ActiveTripsTableProps {
  trips: ActiveTripItem[];
}

export function ActiveTripsTable({ trips }: ActiveTripsTableProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            {t("dashboard.grids.activeTrips.title")}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {t("dashboard.grids.activeTrips.description")}
          </CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs">
          <Link href="/transport">
            {t("dashboard.grids.activeTrips.viewAll")}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {trips.length === 0 ? (
          <div className="flex h-40 items-center justify-center p-6 text-center text-xs text-muted-foreground">
            {t("dashboard.grids.activeTrips.empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-xs font-medium">
                    {t("dashboard.grids.activeTrips.tripCode")}
                  </TableHead>
                  <TableHead className="text-xs font-medium">
                    {t("dashboard.grids.activeTrips.driverVehicle")}
                  </TableHead>
                  <TableHead className="text-xs font-medium">
                    {t("dashboard.grids.activeTrips.progress")}
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium">
                    {t("dashboard.grids.activeTrips.status")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((trip) => {
                  const progressPct =
                    trip.totalStops > 0
                      ? Math.round((trip.completedStops / trip.totalStops) * 100)
                      : 0;

                  return (
                    <TableRow
                      key={trip.id}
                      className="border-border/40 hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        <Link
                          href="/transport"
                          className="hover:underline flex items-center gap-1"
                        >
                          {trip.tripCode}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">
                          {trip.driverName}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {trip.vehiclePlate}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-2">
                          <Progress
                            value={progressPct}
                            className="h-1.5 w-20 sm:w-24 bg-muted"
                          />
                          <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                            {trip.completedStops}/{trip.totalStops}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            trip.status === "IN_TRANSIT"
                              ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px]"
                              : "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px]"
                          }
                        >
                          {trip.status === "IN_TRANSIT" ? "Đang giao" : "Đã xuất bến"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
