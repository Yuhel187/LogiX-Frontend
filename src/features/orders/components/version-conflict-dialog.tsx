"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "@/lib/i18n";

interface VersionConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Discards local edits and loads the latest version from the server. */
  onReload: () => void;
}

/**
 * Shown on ORDER_VERSION_CONFLICT. The user decides whether to reload;
 * local edits are never silently overwritten or re-submitted.
 */
export function VersionConflictDialog({
  open,
  onOpenChange,
  onReload,
}: VersionConflictDialogProps) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("orders.conflict.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("orders.conflict.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("orders.conflict.keepEditing")}</AlertDialogCancel>
          <AlertDialogAction onClick={onReload}>
            {t("orders.conflict.reload")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
