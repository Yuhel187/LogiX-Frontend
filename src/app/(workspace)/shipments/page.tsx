import { Suspense } from "react";
import { ShipmentPoolScreen } from "@/features/shipments";
import { TablePageSkeleton } from "@/components/shared/page-skeletons";

export default function ShipmentsPage() {
  return (
    <Suspense fallback={<TablePageSkeleton />}>
      <ShipmentPoolScreen />
    </Suspense>
  );
}
