import { Suspense } from "react";
import { DetailPageSkeleton } from "@/components/shared/page-skeletons";
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
    <Suspense fallback={<DetailPageSkeleton />}>
      <TransportContextGuard>
        <DriverTripDetailScreen tripId={tripId} />
      </TransportContextGuard>
    </Suspense>
  );
}
