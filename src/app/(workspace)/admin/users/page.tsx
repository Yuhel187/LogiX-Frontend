import { Suspense } from "react";
import { TablePageSkeleton } from "@/components/shared/page-skeletons";
import { AdminUsersView } from "@/features/admin/components/admin-users-view";

export default function UsersPage() {
  return (
    <Suspense fallback={<TablePageSkeleton />}>
      <AdminUsersView />
    </Suspense>
  );
}
