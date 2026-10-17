import { Suspense } from "react";
import { ShipmentPoolScreen } from "@/features/shipments";
import { Skeleton } from "@/components/ui/skeleton";
export default function ShipmentsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <ShipmentPoolScreen />
    </Suspense>
  );
}
