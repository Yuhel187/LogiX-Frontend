"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { AdminListView } from "./admin-list-view";

export function AdminOrganizationsView() {
  const { switchTenant, isSuperAdmin } = useAuth();
  const { t } = useTranslation();
  const busy = useRef(false);
  const [target, setTarget] = useState<string | null>(null);

  return (
    <AdminListView
      kind="organizations"
      organizationAction={(organization) => (
        <div className="space-y-1">
          <Button
            variant="outline"
            size="sm"
            disabled={
              !isSuperAdmin ||
              organization.status !== "ACTIVE" ||
              target !== null
            }
            onClick={async () => {
              if (
                busy.current ||
                !isSuperAdmin ||
                organization.status !== "ACTIVE"
              )
                return;
              busy.current = true;
              setTarget(organization.id);
              try {
                await switchTenant(organization.id, {
                  superAdminOnly: true,
                  fullNavigation: true,
                });
                window.location.replace(`/organization/${organization.id}`);
              } catch (cause) {
                toast.error(
                  t(
                    cause instanceof ApiError &&
                      cause.code === "CONTEXT_UNKNOWN"
                      ? "admin.inject.unknown"
                      : "admin.inject.error",
                  ),
                );
                busy.current = false;
                setTarget(null);
              }
            }}
          >
            {t(
              target === organization.id
                ? "admin.inject.switching"
                : "admin.inject.access",
            )}
          </Button>
          {organization.status !== "ACTIVE" ? (
            <p className="text-xs text-muted-foreground">
              {t("admin.inject.unavailable")}
            </p>
          ) : null}
        </div>
      )}
    />
  );
}
