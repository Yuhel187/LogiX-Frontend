import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, authFetch } from "@/lib/api";
import {
  getModelConfigApi,
  modelConfigErrorKey,
  testModelConfigApi,
  updateModelConfigApi,
} from "./model-config.api";

vi.mock("@/lib/config", () => ({
  apiBaseUrl: "https://gateway.example/api/v1",
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, authFetch: vi.fn() };
});

const apiFetch = vi.mocked(authFetch);

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const config = {
  configured: true,
  provider: "openai",
  model: "openai/gpt-4o-mini",
  parameters: { timeoutSeconds: 20 },
  version: 3,
  providerConfigured: true,
  availableProviders: [
    {
      provider: "openai",
      configured: true,
      gatewayBackend: "openai",
      modelPrefix: "openai/",
    },
    {
      provider: "gemini",
      configured: false,
      gatewayBackend: "gemini",
      modelPrefix: "gemini/",
    },
  ],
};

describe("model configuration API adapter", () => {
  beforeEach(() => apiFetch.mockReset());

  it("loads and maps the tenant model configuration", async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse(config));

    await expect(getModelConfigApi()).resolves.toEqual(config);
    expect(apiFetch).toHaveBeenCalledWith(
      "https://gateway.example/api/v1/agent/model-config",
      { method: "GET", signal: undefined },
    );
  });

  it("sends the optimistic version and does not include credentials", async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse(config));

    await updateModelConfigApi(
      { provider: "openai", model: "openai/gpt-4o-mini", parameters: config.parameters },
      3,
    );

    expect(apiFetch).toHaveBeenCalledWith(
      "https://gateway.example/api/v1/agent/model-config",
      {
        method: "PUT",
        body: JSON.stringify({
          provider: "openai",
          model: "openai/gpt-4o-mini",
          parameters: { timeoutSeconds: 20 },
          expectedVersion: 3,
        }),
      },
    );
  });

  it("tests a selection without writing an active configuration", async () => {
    apiFetch.mockResolvedValueOnce(
      jsonResponse({ ok: true, provider: "openai", model: "openai/gpt-4o-mini" }),
    );

    await expect(
      testModelConfigApi({ provider: "openai", model: "openai/gpt-4o-mini" }),
    ).resolves.toEqual({ ok: true, provider: "openai", model: "openai/gpt-4o-mini" });
    expect(apiFetch.mock.calls[0][1]?.method).toBe("POST");
  });

  it("rejects malformed successful responses and maps domain errors", async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse({ configured: true }));
    await expect(getModelConfigApi()).rejects.toMatchObject({ code: "INVALID_RESPONSE" });

    expect(
      modelConfigErrorKey(new ApiError(409, "conflict", "MODEL_CONFIG_VERSION_CONFLICT")),
    ).toBe("tenant.modelConfig.errors.conflict");
  });
});
