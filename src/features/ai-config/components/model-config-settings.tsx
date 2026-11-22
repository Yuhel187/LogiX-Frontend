"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CircleHelp,
  CloudCog,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  TestTube2,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/auth-context";
import { useTranslation } from "@/lib/i18n";
import {
  getModelConfigApi,
  getProviderModelsApi,
  modelConfigErrorKey,
  testModelConfigApi,
  updateModelConfigApi,
} from "../api/model-config.api";
import {
  MODEL_CONFIG_PERMISSIONS,
  type ModelConfig,
  type ProviderAvailability,
  type ModelOption,
} from "../types/model-config.types";

function ModelConfigSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading model configuration">
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
      <Skeleton className="h-10 w-36 rounded-lg" />
    </div>
  );
}

function ProviderStatus({
  provider,
  t,
}: {
  provider: ProviderAvailability | undefined;
  t: (path: string, params?: Record<string, string | number>) => string;
}) {
  if (!provider) return null;

  return provider.configured ? (
    <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
      <Check className="size-3" />
      {t("tenant.modelConfig.providerReady")}
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
      <CircleHelp className="size-3" />
      {t("tenant.modelConfig.providerUnavailable")}
    </Badge>
  );
}

export function ModelConfigSettings({ tenantId }: { tenantId: string }) {
  const { hasPermission, isLoading: isAuthLoading } = useAuth();
  const { t } = useTranslation();
  const canRead = hasPermission(MODEL_CONFIG_PERMISSIONS.READ);
  const canManage = hasPermission(MODEL_CONFIG_PERMISSIONS.MANAGE);
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<ModelOption[]>([]);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [modelsErrorKey, setModelsErrorKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [lastTested, setLastTested] = useState(false);

  const loadModels = useCallback(async (providerName: string, signal?: AbortSignal) => {
    if (providerName !== "gemini") {
      setModels([]);
      setModelsErrorKey(null);
      return;
    }
    setIsModelsLoading(true);
    setModelsErrorKey(null);
    try {
      const options = await getProviderModelsApi(providerName, signal);
      setModels(options);
    } catch (cause) {
      if (!signal?.aborted) {
        setModels([]);
        setModelsErrorKey(modelConfigErrorKey(cause));
      }
    } finally {
      if (!signal?.aborted) setIsModelsLoading(false);
    }
  }, []);

  const loadConfig = useCallback(async (signal?: AbortSignal) => {
    if (!canRead) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorKey(null);
    try {
      const nextConfig = await getModelConfigApi(signal);
      setConfig(nextConfig);
      const nextProvider = nextConfig.provider ?? nextConfig.availableProviders.find((item) => item.configured)?.provider ?? "";
      setProvider(nextProvider);
      setModel(nextConfig.model ?? "");
      await loadModels(nextProvider, signal);
      setLastTested(false);
    } catch (cause) {
      if (!signal?.aborted) setErrorKey(modelConfigErrorKey(cause));
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [canRead, loadModels]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => loadConfig(controller.signal));
    return () => controller.abort();
  }, [loadConfig, tenantId]);

  const selectedProvider = useMemo(
    () => config?.availableProviders.find((item) => item.provider === provider),
    [config?.availableProviders, provider],
  );
  const hasConfiguredProvider = config?.availableProviders.some((item) => item.configured) ?? false;
  const isDirty = provider !== (config?.provider ?? "") || model.trim() !== (config?.model ?? "");
  const canSubmit = canManage && Boolean(provider && model.trim() && selectedProvider?.configured);

  const handleProviderChange = (nextProvider: string) => {
    setProvider(nextProvider);
    setModel("");
    setLastTested(false);
    setErrorKey(null);
    void loadModels(nextProvider);
  };

  const handleModelCatalogRetry = () => {
    void loadModels(provider);
  };

  const handleTest = async () => {
    if (!canSubmit) return;
    setIsTesting(true);
    setErrorKey(null);
    try {
      await testModelConfigApi({ provider, model: model.trim(), parameters: config?.parameters });
      setLastTested(true);
      toast.success(t("tenant.modelConfig.testSuccess"));
    } catch (cause) {
      setLastTested(false);
      setErrorKey(modelConfigErrorKey(cause));
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!canSubmit || !config || !isDirty) return;
    setIsSaving(true);
    setErrorKey(null);
    try {
      const nextConfig = await updateModelConfigApi(
        { provider, model: model.trim(), parameters: config.parameters },
        config.version ?? 0,
      );
      setConfig(nextConfig);
      setProvider(nextConfig.provider ?? "");
      setModel(nextConfig.model ?? "");
      setLastTested(false);
      toast.success(t("tenant.modelConfig.saveSuccess"));
    } catch (cause) {
      setErrorKey(modelConfigErrorKey(cause));
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <section className="border-t border-border/60 pt-6" aria-busy="true">
        <div className="mb-5 space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
            <CloudCog className="size-5 text-primary" />
            {t("tenant.modelConfig.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("tenant.modelConfig.description")}</p>
        </div>
        <ModelConfigSkeleton />
      </section>
    );
  }

  if (!canRead) {
    return (
      <section className="border-t border-border/60 pt-6">
        <Alert>
          <ShieldCheck />
          <AlertTitle>{t("tenant.modelConfig.title")}</AlertTitle>
          <AlertDescription>{t("tenant.modelConfig.readOnlyNotice")}</AlertDescription>
        </Alert>
      </section>
    );
  }

  if (errorKey && !config) {
    return (
      <section className="border-t border-border/60 pt-6">
        <div className="mb-5 space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
            <CloudCog className="size-5 text-primary" />
            {t("tenant.modelConfig.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("tenant.modelConfig.description")}</p>
        </div>
        <Alert variant="destructive" className="items-start gap-2">
          <AlertCircle />
          <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
            <AlertDescription>{t(errorKey)}</AlertDescription>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadConfig()}>
              <RefreshCw className="size-3.5" />
              {t("common.retry")}
            </Button>
          </div>
        </Alert>
      </section>
    );
  }

  if (!config) return null;

  return (
    <section className="border-t border-border/60 pt-6" aria-labelledby="model-config-title">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 id="model-config-title" className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
            <CloudCog className="size-5 text-primary" />
            {t("tenant.modelConfig.title")}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("tenant.modelConfig.description")}
          </p>
        </div>
        {config.configured ? (
          <Badge variant="outline" className="w-fit gap-1 border-primary/25 bg-primary/5 text-primary">
            <Sparkles className="size-3" />
            {t("tenant.modelConfig.active")}
          </Badge>
        ) : null}
      </div>

      {!hasConfiguredProvider ? (
        <Alert className="mb-4 border-amber-500/30 bg-amber-500/5">
          <CircleHelp className="text-amber-600 dark:text-amber-400" />
          <AlertDescription>{t("tenant.modelConfig.noProviderConfigured")}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="agent-model-provider" className="text-sm font-semibold text-foreground">
              {t("tenant.modelConfig.providerLabel")}
            </label>
            <ProviderStatus provider={selectedProvider} t={t} />
          </div>
          <NativeSelect
            id="agent-model-provider"
            value={provider}
            onChange={(event) => handleProviderChange(event.target.value)}
            disabled={!canManage || isSaving || isTesting || !hasConfiguredProvider}
            className="w-full"
            aria-describedby="agent-model-provider-hint"
          >
            <NativeSelectOption value="">{t("tenant.modelConfig.providerPlaceholder")}</NativeSelectOption>
            {config.availableProviders.map((item) => (
              <NativeSelectOption key={item.provider} value={item.provider} disabled={!item.configured}>
                {item.provider}{item.configured ? "" : ` — ${t("tenant.modelConfig.notConfiguredShort")}`}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <p id="agent-model-provider-hint" className="text-xs leading-relaxed text-muted-foreground">
            {selectedProvider?.gatewayBackend || t("tenant.modelConfig.providerHint")}
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="agent-model-name" className="text-sm font-semibold text-foreground">
            {t("tenant.modelConfig.modelLabel")}
          </label>
          <NativeSelect
            id="agent-model-name"
            value={model}
            onChange={(event) => {
              setModel(event.target.value);
              setLastTested(false);
              setErrorKey(null);
            }}
            disabled={!canManage || isSaving || isTesting || isModelsLoading || !selectedProvider?.configured || models.length === 0}
            aria-describedby="agent-model-name-hint"
            className="w-full"
          >
            <NativeSelectOption value="">
              {isModelsLoading ? t("tenant.modelConfig.modelsLoading") : t("tenant.modelConfig.modelPlaceholder")}
            </NativeSelectOption>
            {models.map((option) => (
              <NativeSelectOption key={option.id} value={option.id}>
                {option.displayName} ({option.id})
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <p id="agent-model-name-hint" className="text-xs leading-relaxed text-muted-foreground">
            {modelsErrorKey ? (
              <span className="text-destructive">
                {t(modelsErrorKey)}{" "}
                <button type="button" className="font-semibold underline underline-offset-2" onClick={handleModelCatalogRetry}>
                  {t("common.retry")}
                </button>
              </span>
            ) : isModelsLoading ? t("tenant.modelConfig.modelsLoading") : models.length > 0 ? t("tenant.modelConfig.modelHint") : t("tenant.modelConfig.modelsEmpty")}
          </p>
        </div>
      </div>

      {errorKey ? (
        <Alert variant="destructive" className="mt-4 items-start gap-2">
          <AlertCircle />
          <AlertDescription>{t(errorKey)}</AlertDescription>
        </Alert>
      ) : null}

      {!canManage ? (
        <Alert className="mt-4">
          <ShieldCheck />
          <AlertDescription>{t("tenant.modelConfig.readOnlyNotice")}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
          {lastTested ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Check className="size-3.5" />
              {t("tenant.modelConfig.tested")}
            </span>
          ) : (
            <span>{t("tenant.modelConfig.credentialHint")}</span>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleTest()}
            disabled={!canSubmit || isSaving || isTesting}
            className="gap-2"
          >
            {isTesting ? <Loader2 className="size-3.5 animate-spin" /> : <TestTube2 className="size-3.5" />}
            {isTesting ? t("tenant.modelConfig.testing") : t("tenant.modelConfig.testButton")}
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canSubmit || !isDirty || isSaving || isTesting}
            className="gap-2"
          >
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            {isSaving ? t("tenant.modelConfig.saving") : t("tenant.modelConfig.saveButton")}
          </Button>
        </div>
      </div>
    </section>
  );
}
