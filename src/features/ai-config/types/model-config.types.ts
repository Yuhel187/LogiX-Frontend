export const MODEL_CONFIG_PERMISSIONS = {
  READ: "agent:model-config:read",
  MANAGE: "agent:model-config:manage",
} as const;

export interface ModelConfigParameters {
  timeoutSeconds?: number;
  maxAttempts?: number;
}

export interface ProviderAvailability {
  provider: string;
  configured: boolean;
  gatewayBackend: string;
  modelPrefix: string | null;
}

export interface ModelConfig {
  configured: boolean;
  provider: string | null;
  model: string | null;
  parameters: ModelConfigParameters;
  version: number | null;
  providerConfigured: boolean;
  availableProviders: ProviderAvailability[];
}

export interface ModelConfigSelection {
  provider: string;
  model: string;
  parameters?: ModelConfigParameters;
}

export interface ModelConfigTestResult {
  ok: boolean;
  provider: string;
  model: string;
}
