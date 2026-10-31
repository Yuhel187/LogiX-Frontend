import { describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import RoutesPage from "./page";
import { requiredTransportRoutePermission } from "@/features/transport/constants/transport-permissions";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

describe("Operational routes entry", () => {
  it("opens the real trip workspace instead of requesting a sample route", () => {
    RoutesPage();
    expect(redirect).toHaveBeenCalledExactlyOnceWith("/transport");
  });

  it("requires the same trip read permission for both operational entries", () => {
    expect(requiredTransportRoutePermission("/routes")).toBe(
      requiredTransportRoutePermission("/transport")
    );
    expect(requiredTransportRoutePermission("/routes")).toBe("transport:trip:read");
  });
});
