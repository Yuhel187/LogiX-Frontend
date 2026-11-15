import { Suspense } from "react";
import { TablePageSkeleton } from "@/components/shared/page-skeletons";
import { AdminContactsView } from "@/features/admin/components/admin-contacts-view";

export default function AdminContactsPage() {
  return (
    <Suspense fallback={<TablePageSkeleton />}>
      <AdminContactsView />
    </Suspense>
  );
}

