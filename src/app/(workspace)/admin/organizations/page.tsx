import { Suspense } from "react";
import { TablePageSkeleton } from "@/components/shared/page-skeletons";
import { AdminOrganizationsView } from "@/features/admin/components/admin-organizations-view";

export default function OrganizationsPage() {
  return (
    <Suspense fallback={<TablePageSkeleton />}>
      <AdminOrganizationsView />
    </Suspense>
  );
}
