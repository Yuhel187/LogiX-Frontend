import {
  ApiError,
  authFetch,
  handleResponse,
} from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";
import type {
  ModelConfig,
  ModelConfigParameters,
  ModelConfigSelection,
  ModelConfigTestResult,
  ProviderAvailability,
} from "../types/model-config.types";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

function parseParameters(value: unknown): ModelConfigParameters {
  if (!isRecord(value)) return {};

  const timeoutSeconds = optionalInteger(value.timeoutSeconds);
  const maxAttempts = optionalInteger(value.maxAttempts);
  return {
    ...(timeoutSeconds === undefined ? {} : { timeoutSeconds }),
    ...(maxAttempts === undefined ? {} : { maxAttempts }),
  };
}

function parseProvider(value: unknown): ProviderAvailability {
  if (!isRecord(value)) throw new ApiError(200, "Invalid provider response", "INVALID_RESPONSE");

  if (
    typeof value.provider !== "string" ||
    typeof value.configured !== "boolean" ||
    typeof value.gatewayBackend !== "string" ||
    (value.modelPrefix !== null && typeof value.modelPrefix !== "string")
  ) {
    throw new ApiError(200, "Invalid provider response", "INVALID_RESPONSE");
  }

  return {
    provider: value.provider,
    configured: value.configured,
    gatewayBackend: value.gatewayBackend,
    modelPrefix: value.modelPrefix,
  };
}

function parseModelConfig(value: unknown): ModelConfig {
  if (!isRecord(value)) {
    throw new ApiError(200, "Invalid model configuration response", "INVALID_RESPONSE");
  }

  const providers = value.availableProviders;
  if (
    typeof value.configured !== "boolean" ||
    (value.provider !== null && typeof value.provider !== "string") ||
    (value.model !== null && typeof value.model !== "string") ||
    (value.version !== null && typeof value.version !== "number") ||
    typeof value.providerConfigured !== "boolean" ||
    !Array.isArray(providers)
  ) {
    throw new ApiError(200, "Invalid model configuration response", "INVALID_RESPONSE");
  }

  return {
    configured: value.configured,
    provider: value.provider,
    model: value.model,
    parameters: parseParameters(value.parameters),
    version: value.version,
    providerConfigured: value.providerConfigured,
    availableProviders: providers.map(parseProvider),
  };
}

function parseTestResult(value: unknown): ModelConfigTestResult {
  if (
    !isRecord(value) ||
    typeof value.ok !== "boolean" ||
    typeof value.provider !== "string" ||
    typeof value.model !== "string"
  ) {
    throw new ApiError(200, "Invalid model test response", "INVALID_RESPONSE");
  }
  return {
    ok: value.ok,
    provider: value.provider,
    model: value.model,
  };
}

export async function getModelConfigApi(signal?: AbortSignal): Promise<ModelConfig> {
  const response = await authFetch(`${apiBaseUrl}/agent/model-config`, {
    method: "GET",
    signal,
  });
  return parseModelConfig(await handleResponse<unknown>(response));
}

export async function updateModelConfigApi(
  selection: ModelConfigSelection,
  expectedVersion: number,
): Promise<ModelConfig> {
  const response = await authFetch(`${apiBaseUrl}/agent/model-config`, {
    method: "PUT",
    body: JSON.stringify({
      provider: selection.provider,
      model: selection.model,
      parameters: selection.parameters ?? {},
      expectedVersion,
    }),
  });
  return parseModelConfig(await handleResponse<unknown>(response));
}

export async function testModelConfigApi(
  selection: ModelConfigSelection,
): Promise<ModelConfigTestResult> {
  const response = await authFetch(`${apiBaseUrl}/agent/model-config/test`, {
    method: "POST",
    body: JSON.stringify({
      provider: selection.provider,
      model: selection.model,
      parameters: selection.parameters ?? {},
    }),
  });
  return parseTestResult(await handleResponse<unknown>(response));
}

export function modelConfigErrorKey(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 403 || cause.code === "MODEL_CONFIG_MANAGE_REQUIRED") {
      return "tenant.modelConfig.errors.noPermission";
    }
    if (cause.code === "MODEL_CONFIG_PROVIDER_NOT_CONFIGURED") {
      return "tenant.modelConfig.errors.providerNotConfigured";
    }
    if (cause.code === "MODEL_CONFIG_INVALID") {
      return "tenant.modelConfig.errors.invalid";
    }
    if (cause.code === "MODEL_CONFIG_VERSION_CONFLICT") {
      return "tenant.modelConfig.errors.conflict";
    }
    if (cause.code === "MODEL_CONFIG_TEST_FAILED") {
      return "tenant.modelConfig.errors.testFailed";
    }
    if (cause.code === "NETWORK_ERROR" || cause.code === "TIMEOUT") {
      return "tenant.modelConfig.errors.network";
    }
  }
  return "tenant.modelConfig.errors.unavailable";
}
