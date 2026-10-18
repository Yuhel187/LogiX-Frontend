import { ShipmentDetailScreen } from "@/features/shipments";
export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ shipmentId: string }>;
}) {
  const { shipmentId } = await params;
  return <ShipmentDetailScreen shipmentId={shipmentId} />;
}
