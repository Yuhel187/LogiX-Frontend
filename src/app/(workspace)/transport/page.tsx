import { Suspense } from "react";
import { TablePageSkeleton } from "@/components/shared/page-skeletons";
import { TransportContextGuard, TripListScreen } from "@/features/transport";

export default function TransportPage() {
  return (
    <Suspense fallback={<TablePageSkeleton />}>
      <TransportContextGuard>
        <TripListScreen />
      </TransportContextGuard>
    </Suspense>
  );
}
