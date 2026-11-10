"use client";

import * as React from "react";
import { Suspense } from "react";
import { SettingsPageSkeleton } from "@/components/shared/page-skeletons";
import { AccountSettingsView } from "@/features/identity";

export default function AccountSettingsPage() {
  return (
    <div className="p-4 sm:p-6 md:p-8 w-full">
      <Suspense fallback={<SettingsPageSkeleton />}>
        <AccountSettingsView />
      </Suspense>
    </div>
  );
}
