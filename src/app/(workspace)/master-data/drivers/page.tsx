import { Suspense } from "react";
import { TablePageSkeleton } from "@/components/shared/page-skeletons";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { DRIVER_PERMISSIONS, DriversScreen } from "@/features/master-data";

export default function DriversPage() {
  return (
    <PermissionGuard permission={DRIVER_PERMISSIONS.read}>
      <Suspense fallback={<TablePageSkeleton />}>
        <DriversScreen />
      </Suspense>
    </PermissionGuard>
  );
}
