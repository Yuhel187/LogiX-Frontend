import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRouteCommand } from "./use-route-command";
import { approveTripRouteApi, reopenTripApi, createManualRouteApi } from "../api/routes.api";
import { getTripApi } from "../api/trips.api";

const state = vi.hoisted(() => ({
  saved: null as null | { requestId: string; payload: unknown },
  complete: vi.fn(),
  begin: vi.fn(),
}));
vi.mock("react", async (original) => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => [initial, vi.fn()] };
});
vi.mock("./use-mutation-intent", () => ({
  useMutationIntent: () => ({
    intent: state.saved, ready: true, storageFailed: false,
    complete: state.complete, begin: state.begin,
  }),
}));
vi.mock("../api/routes.api", () => ({
  approveTripRouteApi: vi.fn(), reopenTripApi: vi.fn(),
  createManualRouteApi: vi.fn(), optimizeTripRouteApi: vi.fn(), overrideTripRouteApi: vi.fn(),
}));
vi.mock("../api/trips.api", () => ({ getTripApi: vi.fn() }));

const id = "00000000-0000-4000-8000-000000000001";
const scope = { tenantId: id, userId: id };
const approval = {
  kind: "approve" as const,
  input: { expectedVersion: 3, planId: id, planVersion: 1, inputHash: "a".repeat(64),
    previewToken: "original.expired.token", confirmed: true as const },
};

describe("Route command recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.saved = null;
    state.begin.mockImplementation((payload: unknown) => ({ requestId: id, payload }));
  });
  it("replays a persisted approval with its original token and request", async () => {
    state.saved = { requestId: id, payload: approval };
    const changed = vi.fn();
    await useRouteCommand(id, scope, changed).run();
    expect(approveTripRouteApi).toHaveBeenCalledWith(id, { requestId: id, ...approval.input });
    expect(state.complete).toHaveBeenCalledWith(id);
    expect(changed).toHaveBeenCalledOnce();
  });
  it("does not resend CAS-only reopening after an unknown response", async () => {
    state.saved = { requestId: id, payload: { kind: "reopen", input: { expectedVersion: 3, reason: "Change assignment" } } };
    const changed = vi.fn();
    await useRouteCommand(id, scope, changed).run();
    expect(getTripApi).toHaveBeenCalledWith(id);
    expect(reopenTripApi).not.toHaveBeenCalled();
    expect(state.complete).toHaveBeenCalledWith(id);
    expect(changed).toHaveBeenCalledOnce();
  });
  it("retains an uncertain manual route request without reporting success", async () => {
    vi.mocked(createManualRouteApi).mockRejectedValueOnce(new Error("Connection lost"));
    const changed = vi.fn();
    await useRouteCommand(id, scope, changed).run({
      kind: "manual", input: { expectedTripVersion: 3, orderedStopIds: [id] },
    });
    expect(state.complete).not.toHaveBeenCalled();
    expect(changed).not.toHaveBeenCalled();
  });
  it("does not clear an uncertain reopening until read-back succeeds", async () => {
    state.saved = { requestId: id, payload: { kind: "reopen", input: { expectedVersion: 3, reason: "Change" } } };
    vi.mocked(getTripApi).mockRejectedValueOnce(new Error("Still offline"));
    await useRouteCommand(id, scope, vi.fn()).run();
    expect(state.complete).not.toHaveBeenCalled();
    expect(reopenTripApi).not.toHaveBeenCalled();
  });
});
