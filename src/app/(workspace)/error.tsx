"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/shared/page-shell";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log the error to an error reporting service
    console.error("Workspace error occurred:", error);
  }, [error]);

  return (
    <PageShell className="items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center max-w-md text-center p-8 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-md">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h2 className="text-xl font-bold text-foreground">
          Đã có lỗi xảy ra trong phiên làm việc
        </h2>

        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Hệ thống gặp sự cố khi tải dữ liệu trang. Vui lòng thử tải lại hoặc quay
          trở lại trang tổng quan.
        </p>

        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground/70 bg-muted px-2 py-1 rounded">
            Mã tham chiếu: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 w-full">
          <Button
            variant="outline"
            onClick={() => reset()}
            className="flex-1 min-w-32 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Thử lại</span>
          </Button>

          <Button asChild className="flex-1 min-w-32 gap-2">
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              <span>Về Trang chủ</span>
            </Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
