import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DriverTripDetailScreen,
  TransportContextGuard,
} from "@/features/transport";

export default async function DriverTripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <TransportContextGuard>
        <DriverTripDetailScreen tripId={tripId} />
      </TransportContextGuard>
    </Suspense>
  );
}
