"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth/auth-context";
import { useTranslation } from "@/lib/i18n";

interface CreateOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrgDialog({ open, onOpenChange }: CreateOrgDialogProps) {
  const router = useRouter();
  const { createOrganization } = useAuth();
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setSetAsDefault(false);
    setError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError(t("tenant.orgNameLabel"));
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const newOrg = await createOrganization({
        name: trimmedName,
        setAsDefault,
      });

      toast.success(t("tenant.createSuccess"));
      handleOpenChange(false);
      if (newOrg?.id) {
        router.push(`/organization/${newOrg.id}`);
        router.refresh();
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t("tenant.createError");
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg p-6 rounded-2xl">
        <DialogHeader className="space-y-1.5 pb-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Building2 className="size-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              {t("tenant.createOrgTitle")}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-normal">
            {t("tenant.createOrgDesc")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {error && (
            <div className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive font-medium border border-destructive/20">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="org-name"
              className="text-sm font-semibold text-foreground"
            >
              {t("tenant.orgNameLabel")}{" "}
              <span className="text-destructive">*</span>
            </label>
            <Input
              id="org-name"
              placeholder={t("tenant.orgNamePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              required
              minLength={2}
              className="h-10 px-3.5 text-sm rounded-xl bg-background border-border/80"
            />
          </div>

          <div className="flex items-center space-x-2.5 pt-1">
            <Checkbox
              id="set-default"
              checked={setAsDefault}
              onCheckedChange={(checked) => setSetAsDefault(Boolean(checked))}
              disabled={isSubmitting}
              className="rounded-md"
            />
            <label
              htmlFor="set-default"
              className="text-sm text-muted-foreground hover:text-foreground cursor-pointer select-none font-medium transition-colors"
            >
              {t("tenant.setAsDefault")}
            </label>
          </div>

          <DialogFooter className="gap-2.5 sm:gap-2.5 pt-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="h-10 px-5 text-sm font-semibold rounded-xl cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="h-10 px-6 text-sm font-semibold rounded-xl cursor-pointer shadow-xs min-w-32"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t("tenant.creating")}
                </>
              ) : (
                t("tenant.createButton")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
