import { Suspense } from "react";
import { CardGridSkeleton } from "@/components/shared/page-skeletons";
import {
  DriverTripListScreen,
  TransportContextGuard,
} from "@/features/transport";

export default function DriverTripsPage() {
  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <TransportContextGuard>
        <DriverTripListScreen />
      </TransportContextGuard>
    </Suspense>
  );
}
