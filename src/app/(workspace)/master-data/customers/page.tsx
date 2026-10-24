import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomersScreen } from "@/features/master-data";

export default function CustomersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <CustomersScreen />
    </Suspense>
  );
}
