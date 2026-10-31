import { TransportContextGuard, TripCreateScreen } from "@/features/transport";

export default function NewTransportTripPage() {
  return (
    <TransportContextGuard>
      <TripCreateScreen />
    </TransportContextGuard>
  );
}
