import { Suspense } from "react";
import { AdminOrganizationsView } from "@/features/admin/components/admin-organizations-view";

export default function OrganizationsPage() {
  return (
    <Suspense>
      <AdminOrganizationsView />
    </Suspense>
  );
}
