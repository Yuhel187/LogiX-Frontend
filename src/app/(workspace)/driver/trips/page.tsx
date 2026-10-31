import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DriverTripListScreen,
  TransportContextGuard,
} from "@/features/transport";

export default function DriverTripsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <TransportContextGuard>
        <DriverTripListScreen />
      </TransportContextGuard>
    </Suspense>
  );
}
