import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { DRIVER_PERMISSIONS, DriversScreen } from "@/features/master-data";

export default function DriversPage() {
  return (
    <PermissionGuard permission={DRIVER_PERMISSIONS.read}>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <DriversScreen />
      </Suspense>
    </PermissionGuard>
  );
}
