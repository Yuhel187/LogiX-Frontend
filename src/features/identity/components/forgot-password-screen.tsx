"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { BrandingPanel } from "./branding-panel";
import { ForgotPasswordForm } from "./forgot-password-form";

export function ForgotPasswordScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <main className="grid grid-cols-1 lg:grid-cols-2 min-h-screen w-full bg-background text-foreground overflow-x-hidden">
      <BrandingPanel />
      <ForgotPasswordForm />
    </main>
  );
}
