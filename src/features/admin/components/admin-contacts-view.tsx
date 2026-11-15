"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FilterX,
  Headset,
  Loader2,
  Mail,
  MoreHorizontal,
  Phone,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { formatDateTime, formatDecimal } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";
import {
  adminErrorKey,
  listContactLeadsApi,
  updateContactLeadStatusApi,
} from "../api/admin.api";
import { useAdminListQuery } from "../hooks/use-admin-list-query";
import {
  ADMIN_PAGE_SIZES,
  ADMIN_SEARCH_MAX_LENGTH,
  CONTACT_LEAD_STATUSES,
  type ContactLeadStatus,
  type ContactNeedCategory,
} from "../schemas/admin.schema";
import type { ContactLeadItem, ContactLeadPage } from "../types/admin.types";
import { AdminContactEmailDialog } from "./admin-contact-email-dialog";

const SKELETON_ROWS = 5;
const SEARCH_DEBOUNCE_MS = 350;

function getNeedTitleKey(need: ContactNeedCategory): string {
  switch (need) {
    case "ORDER_FULFILLMENT":
      return "landing.demo.needs.ORDER_FULFILLMENT.title";
    case "INVENTORY_WAREHOUSE":
      return "landing.demo.needs.INVENTORY_WAREHOUSE.title";
    case "TRANSPORT_ROUTE":
      return "landing.demo.needs.TRANSPORT_ROUTE.title";
    case "DRIVER_DELIVERY":
      return "landing.demo.needs.DRIVER_DELIVERY.title";
    case "DEMAND_FORECAST":
      return "landing.demo.needs.DEMAND_FORECAST.title";
    case "ENTERPRISE_RBAC":
      return "landing.demo.needs.ENTERPRISE_RBAC.title";
    case "OTHER":
      return "landing.demo.needs.OTHER.title";
  }
}

