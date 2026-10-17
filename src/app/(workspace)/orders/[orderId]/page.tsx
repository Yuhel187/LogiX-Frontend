import { OrderDetailScreen } from "@/features/orders";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <OrderDetailScreen orderId={orderId} />;
}
