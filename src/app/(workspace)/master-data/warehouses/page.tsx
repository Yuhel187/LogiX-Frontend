import { Suspense } from "react";
import { TablePageSkeleton } from "@/components/shared/page-skeletons";
import { WarehousesScreen } from "@/features/master-data";

export default function WarehousesPage() {
  // Suspense boundary is required: the screen reads `useSearchParams`.
  return (
    <Suspense fallback={<TablePageSkeleton />}>
      <WarehousesScreen />
    </Suspense>
  );
}
