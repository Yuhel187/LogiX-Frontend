import { Suspense } from "react";
import { TablePageSkeleton } from "@/components/shared/page-skeletons";
import { ProductsScreen } from "@/features/master-data";

export default function ProductsPage() {
  return (
    <Suspense fallback={<TablePageSkeleton />}>
      <ProductsScreen />
    </Suspense>
  );
}
