import { OrderEditScreen } from "@/features/orders";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <OrderEditScreen orderId={orderId} />;
}
