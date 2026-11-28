"use client";

import * as React from "react";
import { Filter, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n";
import {
  AUDIT_ACTOR_TYPES,
  AUDIT_OUTCOMES,
  AUDIT_SOURCE_SERVICES,
} from "../constants/audit-permissions";
import type {
  AuditActorType,
  AuditFilterParams,
  AuditOutcome,
} from "../types/audit.types";

const ALL_VALUE = "__ALL__";

interface AuditFilterBarProps {
  filters: AuditFilterParams;
  onApply: (next: AuditFilterParams) => void;
  onReset: () => void;
  disabled?: boolean;
}

function toDatetimeLocalValue(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(localValue: string): string | undefined {
  if (!localValue.trim()) return undefined;
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function AuditFilterBar({
  filters,
  onApply,
  onReset,
  disabled = false,
}: AuditFilterBarProps) {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = React.useState(() =>
    Boolean(
      filters.actorId ||
        filters.entityType ||
        filters.entityId ||
        filters.correlationId ||
        filters.from ||
        filters.to,
    ),
  );

  const [action, setAction] = React.useState(filters.action ?? "");
  const [outcome, setOutcome] = React.useState<string>(
    filters.outcome ?? ALL_VALUE,
  );
  const [actorType, setActorType] = React.useState<string>(
    filters.actorType ?? ALL_VALUE,
  );
  const [sourceService, setSourceService] = React.useState<string>(
    filters.sourceService ?? ALL_VALUE,
  );
  const [actorId, setActorId] = React.useState(filters.actorId ?? "");
  const [entityType, setEntityType] = React.useState(filters.entityType ?? "");
  const [entityId, setEntityId] = React.useState(filters.entityId ?? "");
  const [correlationId, setCorrelationId] = React.useState(
    filters.correlationId ?? "",
  );
  const [fromLocal, setFromLocal] = React.useState(() =>
    toDatetimeLocalValue(filters.from),
  );
  const [toLocal, setToLocal] = React.useState(() =>
    toDatetimeLocalValue(filters.to),
  );

  const hasActiveFilters = Boolean(
    filters.action ||
      filters.outcome ||
      filters.actorType ||
      filters.sourceService ||
      filters.actorId ||
      filters.entityType ||
      filters.entityId ||
      filters.correlationId ||
      filters.from ||
      filters.to,
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onApply({
      action: action.trim() || undefined,
      outcome:
        outcome !== ALL_VALUE ? (outcome as AuditOutcome) : undefined,
      actorType:
        actorType !== ALL_VALUE ? (actorType as AuditActorType) : undefined,
      sourceService:
        sourceService !== ALL_VALUE ? sourceService : undefined,
      actorId: actorId.trim() || undefined,
      entityType: entityType.trim() || undefined,
      entityId: entityId.trim() || undefined,
      correlationId: correlationId.trim() || undefined,
      from: fromDatetimeLocalValue(fromLocal),
      to: fromDatetimeLocalValue(toLocal),
      page: 1,
      limit: filters.limit,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-card p-4 space-y-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="audit-filter-action"
            className="text-xs font-medium leading-4 text-muted-foreground"
          >
            {t("audit.filters.action")}
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="audit-filter-action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder={t("audit.filters.actionPlaceholder")}
              className="h-9 pl-8"
              disabled={disabled}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="audit-filter-outcome"
            className="text-xs font-medium leading-4 text-muted-foreground"
          >
            {t("audit.filters.outcome")}
          </Label>
          <Select value={outcome} onValueChange={setOutcome} disabled={disabled}>
            <SelectTrigger id="audit-filter-outcome" className="h-9 w-full">
              <SelectValue placeholder={t("audit.filters.allOutcomes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>
                {t("audit.filters.allOutcomes")}
              </SelectItem>
              {AUDIT_OUTCOMES.map((item) => (
                <SelectItem key={item} value={item}>
                  {t(`audit.outcomes.${item}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="audit-filter-actor-type"
            className="text-xs font-medium leading-4 text-muted-foreground"
          >
            {t("audit.filters.actorType")}
          </Label>
          <Select
            value={actorType}
            onValueChange={setActorType}
            disabled={disabled}
          >
            <SelectTrigger id="audit-filter-actor-type" className="h-9 w-full">
              <SelectValue placeholder={t("audit.filters.allActorTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>
                {t("audit.filters.allActorTypes")}
              </SelectItem>
              {AUDIT_ACTOR_TYPES.map((item) => (
                <SelectItem key={item} value={item}>
                  {t(`audit.actorTypes.${item}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="audit-filter-service"
            className="text-xs font-medium leading-4 text-muted-foreground"
          >
            {t("audit.filters.sourceService")}
          </Label>
          <Select
            value={sourceService}
            onValueChange={setSourceService}
            disabled={disabled}
          >
            <SelectTrigger id="audit-filter-service" className="h-9 w-full">
              <SelectValue placeholder={t("audit.filters.allServices")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>
                {t("audit.filters.allServices")}
              </SelectItem>
              {AUDIT_SOURCE_SERVICES.map((svc) => (
                <SelectItem key={svc} value={svc}>
                  {svc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="audit-filter-correlation" className="text-xs font-medium leading-4 text-muted-foreground">
              {t("audit.filters.correlationId")}
            </Label>
            <Input
              id="audit-filter-correlation"
              value={correlationId}
              onChange={(e) => setCorrelationId(e.target.value)}
              placeholder={t("audit.filters.uuidPlaceholder")}
              className="h-9 font-mono text-xs"
              disabled={disabled}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="audit-filter-actor-id" className="text-xs font-medium leading-4 text-muted-foreground">
              {t("audit.filters.actorId")}
            </Label>
            <Input
              id="audit-filter-actor-id"
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              placeholder={t("audit.filters.uuidPlaceholder")}
              className="h-9 font-mono text-xs"
              disabled={disabled}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="audit-filter-entity-type" className="text-xs font-medium leading-4 text-muted-foreground">
              {t("audit.filters.entityType")}
            </Label>
            <Input
              id="audit-filter-entity-type"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              placeholder={t("audit.filters.entityTypePlaceholder")}
              className="h-9"
              disabled={disabled}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="audit-filter-entity-id" className="text-xs font-medium leading-4 text-muted-foreground">
              {t("audit.filters.entityId")}
            </Label>
            <Input
              id="audit-filter-entity-id"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder={t("audit.filters.uuidPlaceholder")}
              className="h-9 font-mono text-xs"
              disabled={disabled}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="audit-filter-from" className="text-xs font-medium leading-4 text-muted-foreground">
              {t("audit.filters.from")}
            </Label>
            <Input
              id="audit-filter-from"
              type="datetime-local"
              value={fromLocal}
              onChange={(e) => setFromLocal(e.target.value)}
              className="h-9"
              disabled={disabled}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="audit-filter-to" className="text-xs font-medium leading-4 text-muted-foreground">
              {t("audit.filters.to")}
            </Label>
            <Input
              id="audit-filter-to"
              type="datetime-local"
              value={toLocal}
              onChange={(e) => setToLocal(e.target.value)}
              className="h-9"
              disabled={disabled}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="h-9 gap-1.5 px-3"
          aria-expanded={showAdvanced}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          <span>{t("audit.filters.moreFilters")}</span>
        </Button>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              disabled={disabled}
              className="h-9 gap-1.5 px-3"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span>{t("audit.filters.reset")}</span>
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={disabled}
            className="h-9 gap-1.5 px-4"
          >
            <Filter className="size-3.5" aria-hidden="true" />
            <span>{t("audit.filters.apply")}</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
