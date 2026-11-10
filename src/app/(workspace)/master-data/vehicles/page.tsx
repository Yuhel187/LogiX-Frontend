import { Suspense } from "react";
import { TablePageSkeleton } from "@/components/shared/page-skeletons";
import { VehiclesScreen } from "@/features/master-data";

export default function VehiclesPage() {
  return (
    <Suspense fallback={<TablePageSkeleton />}>
      <VehiclesScreen />
    </Suspense>
  );
}
