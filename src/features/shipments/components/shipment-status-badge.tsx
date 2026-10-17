import { StatusBadge } from "@/components/shared/status-badge";
import { useTranslation } from "@/lib/i18n";
import { SHIPMENT_STATUS_TONE } from "../constants/shipment.constants";
import type { ShipmentStatus } from "../schemas/shipment.schema";
export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  const { t } = useTranslation();
  return (
    <StatusBadge
      status={SHIPMENT_STATUS_TONE[status]}
      label={t(`shipments.status.${status}`)}
    />
  );
}
