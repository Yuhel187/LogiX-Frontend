"use client";

import { useTranslation } from "@/lib/i18n";
import type { RecordStatus } from "../../schemas/common.schema";
import { ConfirmActionDialog } from "./confirm-action-dialog";

interface StatusToggleDialogProps<T extends { id: string; status: RecordStatus }> {
  target: T | null;
  onClear: () => void;
  onConfirm: (row: T, action: "disable" | "enable") => Promise<unknown>;
  disableDescription: string;
  enableDescription: string;
  onDone: () => void;
}

/** Shared by every resource so the disable/enable copy and flow stay identical. */
export function StatusToggleDialog<
  T extends { id: string; status: RecordStatus },
>({
  target,
  onClear,
  onConfirm,
  disableDescription,
  enableDescription,
  onDone,
}: StatusToggleDialogProps<T>) {
  const { t } = useTranslation();
  const isDisabling = target?.status === "ACTIVE";

  return (
    <ConfirmActionDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClear();
      }}
      title={
        isDisabling
          ? t("masterData.disableTitle")
          : t("masterData.enableTitle")
      }
      description={isDisabling ? disableDescription : enableDescription}
      confirmLabel={
        isDisabling ? t("masterData.disable") : t("masterData.enable")
      }
      destructive={isDisabling}
      onConfirm={async () => {
        if (!target) return;
        await onConfirm(target, isDisabling ? "disable" : "enable");
      }}
      onDone={() => {
        onClear();
        onDone();
      }}
    />
  );
}
