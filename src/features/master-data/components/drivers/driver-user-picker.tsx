"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  listEligibleDriverUsersApi,
} from "../../api/drivers.api";
import type { EligibleDriverUser } from "../../schemas/driver.schema";
import { resolveDriverErrorMessage } from "../../utils/driver-error-message";

interface DriverUserPickerProps {
  id?: string;
  value: string;
  selectedUser: EligibleDriverUser | null;
  onSelect: (user: EligibleDriverUser) => void;
  disabled?: boolean;
  error?: string;
}

export function DriverUserPicker({
  id,
  value,
  selectedUser,
  onSelect,
  disabled = false,
  error,
}: DriverUserPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [retry, setRetry] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    key: string;
    items: EligibleDriverUser[];
    page: number;
    pageSize: number;
    total: number;
  } | null>(null);
  const queryKey = `${query}|${page}`;
  const resultIsCurrent = result?.key === queryKey;
  const currentResult = resultIsCurrent ? result : null;

  React.useEffect(() => {
    if (!open) return;

    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setFailure(null);
      listEligibleDriverUsersApi({
        q: query.trim() || undefined,
        page,
        pageSize: 20,
      })
        .then((data) => {
          if (active) {
            setResult({ ...data, key: queryKey });
            setLoading(false);
          }
        })
        .catch((cause: unknown) => {
          if (active) {
            setFailure(resolveDriverErrorMessage(cause, t));
            setLoading(false);
          }
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, page, query, queryKey, retry, t]);

  const selectedLabel =
    (selectedUser?.id === value ? selectedUser.displayName : null) ||
    (value ? value : t("masterData.driver.userPlaceholder"));
  const resultPage = currentResult?.page ?? page;
  const resultPageSize = currentResult?.pageSize ?? 20;
  const total = currentResult?.total ?? 0;
  const isLoading = loading || (open && !failure && !resultIsCurrent);
  const lastPage = Math.max(1, Math.ceil(total / resultPageSize));

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={Boolean(error)}
            disabled={disabled}
            className={cn(
              "h-9 w-full justify-between font-normal",
              !value && "text-muted-foreground",
              error && "border-destructive"
            )}
          >
            <span className="truncate">{selectedLabel}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={t("masterData.driver.userSearchPlaceholder")}
              value={query}
              onValueChange={(nextQuery) => {
                setQuery(nextQuery);
                setPage(1);
              }}
            />
            <CommandList className="max-h-60">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  {t("masterData.working")}
                </div>
              ) : failure ? (
                <div className="space-y-2 p-3 text-sm" role="alert">
                  <p className="text-destructive">{failure}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRetry((current) => current + 1)}
                  >
                    {t("common.retry")}
                  </Button>
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    {t("masterData.driver.userEmpty")}
                  </CommandEmpty>
                  <CommandGroup>
                    {(currentResult?.items ?? []).map((user) => (
                      <CommandItem
                        key={user.id}
                        value={user.id}
                        onSelect={() => {
                          onSelect(user);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "size-4",
                            value === user.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="min-w-0">
                          <span className="block truncate">{user.displayName}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
          {!failure && resultIsCurrent && total > resultPageSize ? (
            <div className="flex items-center justify-between border-t p-2 text-xs text-muted-foreground">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={loading || page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                {t("common.previous")}
              </Button>
              <span>
                {t("masterData.pageOf", {
                  page: String(resultPage),
                  lastPage: String(lastPage),
                  total: String(total),
                })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={loading || page >= lastPage}
                onClick={() => setPage((current) => current + 1)}
              >
                {t("common.next")}
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
