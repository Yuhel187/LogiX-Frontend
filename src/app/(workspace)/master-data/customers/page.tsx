import { Suspense } from "react";
import { TablePageSkeleton } from "@/components/shared/page-skeletons";
import { CustomersScreen } from "@/features/master-data";

export default function CustomersPage() {
  return (
    <Suspense fallback={<TablePageSkeleton />}>
      <CustomersScreen />
    </Suspense>
  );
}
