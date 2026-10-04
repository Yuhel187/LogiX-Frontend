import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductsScreen } from "@/features/master-data";

export default function ProductsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ProductsScreen />
    </Suspense>
  );
}
