import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import type { TripStatus } from "../schemas/trip.schema";

export function TripStatusBadge({ status }: { status: TripStatus }) {
  const { t } = useTranslation();
  return (
    <Badge variant={status === "CANCELED" ? "destructive" : "secondary"}>
      {t(`transport.status.${status}`)}
    </Badge>
  );
}
