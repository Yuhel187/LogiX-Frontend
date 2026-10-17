"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { isApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EntityLabel } from "@/components/shared/entity-label";
import { getOrganizationMembersApi } from "../api/auth.api";
import type { OrgMember } from "../schemas/auth.schema";

type ActorProfile = Pick<OrgMember, "displayName" | "email">;
type ActorState =
  | { kind: "system" }
  | { kind: "known"; profile: ActorProfile }
  | { kind: "loading" | "unavailable" | "failed" };

export function ActorDirectory({
  actorIds,
  children,
}: {
  actorIds: readonly (string | null)[];
  children: (resolve: (actorId: string | null) => ActorState) => ReactNode;
}) {
  const { user, activeTenant, accessToken } = useAuth();
  const { t } = useTranslation();
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    scope: string;
    members: Map<string, ActorProfile>;
    error: unknown;
    failed: boolean;
  } | null>(null);
  const tenantId = activeTenant?.id;
  const userId = user?.id;
  const needsDirectory = actorIds.some((id) => id !== null && id !== userId);
  const scope = JSON.stringify([tenantId, userId, accessToken, retry]);
  const current = result?.scope === scope ? result : null;

  useEffect(() => {
    if (!needsDirectory || !tenantId || !accessToken) return;
    const controller = new AbortController();
    getOrganizationMembersApi(tenantId, accessToken, controller.signal)
      .then((members) => {
        if (!controller.signal.aborted)
          setResult({
            scope,
            members: new Map(members.map((member) => [member.userId, member])),
            error: null,
            failed: false,
          });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult({ scope, members: new Map(), error, failed: true });
      });
    return () => controller.abort();
  }, [needsDirectory, tenantId, accessToken, scope]);

  const resolve = (actorId: string | null): ActorState => {
    if (actorId === null) return { kind: "system" };
    if (!tenantId || !user || !accessToken) return { kind: "unavailable" };
    if (actorId === user.id) return { kind: "known", profile: user };
    if (!current) return { kind: "loading" };
    if (current.failed) return { kind: "failed" };
    const profile = current.members.get(actorId);
    return profile ? { kind: "known", profile } : { kind: "unavailable" };
  };
  const denied =
    isApiError(current?.error) &&
    (current.error.status === 401 || current.error.status === 403);

  return (
    <>
      {needsDirectory && current?.failed ? (
        <div
          role="alert"
          className="mb-3 flex flex-wrap items-center gap-2 text-xs text-destructive"
        >
          <span>
            {t(
              denied
                ? "displayLabels.actorDenied"
                : "displayLabels.actorLoadError"
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRetry((value) => value + 1)}
          >
            {t("displayLabels.retry")}
          </Button>
        </div>
      ) : null}
      {children(resolve)}
    </>
  );
}

export function ActorLabel({
  actorId,
  actor,
}: {
  actorId: string | null;
  actor: ActorState;
}) {
  const { t } = useTranslation();
  if (actor.kind === "system") return <span>{t("displayLabels.system")}</span>;
  if (!actorId) return <span>{t("displayLabels.actorUnavailable")}</span>;
  return (
    <EntityLabel
      id={actorId}
      name={actor.kind === "known" ? actor.profile.displayName : undefined}
      code={actor.kind === "known" ? actor.profile.email : undefined}
      fallback={t(
        actor.kind === "loading"
          ? "displayLabels.loading"
          : actor.kind === "failed"
            ? "displayLabels.actorLoadError"
            : "displayLabels.actorUnavailable"
      )}
    />
  );
}
