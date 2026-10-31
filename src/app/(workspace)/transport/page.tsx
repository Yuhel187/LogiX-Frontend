import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TransportContextGuard, TripListScreen } from "@/features/transport";

export default function TransportPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <TransportContextGuard>
        <TripListScreen />
      </TransportContextGuard>
    </Suspense>
  );
}
