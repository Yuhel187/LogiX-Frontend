"use client";

import * as React from "react";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Globe,
  RefreshCw,
} from "lucide-react";
import {
  getActiveSessionsApi,
  revokeSessionApi,
  revokeOtherSessionsApi,
} from "@/features/identity/api/auth.api";
import type { UserSession } from "@/features/identity/schemas/auth.schema";
import { cn } from "@/lib/utils";

export function SessionsTab() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();

  const [sessions, setSessions] = React.useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isRevoking, setIsRevoking] = React.useState<boolean>(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Dialog states
  const [sessionToRevoke, setSessionToRevoke] = React.useState<UserSession | null>(null);
  const [isRevokeAllOpen, setIsRevokeAllOpen] = React.useState<boolean>(false);

  const fetchSessions = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await getActiveSessionsApi(accessToken || undefined);
      setSessions(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("account.sessions.loadError");
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, t]);

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await getActiveSessionsApi(accessToken || undefined);
        if (isMounted) {
          setSessions(data);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : t("account.sessions.loadError");
          setErrorMessage(msg);
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [accessToken, t]);

  const handleRevokeSingle = async () => {
    if (!sessionToRevoke) return;
    try {
      setIsRevoking(true);
      setSuccessMessage(null);
      setErrorMessage(null);
      await revokeSessionApi(sessionToRevoke.id, accessToken || undefined);
      setSuccessMessage(t("account.sessions.revokeSuccess"));
      setSessionToRevoke(null);
      await fetchSessions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("account.sessions.revokeFailed");
      setErrorMessage(msg);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleRevokeAllOthers = async () => {
    try {
      setIsRevoking(true);
      setSuccessMessage(null);
      setErrorMessage(null);
      await revokeOtherSessionsApi(undefined, accessToken || undefined);
      setSuccessMessage(t("account.sessions.revokeAllSuccess"));
      setIsRevokeAllOpen(false);
      await fetchSessions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("account.sessions.revokeAllFailed");
      setErrorMessage(msg);
    } finally {
      setIsRevoking(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType?.toUpperCase()) {
      case "MOBILE":
        return Smartphone;
      case "TABLET":
        return Tablet;
      case "DESKTOP":
        return Monitor;
      default:
        return Laptop;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const d = new Date(dateString);
      return d.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-border/80 shadow-sm bg-card/60 backdrop-blur-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                {t("account.sessions.title")}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                {t("account.sessions.desc")}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchSessions}
                disabled={isLoading}
                className="h-9 rounded-xl gap-1.5 text-xs font-semibold"
              >
                <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
                <span>{t("account.sessions.refresh")}</span>
              </Button>

              {otherSessionsCount > 0 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsRevokeAllOpen(true)}
                  disabled={isRevoking || isLoading}
                  className="h-9 rounded-xl gap-1.5 text-xs font-semibold shadow-xs"
                >
                  <LogOut className="size-3.5" />
                  <span>{t("account.sessions.logoutAllOthers")}</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Feedback Alerts */}
          {successMessage && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium animate-in fade-in">
              <CheckCircle2 className="size-4.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium animate-in fade-in">
              <AlertCircle className="size-4.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs font-medium">{t("account.sessions.loadingSessions")}</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <ShieldCheck className="size-10 mx-auto text-muted-foreground/60" />
              <p className="text-sm font-medium">{t("account.sessions.noSessions")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60 rounded-2xl border border-border/80 bg-background/50 overflow-hidden">
              {sessions.map((session) => {
                const DeviceIcon = getDeviceIcon(session.deviceType);
                return (
                  <div
                    key={session.id}
                    className={cn(
                      "flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4 transition-colors hover:bg-muted/30",
                      session.isCurrent && "bg-primary/5 dark:bg-primary/10"
                    )}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={cn(
                          "mt-0.5 rounded-xl p-2.5 border shadow-2xs",
                          session.isCurrent
                            ? "bg-primary/15 border-primary/30 text-primary"
                            : "bg-muted border-border/80 text-muted-foreground"
                        )}
                      >
                        <DeviceIcon className="size-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-foreground">
                            {session.device || t("account.sessions.unknownDevice")}
                          </span>
                          {session.isCurrent && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1.5 px-2 py-0.5 rounded-full">
                              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>{t("account.sessions.thisDevice")}</span>
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Globe className="size-3.5 text-muted-foreground/80" />
                            <span>{session.ipAddress}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3.5 text-muted-foreground/80" />
                            <span>
                              {t("account.sessions.lastActive")}: {formatDate(session.lastActiveAt)}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end sm:self-center">
                      {session.isCurrent ? (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {t("account.sessions.activeNow")}
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSessionToRevoke(session)}
                          className="h-9 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl gap-1.5"
                        >
                          <LogOut className="size-3.5" />
                          <span>{t("account.sessions.logoutDevice")}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Single Revoke Modal */}
      <Dialog open={!!sessionToRevoke} onOpenChange={(open) => !open && setSessionToRevoke(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-border/80 bg-background/95 p-6 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {t("account.sessions.confirmLogoutTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {sessionToRevoke &&
                t("account.sessions.confirmLogoutDesc", {
                  device: sessionToRevoke.device || t("account.sessions.unknownDevice"),
                })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSessionToRevoke(null)}
              className="rounded-xl"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isRevoking}
              onClick={handleRevokeSingle}
              className="rounded-xl font-semibold shadow-sm"
            >
              {isRevoking ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              <span>{t("account.sessions.logoutDevice")}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Revoke All Others Modal */}
      <Dialog open={isRevokeAllOpen} onOpenChange={setIsRevokeAllOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-border/80 bg-background/95 p-6 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {t("account.sessions.confirmLogoutAllTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t("account.sessions.confirmLogoutAllDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsRevokeAllOpen(false)}
              className="rounded-xl"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isRevoking}
              onClick={handleRevokeAllOthers}
              className="rounded-xl font-semibold shadow-sm"
            >
              {isRevoking ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              <span>{t("account.sessions.logoutAllOthers")}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
