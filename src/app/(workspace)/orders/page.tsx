import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { OrdersScreen } from "@/features/orders";

export default function OrdersPage() {
  // Suspense boundary is required: OrdersScreen reads `useSearchParams`.
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <OrdersScreen />
    </Suspense>
  );
}
