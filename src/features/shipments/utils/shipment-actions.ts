import {
  SHIPMENT_PERMISSIONS as P,
  type ShipmentAction,
} from "../constants/shipment.constants";
import type { ShipmentSummary } from "../schemas/shipment.schema";

export function shipmentActions(
  shipment: Pick<ShipmentSummary, "status" | "dispatchIntent">,
  hasPermission: (permission: string) => boolean
): ShipmentAction[] {
  if (shipment.dispatchIntent?.status === "PENDING") return [];
  switch (shipment.status) {
    case "PENDING_PICK":
      return hasPermission(P.update) ? ["start-picking"] : [];
    case "PICKING":
      return hasPermission(P.update) ? ["mark-ready"] : [];
    case "READY_TO_SHIP":
      return hasPermission(P.dispatch) && hasPermission(P.read)
        ? ["dispatch"]
        : [];
    case "DISPATCHED":
      return hasPermission(P.complete) ? ["mark-delivered", "mark-failed"] : [];
    default:
      return [];
  }
}
