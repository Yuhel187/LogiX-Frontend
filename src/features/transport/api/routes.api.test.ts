import { beforeEach, describe, expect, it, vi } from "vitest";
import { authFetch } from "@/lib/api";
import { approveTripRouteApi, createManualRouteApi, listRoutePlansApi, previewRouteApprovalApi } from "./routes.api";

vi.mock("@/lib/config", () => ({ apiBaseUrl: "https://gateway.example/api/v1" }));
vi.mock("@/lib/api", async (original) => {
  const actual = await original<typeof import("@/lib/api")>();
  return { ...actual, authFetch: vi.fn() };
});
const fetch = vi.mocked(authFetch);
const id = "00000000-0000-4000-8000-000000000001";
const selection = { expectedVersion: 3, planId: id, planVersion: 1, inputHash: "a".repeat(64) };
describe("Trip route API boundary", () => {
  beforeEach(() => fetch.mockReset());
  it("reads versions through Gateway without accessing optimizer samples", async () => {
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({ items: [] })));
    await expect(listRoutePlansApi(id)).resolves.toEqual({ items: [] });
    expect(fetch).toHaveBeenCalledWith(`https://gateway.example/api/v1/trips/${id}/route-plans`, { method: "GET", signal: undefined });
  });
  it("rejects invalid manual input before sending it", async () => {
    expect(() => createManualRouteApi(id, { requestId: id, expectedTripVersion: 3, orderedStopIds: [] })).toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("keeps failed preview errors explicit", async () => {
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      error: "CONCURRENCY_CONFLICT", message: "Changed",
    }), { status: 409 }));
    await expect(previewRouteApprovalApi(id, selection)).rejects.toMatchObject({ status: 409 });
  });
  it("sends the identical saved approval without refreshing its token or auth retry", async () => {
    const input = { ...selection, requestId: id, previewToken: "original.expired.token", confirmed: true as const };
    const timeout = new Error("Lost response");
    fetch.mockRejectedValueOnce(timeout).mockRejectedValueOnce(timeout);
    await expect(approveTripRouteApi(id, input)).rejects.toBe(timeout);
    await expect(approveTripRouteApi(id, input)).rejects.toBe(timeout);
    const [first, second] = fetch.mock.calls;
    expect(first?.[1]?.body).toBe(second?.[1]?.body);
    expect(first?.[1]?.method).toBe("POST");
    expect(first?.[1]?.skipAuthRefresh).toBe(true);
    expect(JSON.parse(String(first?.[1]?.body))).toEqual(input);
  });
});
