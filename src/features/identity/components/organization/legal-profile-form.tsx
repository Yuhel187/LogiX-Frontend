"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-context";
import { useTranslation } from "@/lib/i18n";
import { getOrganizationApi, updateOrganizationApi } from "../../api/auth.api";
import {
  legalProfileFormSchema,
  type LegalProfile,
} from "../../schemas/auth.schema";

type LegalField = keyof LegalProfile;
type LegalFormValues = Record<LegalField, string>;

const EMPTY_FORM: LegalFormValues = {
  legalName: "",
  taxCode: "",
  phone: "",
  addressLine: "",
  ward: "",
  district: "",
  province: "",
  postalCode: "",
};

const LEGAL_FIELDS = Object.keys(EMPTY_FORM) as LegalField[];

const FIELD_MAX: Record<LegalField, number> = {
  legalName: 255,
  taxCode: 50,
  phone: 30,
  addressLine: 500,
  ward: 100,
  district: 100,
  province: 100,
  postalCode: 20,
};

// Mirrors identity-service: only OWNER/ADMIN members may PATCH the organization.
const EDITOR_ROLES = new Set(["OWNER", "ADMIN"]);

function toFormValues(profile?: LegalProfile | null): LegalFormValues {
  const next = { ...EMPTY_FORM };
  if (!profile) return next;
  for (const key of LEGAL_FIELDS) next[key] = profile[key] ?? "";
  return next;
}

export function LegalProfileForm({ tenantId, role }: { tenantId: string; role: string }) {
  const { accessToken } = useAuth();
  const { t } = useTranslation();
  const canEdit = EDITOR_ROLES.has(role);

  const [values, setValues] = useState<LegalFormValues>(EMPTY_FORM);
  const [saved, setSaved] = useState<LegalFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<LegalField, string>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getOrganizationApi(tenantId, accessToken ?? undefined)
      .then((org) => {
        if (cancelled) return;
        const next = toFormValues(org.legalProfile);
        setValues(next);
        setSaved(next);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : t("tenant.legalProfileLoadError"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, accessToken, t]);

  const isDirty = LEGAL_FIELDS.some((key) => values[key].trim() !== saved[key].trim());

  const handleChange = (key: LegalField) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    const parsed = legalProfileFormSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<LegalField, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as LegalField | undefined;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    // Send only changed fields; null clears a value on the server.
    const payload: Partial<Record<LegalField, string | null>> = {};
    for (const key of LEGAL_FIELDS) {
      const next = values[key].trim();
      if (next !== saved[key].trim()) payload[key] = next === "" ? null : next;
    }
    if (Object.keys(payload).length === 0) return;

    try {
      setIsSaving(true);
      const res = await updateOrganizationApi(tenantId, payload, accessToken ?? undefined);
      const next = toFormValues(res.legalProfile);
      setValues(next);
      setSaved(next);
      setErrors({});
      toast.success(t("tenant.legalProfileSaveSuccess"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("tenant.saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (
    key: LegalField,
    labelKey: string,
    options: { placeholderKey?: string; required?: boolean; wide?: boolean } = {}
  ) => (
    <div className={options.wide ? "space-y-2 sm:col-span-2" : "space-y-2"}>
      <label htmlFor={`legal-${key}`} className="text-sm font-semibold text-foreground">
        {t(labelKey)}
        {options.required && <span className="text-destructive"> *</span>}
      </label>
      <Input
        id={`legal-${key}`}
        value={values[key]}
        onChange={handleChange(key)}
        placeholder={options.placeholderKey ? t(options.placeholderKey) : undefined}
        disabled={!canEdit || isSaving}
        maxLength={FIELD_MAX[key]}
        aria-invalid={!!errors[key]}
        className="h-10 px-4 text-sm rounded-xl bg-background border-border/80 w-full"
      />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  const addressRequired = !!values.addressLine.trim() || !!values.province.trim();

  return (
    <div className="pt-6 border-t border-border/60 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <FileText className="size-5 text-emerald-600" />
          <h3 className="text-base sm:text-lg font-bold text-foreground">
            {t("tenant.legalProfileTitle")}
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {t("tenant.legalProfileDesc")}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 w-full">
          {!canEdit && (
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-xs sm:text-sm text-muted-foreground">
              <Lock className="size-4 shrink-0" />
              {t("tenant.legalProfileReadonly")}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {renderField("legalName", "tenant.legalName", {
              placeholderKey: "tenant.legalNamePlaceholder",
              wide: true,
            })}
            {renderField("taxCode", "tenant.taxCode", { placeholderKey: "tenant.taxCodePlaceholder" })}
            {renderField("phone", "tenant.legalPhone", { placeholderKey: "tenant.legalPhonePlaceholder" })}
            {renderField("addressLine", "tenant.legalAddressLine", {
              placeholderKey: "tenant.legalAddressLinePlaceholder",
              required: addressRequired,
              wide: true,
            })}
            {renderField("ward", "tenant.legalWard")}
            {renderField("district", "tenant.legalDistrict")}
            {renderField("province", "tenant.legalProvince", { required: addressRequired })}
            {renderField("postalCode", "tenant.legalPostalCode")}
          </div>

          <p className="text-xs text-muted-foreground">{t("tenant.legalAddressHint")}</p>

          {canEdit && (
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSaving || !isDirty}
                className="h-10 px-5 rounded-xl text-sm font-semibold cursor-pointer shadow-xs min-w-32 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {t("tenant.saving")}
                  </>
                ) : (
                  t("tenant.legalProfileSave")
                )}
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
