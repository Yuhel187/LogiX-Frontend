"use client";

import { useEffect, useRef, useState } from "react";
import { isApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DRIVER_PERMISSIONS } from "../../constants/driver-permissions";
import { DRIVER_RELINK_ERRORS } from "../../constants/driver-relink-errors";
import {
  relinkDriverUserSchema, type Driver, type EligibleDriverUser,
} from "../../schemas/driver.schema";
import {
  isDriverConflictError, isUnknownDriverMutationOutcome,
  resolveDriverErrorMessage,
} from "../../utils/driver-error-message";
import {
  confirmDriverRelink, prepareDriverRelink,
  type DriverRelinkContext, type DriverRelinkSnapshot,
} from "./driver-relink-workflow";
import { DriverUserPicker } from "./driver-user-picker";

interface DriverRelinkDialogProps {
  driver: Driver;
  onClose: () => void;
  onSaved: () => void;
}

export function DriverRelinkDialog({
  driver, onClose, onSaved,
}: DriverRelinkDialogProps) {
  const { t } = useTranslation();
  const { activeTenant, accessToken, tenantTransition, hasPermission } = useAuth();
  const canManage = hasPermission(DRIVER_PERMISSIONS.manage);
  const context: DriverRelinkContext = {
    tenantId: activeTenant?.id ?? null,
    accessToken,
    tenantTransition,
    canManage,
  };
  const contextRef = useRef(context);
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const [selectedUser, setSelectedUser] = useState<EligibleDriverUser | null>(null);
  const [reason, setReason] = useState("");
  const [snapshot, setSnapshot] = useState<DriverRelinkSnapshot | null>(null);
  const [pending, setPending] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    contextRef.current = {
      tenantId: activeTenant?.id ?? null, accessToken, tenantTransition, canManage,
    };
  }, [activeTenant?.id, accessToken, tenantTransition, canManage]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function run(confirm: boolean) {
    if (inFlight.current || blocked) return;
    const parsed = relinkDriverUserSchema.safeParse({
      version: driver.version,
      expectedUserId: driver.userId,
      userId: selectedUser?.id ?? "",
      reason,
    });
    if (!confirm && !parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [
        String(issue.path[0]), t(issue.message),
      ])));
      return;
    }
    inFlight.current = true;
    setPending(true);
    setFailure(null);
    setErrors({});
    try {
      if (confirm) {
        if (!snapshot) return;
        setSnapshot(null);
        await confirmDriverRelink(snapshot, () => contextRef.current);
        if (mounted.current) {
          onSaved();
          onClose();
        }
      } else if (parsed.success) {
        const next = await prepareDriverRelink(
          driver, parsed.data, () => contextRef.current
        );
        if (mounted.current) setSnapshot(next);
      }
    } catch (cause) {
      if (!mounted.current) return;
      setSnapshot(null);
      setFailure(resolveDriverErrorMessage(cause, t, confirm ? "mutation" : "read"));
      const mustRefresh = isDriverConflictError(cause) ||
        (confirm && isUnknownDriverMutationOutcome(cause));
      const contextChanged = isApiError(cause) &&
        cause.code === DRIVER_RELINK_ERRORS.contextChanged;
      setBlocked(mustRefresh || contextChanged);
      if (mustRefresh && !contextChanged) onSaved();
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(false);
    }
  }

  const contextValid = canManage && Boolean(accessToken) &&
    activeTenant?.id === driver.tenantId && tenantTransition === "idle";
  if (!contextValid) return null;

  return (
    <Dialog open onOpenChange={(open) => {
      if (!open && !inFlight.current) onClose();
    }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("masterData.driver.relink.title")}</DialogTitle>
          <DialogDescription>
            {t("masterData.driver.relink.description")}
          </DialogDescription>
        </DialogHeader>
        <form className="min-w-0 space-y-4" onSubmit={(event) => {
          event.preventDefault();
          void run(snapshot !== null);
        }}>
          <p className="break-words text-sm font-medium">{driver.code}</p>
          {snapshot ? (
            <DriverRelinkReview snapshot={snapshot} />
          ) : (
            <>
              <div className="space-y-1.5">
                <label htmlFor="driver-relink-user" className="text-sm font-medium">
                  {t("masterData.driver.relink.replacement")}
                  <span className="text-destructive"> *</span>
                </label>
                <DriverUserPicker
                  id="driver-relink-user"
                  value={selectedUser?.id ?? ""}
                  selectedUser={selectedUser}
                  disabled={pending || blocked}
                  error={errors.userId}
                  onSelect={(user) => {
                    setSelectedUser(user);
                    setErrors({});
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="driver-relink-reason" className="text-sm font-medium">
                  {t("masterData.driver.relink.reason")}
                  <span className="text-destructive"> *</span>
                </label>
                <Textarea
                  id="driver-relink-reason"
                  required
                  maxLength={1000}
                  value={reason}
                  disabled={pending || blocked}
                  aria-invalid={Boolean(errors.reason)}
                  aria-describedby={errors.reason ? "driver-relink-reason-error" : undefined}
                  onChange={(event) => {
                    setReason(event.target.value);
                    setErrors({});
                  }}
                />
                {errors.reason ? (
                  <p id="driver-relink-reason-error" className="text-xs text-destructive">
                    {errors.reason}
                  </p>
                ) : null}
              </div>
            </>
          )}
          {failure ? <p role="alert" className="text-sm text-destructive">{failure}</p> : null}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
              {t("common.cancel")}
            </Button>
            {snapshot ? (
              <Button type="button" variant="outline" disabled={pending}
                onClick={() => setSnapshot(null)}>
                {t("masterData.driver.relink.change")}
              </Button>
            ) : null}
            <Button type="submit" disabled={pending || blocked}>
              {pending ? t("masterData.working") : snapshot
                ? t("masterData.driver.relink.confirm")
                : t("masterData.driver.relink.preview")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DriverRelinkReview({ snapshot }: { snapshot: DriverRelinkSnapshot }) {
  const { t } = useTranslation();
  const { preview } = snapshot;
  return (
    <section className="min-w-0 space-y-4 rounded-md border p-4">
      <p className="text-sm">{t("masterData.driver.relink.review")}</p>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-muted-foreground">{t("masterData.driver.relink.previous")}</dt>
          <dd className="break-words font-medium">{preview.previousDisplayName}</dd>
          <dd className="break-all font-mono text-xs">{preview.previousUserId}</dd>
        </div>
        <div aria-hidden="true">↓</div>
        <div>
          <dt className="text-muted-foreground">{t("masterData.driver.relink.replacement")}</dt>
          <dd className="break-words font-medium">{preview.displayName}</dd>
          <dd className="break-all font-mono text-xs">{preview.userId}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("masterData.driver.relink.reason")}</dt>
          <dd className="whitespace-pre-wrap break-words">{preview.reason}</dd>
        </div>
      </dl>
    </section>
  );
}
