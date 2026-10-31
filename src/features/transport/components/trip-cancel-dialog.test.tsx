import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { resolveLocaleMessage } from "@/lib/i18n";
import { tripDetailSchema } from "../schemas/trip.schema";
import { TripCancelDialog } from "./trip-cancel-dialog";

let locale = "en";
vi.mock("@/lib/i18n", async (original) => {
  const actual = await original<typeof import("@/lib/i18n")>();
  return {
    ...actual,
    useTranslation: () => ({
      locale,
      t: (key: string) => actual.resolveLocaleMessage(locale, key),
    }),
  };
});
vi.mock("../hooks/use-mutation-intent", () => ({
  useMutationIntent: () => ({
    intent: null,
    ready: true,
    storageFailed: false,
    begin: vi.fn(),
    complete: vi.fn(),
  }),
}));

const id = "00000000-0000-4000-8000-000000000001";
const trip = tripDetailSchema.parse({
  id,
  tripNumber: "TRIP-1",
  warehouseId: id,
  status: "APPROVED",
  plannedStartAt: "2026-10-25T00:00:00.000Z",
  vehicleId: id,
  driverId: id,
  totalWeight: "10.000",
  totalVolume: "1.000000",
  version: 3,
  depotSnapshot: {
    id,
    code: "WH",
    name: "Depot",
    addressLine: "Address",
    ward: null,
    district: null,
    province: "Province",
    postalCode: null,
    latitude: null,
    longitude: null,
    status: "ACTIVE",
    createdAt: "2026-10-25T00:00:00.000Z",
    updatedAt: "2026-10-25T00:00:00.000Z",
    version: 1,
  },
  approvedRoutePlanId: id,
  shipments: [],
  stops: [],
});

function render(dispatchPending: boolean) {
  return renderToStaticMarkup(
    <TripCancelDialog
      trip={trip}
      scope={{ tenantId: id, userId: id }}
      canUpdate
      dispatchPending={dispatchPending}
      onReload={vi.fn()}
    />
  );
}

describe("Trip cancellation during dispatch", () => {
  it.each(["vi", "en"])("explains and disables cancellation while dispatch is pending in %s", (language) => {
    locale = language;
    const html = render(true);
    expect(html).toContain(
      resolveLocaleMessage(locale, "transport.dispatch.cancelAfterGrant")
    );
    expect(html).toContain('disabled=""');
  });

  it("keeps draft cancellation available when no dispatch operation is pending", () => {
    locale = "en";
    const html = render(false);
    expect(html).not.toContain(
      resolveLocaleMessage(locale, "transport.dispatch.cancelAfterGrant")
    );
    expect(html).not.toContain('disabled=""');
  });
});
