import { TransportContextGuard, TripDetailScreen } from "@/features/transport";

export default async function TransportTripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  return (
    <TransportContextGuard>
      <TripDetailScreen key={tripId} tripId={tripId} />
    </TransportContextGuard>
  );
}
