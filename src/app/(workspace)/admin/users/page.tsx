import { Suspense } from "react";
import { AdminUsersView } from "@/features/admin/components/admin-users-view";

export default function UsersPage() {
  return (
    <Suspense>
      <AdminUsersView />
    </Suspense>
  );
}
