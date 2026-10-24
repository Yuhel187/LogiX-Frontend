"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  FilterX,
  Users,
} from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { PageHeader } from "@/components/shared/page-header";
import { OrgLogo } from "@/components/shared/org-fallback-icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { formatDateTime, formatDecimal } from "@/lib/format";
import {
  adminErrorKey,
  listOrganizationsApi,
  listUsersApi,
} from "../api/admin.api";
import { useAdminListQuery } from "../hooks/use-admin-list-query";
import {
  ADMIN_PAGE_SIZES,
  ADMIN_SEARCH_MAX_LENGTH,
  ORGANIZATION_STATUSES,
  USER_STATUSES,
} from "../schemas/admin.schema";
import type {
  AdminListKind,
  AdminPage,
  OrganizationPage,
} from "../types/admin.types";
import { AdminUserActions } from "./admin-user-actions";

const SKELETON_ROWS = 5;
const SEARCH_DEBOUNCE_MS = 350;

function AdminPerson({
  person,
}: {
  person: { displayName: string; email: string; avatarUrl: string | null };
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-10 shrink-0">
        {person.avatarUrl ? (
          <AvatarImage src={person.avatarUrl} alt="" />
        ) : null}
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          {person.displayName
            .trim()
            .split(/\s+/)
            .map((part) => part[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="break-words font-semibold text-foreground">
          {person.displayName}
        </p>
        <p className="break-all text-xs text-muted-foreground">
          {person.email}
        </p>
      </div>
    </div>
  );
}

export function AdminListView({
  kind,
  organizationAction,
}: {
  kind: AdminListKind;
  organizationAction?: (
    organization: OrganizationPage["items"][number],
  ) => ReactNode;
}) {
  const { isAuthenticated, isLoading: authLoading, isSuperAdmin } = useAuth();
  const { t, locale } = useTranslation();
  const number = (value: number) => formatDecimal(String(value), locale);
  const { query, update, reset } = useAdminListQuery(kind);
  const [search, setSearch] = useState(query?.q ?? "");
  const [syncedQ, setSyncedQ] = useState(query?.q);
  if (syncedQ !== query?.q) {
    setSyncedQ(query?.q);
    setSearch(query?.q ?? "");
  }
  const allowed = !authLoading && isAuthenticated && isSuperAdmin === true;
  const requestKey = `${kind}:${JSON.stringify(query)}`;
  const [result, setResult] = useState<{
    key: string;
    page?: AdminPage;
    errorKey?: string;
  } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const active = useRef<AbortController | null>(null);
  const current = result?.key === requestKey ? result : null;
  const busy =
    allowed && query !== null && (!current || pendingKey === requestKey);
  const page = current?.page;
  const totalPages = page ? Math.ceil(page.total / page.pageSize) : 0;
  const outOfRange = page !== undefined && page.page > Math.max(1, totalPages);
  const Icon = kind === "organizations" ? Building2 : Users;

  const reload = useCallback(() => {
    if (!allowed || !query) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setPendingKey(requestKey);
    const operation =
      kind === "organizations" ? listOrganizationsApi : listUsersApi;
    operation(query, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setResult({ key: requestKey, page: data });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setResult({ key: requestKey, errorKey: adminErrorKey(cause) });
      })
      .finally(() => {
        if (active.current === controller) {
          active.current = null;
          setPendingKey(null);
        }
      });
  }, [allowed, kind, query, requestKey]);

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

  if (!allowed) return null;

  const statusBadge = (status: string) => (
    <Badge
      variant={
        status === "ACTIVE"
          ? "secondary"
          : status === "DISABLED"
            ? "outline"
            : "destructive"
      }
    >
      {t(`admin.status.${status}`)}
    </Badge>
  );
  const errorKey = query ? current?.errorKey : "admin.errors.invalidQuery";
  const pageSizeOptions = [
    ...new Set<number>([
      ...ADMIN_PAGE_SIZES,
      ...(query ? [query.pageSize] : []),
    ]),
  ].sort((a, b) => a - b);
  const columns =
    kind === "organizations"
      ? [
          "organization",
          "owner",
          "status",
          "createdAt",
          "updatedAt",
          ...(organizationAction ? ["actions"] : []),
        ]
      : [
          "user",
          "phoneNumber",
          "status",
          "accountType",
          "tenantCount",
          "lastLoginAt",
          "createdAt",
          "actions",
        ];

  return (
    <PageShell
      className="@container min-w-0"
      aria-label={t(`admin.${kind}.title`)}
    >
      <PageHeader
        title={t(`admin.${kind}.title`)}
        description={t(`admin.${kind}.description`)}
        actions={
          <Button variant="outline" onClick={reload} disabled={busy || !query}>
            <RefreshCw className={busy ? "size-4 animate-spin" : "size-4"} />
            {t("admin.actions.refresh")}
          </Button>
        }
      />
      <div className="grid min-w-0 grid-cols-1 items-end gap-3 rounded-xl border border-border/70 bg-card p-4 @xl:grid-cols-[minmax(0,1fr)_12rem_auto]">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="admin-search">{t("admin.filters.search")}</Label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="admin-search"
              type="search"
              value={search}
              maxLength={ADMIN_SEARCH_MAX_LENGTH}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t(`admin.${kind}.searchPlaceholder`)}
              className="h-10 rounded-lg bg-background pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-status">{t("admin.columns.status")}</Label>
          <Select
            value={query?.status || "all"}
            onValueChange={(value) =>
              update({ status: value === "all" ? "" : value })
            }
          >
            <SelectTrigger
              id="admin-status"
              className="h-10 w-full rounded-lg bg-background"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("admin.filters.allStatuses")}
              </SelectItem>
              {(kind === "organizations"
                ? ORGANIZATION_STATUSES
                : USER_STATUSES
              ).map((status) => (
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
          className="h-10 rounded-lg"
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
        aria-label={t(`admin.${kind}.title`)}
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
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : page?.items.length === 0 ? (
          <Empty className="rounded-lg border py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Icon />
              </EmptyMedia>
              <EmptyTitle>
                {t(
                  outOfRange
                    ? "admin.empty.outOfRangeTitle"
                    : "admin.empty.title",
                )}
              </EmptyTitle>
              <EmptyDescription>
                {t(
                  outOfRange
                    ? "admin.empty.outOfRangeDescription"
                    : "admin.empty.description",
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
                        className={`h-12 px-4 text-[11px] font-semibold uppercase tracking-wider ${column === "actions" ? "text-right" : ""}`}
                      >
                        {t(`admin.columns.${column}`)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {page.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-64 px-4 py-4 whitespace-normal">
                        {"code" in item ? (
                          <div className="flex items-center gap-3">
                            <OrgLogo
                              name={item.name}
                              logoUrl={item.logoUrl}
                              size="md"
                            />
                            <div className="min-w-0">
                              <p className="break-words font-semibold">
                                {item.name}
                              </p>
                              <p className="break-all text-xs text-muted-foreground">
                                {item.code}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <AdminPerson person={item} />
                        )}
                      </TableCell>
                      {"code" in item ? (
                        <TableCell className="max-w-60 px-4 whitespace-normal">
                          {item.owner ? (
                            <AdminPerson person={item.owner} />
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {t("admin.account.noOwner")}
                            </span>
                          )}
                        </TableCell>
                      ) : (
                        <TableCell className="px-4 text-sm">
                          {item.phoneNumber || t("admin.account.noPhone")}
                        </TableCell>
                      )}
                      <TableCell className="px-4">
                        {statusBadge(item.status)}
                      </TableCell>
                      {"isSuperAdmin" in item ? (
                        <>
                          <TableCell className="px-4">
                            <Badge variant="outline">
                              {t(
                                item.isSuperAdmin
                                  ? "admin.account.superAdmin"
                                  : "admin.account.standard",
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 tabular-nums">
                            {number(item.tenantCount)}
                          </TableCell>
                          <TableCell className="px-4 text-xs whitespace-normal text-muted-foreground">
                            {item.lastLoginAt
                              ? formatDateTime(item.lastLoginAt, locale)
                              : t("admin.account.neverLoggedIn")}
                          </TableCell>
                        </>
                      ) : null}
                      <TableCell className="px-4 text-xs whitespace-normal text-muted-foreground">
                        {formatDateTime(item.createdAt, locale)}
                      </TableCell>
                      {"code" in item ? (
                        <TableCell className="px-4 text-xs whitespace-normal text-muted-foreground">
                          {formatDateTime(item.updatedAt, locale)}
                        </TableCell>
                      ) : (
                        <TableCell className="px-4 text-right">
                          <AdminUserActions displayName={item.displayName} />
                        </TableCell>
                      )}
                      {"code" in item && organizationAction ? (
                        <TableCell className="px-4 text-right">
                          {organizationAction(item)}
                        </TableCell>
                      ) : null}
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
                  <div className="flex items-start justify-between gap-2">
                    {"code" in item ? (
                      <OrgLogo
                        name={item.name}
                        logoUrl={item.logoUrl}
                        size="sm"
                      />
                    ) : (
                      <div className="min-w-0 flex-1">
                        <AdminPerson person={item} />
                      </div>
                    )}
                    {"code" in item ? (
                      <div className="min-w-0 flex-1">
                        <h2 className="break-words font-medium">{item.name}</h2>
                        <p className="break-all text-sm text-muted-foreground">
                          {item.code}
                        </p>
                      </div>
                    ) : null}
                    {"isSuperAdmin" in item ? (
                      <AdminUserActions displayName={item.displayName} />
                    ) : null}
                  </div>
                  <div>{statusBadge(item.status)}</div>
                  {"code" in item ? (
                    <div className="space-y-2 border-t pt-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        {t("admin.columns.owner")}
                      </p>
                      {item.owner ? (
                        <AdminPerson person={item.owner} />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {t("admin.account.noOwner")}
                        </p>
                      )}
                    </div>
                  ) : null}
                  <dl className="grid grid-cols-2 gap-3 border-t pt-3 text-xs">
                    {"isSuperAdmin" in item ? (
                      <>
                        <div>
                          <dt className="text-muted-foreground">
                            {t("admin.columns.phoneNumber")}
                          </dt>
                          <dd className="mt-1 break-words">
                            {item.phoneNumber || t("admin.account.noPhone")}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">
                            {t("admin.columns.accountType")}
                          </dt>
                          <dd>
                            {t(
                              item.isSuperAdmin
                                ? "admin.account.superAdmin"
                                : "admin.account.standard",
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">
                            {t("admin.columns.tenantCount")}
                          </dt>
                          <dd>{number(item.tenantCount)}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">
                            {t("admin.columns.lastLoginAt")}
                          </dt>
                          <dd>
                            {item.lastLoginAt
                              ? formatDateTime(item.lastLoginAt, locale)
                              : t("admin.account.neverLoggedIn")}
                          </dd>
                        </div>
                      </>
                    ) : null}
                    <div>
                      <dt className="text-muted-foreground">
                        {t("admin.columns.createdAt")}
                      </dt>
                      <dd>{formatDateTime(item.createdAt, locale)}</dd>
                    </div>
                    {"code" in item ? (
                      <div>
                        <dt className="text-muted-foreground">
                          {t("admin.columns.updatedAt")}
                        </dt>
                        <dd>{formatDateTime(item.updatedAt, locale)}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {"code" in item && organizationAction
                    ? organizationAction(item)
                    : null}
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
              <Label htmlFor="admin-page-size">
                {t("admin.pagination.pageSize")}
              </Label>
              <Select
                value={String(page.pageSize)}
                onValueChange={(value) => update({ pageSize: value })}
              >
                <SelectTrigger id="admin-page-size">
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
    </PageShell>
  );
}
