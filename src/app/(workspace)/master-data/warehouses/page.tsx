import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { WarehousesScreen } from "@/features/master-data";

export default function WarehousesPage() {
  // Suspense boundary is required: the screen reads `useSearchParams`.
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <WarehousesScreen />
    </Suspense>
  );
}
