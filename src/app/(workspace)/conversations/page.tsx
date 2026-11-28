"use client";

import * as React from "react";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ConversationManagementView } from "@/features/chat/components/conversation-management-view";
import { AGENT_CONVERSATION_PERMISSIONS } from "@/features/chat/constants/conversation-permissions";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";

export default function ConversationsPage() {
  const { t } = useTranslation();
  const { isLoading, isSuperAdmin, hasPermission } = useAuth();

  if (isLoading) {
    return null;
  }

  const canRead =
    isSuperAdmin || hasPermission(AGENT_CONVERSATION_PERMISSIONS.READ);

  if (!canRead) {
    return (
      <div className="mx-auto max-w-xl p-6 md:p-10">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <ShieldAlert className="size-5" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              {t("chat.management.accessDeniedTitle")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("chat.management.accessDeniedDesc")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ConversationManagementView />;
}