function getStatusVariant(
  status: ContactLeadStatus,
): "default" | "secondary" | "outline" {
  switch (status) {
    case "NEW":
      return "default";
    case "CONTACTED":
    case "QUALIFIED":
      return "secondary";
    case "ARCHIVED":
      return "outline";
  }
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AdminContactsView() {
  const { isAuthenticated, isLoading: authLoading, isSuperAdmin } = useAuth();
  const { t, locale } = useTranslation();
  const number = (value: number) => formatDecimal(String(value), locale);
  const { query, update, reset } = useAdminListQuery("contacts");
  const [search, setSearch] = useState(query?.q ?? "");
  const [syncedQ, setSyncedQ] = useState(query?.q);
  if (syncedQ !== query?.q) {
    setSyncedQ(query?.q);
    setSearch(query?.q ?? "");
  }

  const allowed = !authLoading && isAuthenticated && isSuperAdmin === true;
  const requestKey = `contacts:${JSON.stringify(query)}`;
  const [result, setResult] = useState<{
    key: string;
    page?: ContactLeadPage;
    errorKey?: string;
  } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [emailLead, setEmailLead] = useState<ContactLeadItem | null>(null);
  const active = useRef<AbortController | null>(null);

  const current = result?.key === requestKey ? result : null;
  const busy =
    allowed && query !== null && (!current || pendingKey === requestKey);
  const page = current?.page;
  const totalPages = page ? Math.ceil(page.total / page.pageSize) : 0;
  const outOfRange = page !== undefined && page.page > Math.max(1, totalPages);

  const reload = useCallback(() => {
    if (!allowed || !query) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setPendingKey(requestKey);
    listContactLeadsApi(query, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult({ key: requestKey, page: data });
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setResult({ key: requestKey, errorKey: adminErrorKey(cause) });
        }
      })
      .finally(() => {
        if (active.current === controller) {
          active.current = null;
          setPendingKey(null);
        }
      });
  }, [allowed, query, requestKey]);

  useEffect(() => {
    const timer = window.setTimeout(reload, 0);
    return () => {
      window.clearTimeout(timer);
      active.current?.abort();
      active.current = null;
    };
  }, [reload]);

  useEffect(() => {
    const next = search.trim();
    if (!allowed || !query || next === query.q) return;
    const timer = window.setTimeout(
      () => update({ q: next }),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [search, query, update, allowed]);

  const applyLeadUpdate = useCallback((updatedLead: ContactLeadItem) => {
    setResult((prev) => {
      if (!prev?.page) return prev;
      return {
        ...prev,
        page: {
          ...prev.page,
          items: prev.page.items.map((item) =>
            item.id === updatedLead.id ? updatedLead : item,
          ),
        },
      };
    });
  }, []);

  const handleStatusChange = useCallback(
    async (
      lead: ContactLeadItem,
      nextStatus: ContactLeadStatus,
      silent = false,
    ) => {
      if (lead.status === nextStatus) return;
      setUpdatingId(lead.id);
      try {
        const updated = await updateContactLeadStatusApi(lead.id, nextStatus);
        applyLeadUpdate(updated);
        if (!silent) {
          toast.success(t("admin.contacts.statusUpdated"));
        }
      } catch (cause: unknown) {
        if (!silent) {
          toast.error(t(adminErrorKey(cause)));
        }
      } finally {
        setUpdatingId(null);
      }
    },
    [applyLeadUpdate, t],
  );

  const handleCopyText = useCallback(
    async (value: string, messageKey: string) => {
      try {
        await navigator.clipboard.writeText(value);
        toast.success(t(messageKey));
      } catch {
        // Ignore clipboard permission failures silently
      }
    },
    [t],
  );

  if (!allowed) return null;

  const errorKey = query ? current?.errorKey : "admin.errors.invalidQuery";
  const pageSizeOptions = [
    ...new Set<number>([
      ...ADMIN_PAGE_SIZES,
      ...(query ? [query.pageSize] : []),
    ]),
  ].sort((a, b) => a - b);

  const columns = [
    "contactPerson",
    "companyName",
    "needs",
    "status",
    "createdAt",
    "actions",
  ] as const;

  const renderLeadActions = (item: ContactLeadItem, compact = false) => {
    const isItemUpdating = updatingId === item.id;
    return (
      <div
        className={
          compact
            ? "flex flex-wrap items-center justify-end gap-2"
            : "inline-flex items-center justify-end gap-1.5 whitespace-nowrap"
        }
      >
        {item.phoneNumber ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-medium"
            asChild
            onClick={() => {
              if (item.status === "NEW") {
                void handleStatusChange(item, "CONTACTED", true);
              }
            }}
          >
            <a
              href={`tel:${item.phoneNumber}`}
              aria-label={`${t("admin.contacts.quickCall")}: ${item.phoneNumber}`}
            >
              <Phone className="size-3.5 text-primary" aria-hidden="true" />
              <span>{t("admin.contacts.quickCall")}</span>
            </a>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-medium"
            disabled
            title={t("admin.contacts.quickCallDisabled")}
          >
            <Phone className="size-3.5" aria-hidden="true" />
            <span>{t("admin.contacts.quickCall")}</span>
          </Button>
        )}

        <Button
          type="button"
          variant="default"
          size="sm"
          className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-medium"
          onClick={() => setEmailLead(item)}
        >
          <Mail className="size-3.5" aria-hidden="true" />
          <span>{t("admin.contacts.quickEmail")}</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="size-8 shrink-0 rounded-lg"
              disabled={isItemUpdating}
              aria-label={t("admin.contacts.statusMenuLabel", {
                name: item.fullName,
              })}
            >
              {isItemUpdating ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <MoreHorizontal className="size-4" aria-hidden="true" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              {t("admin.columns.status")}
            </DropdownMenuLabel>
            {CONTACT_LEAD_STATUSES.map((statusOption) => (
              <DropdownMenuItem
                key={statusOption}
                disabled={item.status === statusOption || isItemUpdating}
                onSelect={() => {
                  void handleStatusChange(item, statusOption);
                }}
              >
                <Check
                  className={
                    item.status === statusOption
                      ? "size-4 text-primary"
                      : "size-4 opacity-0"
                  }
                  aria-hidden="true"
                />
                <span>{t(`admin.status.${statusOption}`)}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                void handleCopyText(item.email, "admin.contacts.copiedEmail");
              }}
            >
              <Copy className="size-4" aria-hidden="true" />
              <span>{t("admin.contacts.copyEmail")}</span>
            </DropdownMenuItem>
            {item.phoneNumber ? (
              <DropdownMenuItem
                onSelect={() => {
                  if (item.phoneNumber) {
                    void handleCopyText(
                      item.phoneNumber,
                      "admin.contacts.copiedPhone",
                    );
                  }
                }}
              >
                <Copy className="size-4" aria-hidden="true" />
                <span>{t("admin.contacts.copyPhone")}</span>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <PageShell
      className="@container min-w-0"
      aria-label={t("admin.contacts.title")}
    >
      <PageHeader
        title={t("admin.contacts.title")}
        description={t("admin.contacts.description")}
        actions={
          <Button variant="outline" onClick={reload} disabled={busy || !query}>
            <RefreshCw className={busy ? "size-4 animate-spin" : "size-4"} />
            {t("admin.actions.refresh")}
          </Button>
        }
      />

      <div className="grid min-w-0 grid-cols-1 items-end gap-3 rounded-xl border border-border/70 bg-card p-4 @xl:grid-cols-[minmax(0,1fr)_14rem_auto]">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor="admin-contacts-search">
            {t("admin.filters.search")}
          </Label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="admin-contacts-search"
              type="search"
              value={search}
              maxLength={ADMIN_SEARCH_MAX_LENGTH}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("admin.contacts.searchPlaceholder")}
              className="h-10 rounded-lg bg-background pl-9"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-contacts-status">
            {t("admin.columns.status")}
          </Label>
          <Select
            value={query?.status || "all"}
            onValueChange={(value) =>
              update({ status: value === "all" ? "" : value })
            }
          >
            <SelectTrigger
              id="admin-contacts-status"
              className="h-10 w-full rounded-lg bg-background px-3 data-[size=default]:h-10"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("admin.filters.allStatuses")}
              </SelectItem>
              {CONTACT_LEAD_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`admin.status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-lg px-3.5"
          onClick={() => {
            setSearch("");
            reset();
          }}
        >
          <FilterX aria-hidden="true" className="size-4" />
          {t("admin.actions.reset")}
        </Button>
      </div>

      {errorKey ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{t(errorKey)}</span>
            <div className="flex flex-wrap gap-2">
              {query ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={reload}
                >
                  {t("admin.actions.retry")}
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={reset}>
                  {t("admin.actions.reset")}
                </Button>
              )}
              {errorKey === "admin.errors.unauthorized" ? (
                <Button asChild size="sm">
                  <Link href="/login">{t("admin.actions.login")}</Link>
                </Button>
              ) : null}
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <section
        aria-busy={busy}
        aria-label={t("admin.contacts.title")}
        className="min-w-0"
      >
        {busy ? (
          <div
            role="status"
            aria-label={t("admin.loading")}
            className="space-y-3 rounded-lg border p-4"
          >
            <span className="sr-only">{t("admin.loading")}</span>
            {Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : page?.items.length === 0 ? (
          <Empty className="rounded-lg border py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Headset />
              </EmptyMedia>
              <EmptyTitle>
                {t(
                  outOfRange
                    ? "admin.empty.outOfRangeTitle"
                    : "admin.contacts.emptyTitle",
                )}
              </EmptyTitle>
              <EmptyDescription>
                {t(
                  outOfRange
                    ? "admin.empty.outOfRangeDescription"
                    : "admin.contacts.emptyDescription",
                )}
              </EmptyDescription>
            </EmptyHeader>
            {outOfRange ? (
              <Button variant="outline" onClick={() => update({ page: "1" })}>
                {t("admin.pagination.first")}
              </Button>
            ) : null}
          </Empty>
        ) : page ? (
          <>
            <div className="hidden overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs @[64rem]:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    {columns.map((column) => (
                      <TableHead
                        key={column}
                        className={`h-11 px-4 text-[11px] font-semibold uppercase tracking-wider ${
                          column === "actions" ? "text-right" : ""
                        }`}
                      >
                        {t(`admin.columns.${column}`)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {page.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="min-w-[14rem] px-4 py-3.5 align-top whitespace-normal">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="size-9 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                              {getInitials(item.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 space-y-0.5">
                            <p className="break-words text-sm font-semibold leading-snug text-foreground">
                              {item.fullName}
                            </p>
                            <p
                              className="truncate text-xs text-muted-foreground"
                              title={item.email}
                            >
                              {item.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="min-w-[10.5rem] px-4 py-3.5 align-top whitespace-normal">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-sm font-medium leading-snug text-foreground">
                            <Building2
                              className="size-3.5 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                            <span className="break-words">
                              {item.companyName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                            <Phone
                              className="size-3 shrink-0"
                              aria-hidden="true"
                            />
                            <span>
                              {item.phoneNumber || t("admin.account.noPhone")}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="max-w-72 px-4 py-3.5 align-top whitespace-normal">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {item.needs.map((need) => (
                              <Badge
                                key={need}
                                variant="outline"
                                className="rounded-md bg-muted/40 px-2 py-0.5 text-[11px] font-medium"
                              >
                                {t(getNeedTitleKey(need))}
                              </Badge>
                            ))}
                          </div>
                          {item.otherNeedDetail ? (
                            <div className="rounded-lg border border-border/70 bg-muted/35 p-2.5 text-xs">
                              <p className="font-semibold text-foreground">
                                {t("admin.contacts.otherNeedLabel")}:
                              </p>
                              <p className="mt-0.5 whitespace-pre-wrap break-words text-muted-foreground">
                                {item.otherNeedDetail}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell className="min-w-[11rem] px-4 py-3.5 align-top whitespace-normal">
                        <div className="space-y-1">
                          <Badge variant={getStatusVariant(item.status)}>
                            {t(`admin.status.${item.status}`)}
                          </Badge>
                          {item.contactedByUser ? (
                            <p className="text-[11px] leading-snug text-muted-foreground">
                              {t("admin.contacts.contactedBy", {
                                name: item.contactedByUser.displayName,
                              })}
                            </p>
                          ) : null}
                          {item.contactedAt ? (
                            <p className="text-[11px] leading-snug tabular-nums text-muted-foreground">
                              {t("admin.contacts.contactedAt", {
                                time: formatDateTime(item.contactedAt, locale),
                              })}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3.5 align-top text-xs tabular-nums whitespace-nowrap text-muted-foreground">
                        {formatDateTime(item.createdAt, locale)}
                      </TableCell>

                      <TableCell className="w-1 px-4 py-3.5 align-top text-right whitespace-nowrap">
                        {renderLeadActions(item, false)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="grid min-w-0 gap-4 @xl:grid-cols-2 @[64rem]:hidden">
              {page.items.map((item) => (
                <li
                  key={item.id}
                  className="min-w-0 space-y-4 rounded-xl border border-border/70 bg-card p-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-10 shrink-0">
                        <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                          {getInitials(item.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-foreground">
                          {item.fullName}
                        </p>
                        <p className="break-all text-xs text-muted-foreground">
                          {item.email}
                        </p>
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(item.status)}>
                      {t(`admin.status.${item.status}`)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t pt-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">
                        {t("admin.columns.companyName")}
                      </p>
                      <p className="mt-1 break-words font-medium text-foreground">
                        {item.companyName}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        {t("admin.columns.phoneNumber")}
                      </p>
                      <p className="mt-1 break-words font-medium text-foreground">
                        {item.phoneNumber || t("admin.account.noPhone")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("admin.columns.needs")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.needs.map((need) => (
                        <Badge
                          key={need}
                          variant="outline"
                          className="text-[11px]"
                        >
                          {t(getNeedTitleKey(need))}
                        </Badge>
                      ))}
                    </div>
                    {item.otherNeedDetail ? (
                      <div className="rounded-lg border border-border/70 bg-muted/35 p-2.5 text-xs">
                        <p className="font-semibold text-foreground">
                          {t("admin.contacts.otherNeedLabel")}:
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-muted-foreground">
                          {item.otherNeedDetail}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
                    <span>{formatDateTime(item.createdAt, locale)}</span>
                    {item.contactedByUser ? (
                      <span>
                        {t("admin.contacts.contactedBy", {
                          name: item.contactedByUser.displayName,
                        })}
                      </span>
                    ) : null}
                  </div>

                  <div className="border-t pt-3">{renderLeadActions(item, true)}</div>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      {page && !busy ? (
        <nav
          aria-label={t("admin.pagination.label")}
          className="flex flex-col gap-3 border-t pt-4"
          aria-live="polite"
        >
          <p className="text-sm text-muted-foreground">
            {t("admin.pagination.range", {
              from: number(
                page.items.length ? (page.page - 1) * page.pageSize + 1 : 0,
              ),
              to: number(
                page.items.length
                  ? (page.page - 1) * page.pageSize + page.items.length
                  : 0,
              ),
              total: number(page.total),
            })}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="admin-contacts-page-size">
                {t("admin.pagination.pageSize")}
              </Label>
              <Select
                value={String(page.pageSize)}
                onValueChange={(value) => update({ pageSize: value })}
              >
                <SelectTrigger id="admin-contacts-page-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {number(size)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-sm">
              {totalPages === 0
                ? t("admin.pagination.noPages")
                : t("admin.pagination.page", {
                    page: number(page.page),
                    totalPages: number(totalPages),
                  })}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={busy || page.page <= 1}
                onClick={() => update({ page: String(page.page - 1) })}
              >
                <ChevronLeft className="size-4" />
                {t("admin.pagination.previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busy || page.page >= totalPages}
                onClick={() => update({ page: String(page.page + 1) })}
              >
                {t("admin.pagination.next")}
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </nav>
      ) : null}

      <AdminContactEmailDialog
        lead={emailLead}
        open={Boolean(emailLead)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEmailLead(null);
          }
        }}
        onLeadUpdated={applyLeadUpdate}
      />
    </PageShell>
  );
}

