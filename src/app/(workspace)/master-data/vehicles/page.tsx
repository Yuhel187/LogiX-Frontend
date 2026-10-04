import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { VehiclesScreen } from "@/features/master-data";

export default function VehiclesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <VehiclesScreen />
    </Suspense>
  );
}
