"use client";

import * as React from "react";
import { Suspense } from "react";
import { AccountSettingsView } from "@/features/identity";

export default function AccountSettingsPage() {
  return (
    <div className="p-4 sm:p-6 md:p-8 w-full">
      <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading account settings...</div>}>
        <AccountSettingsView />
      </Suspense>
    </div>
  );
}
