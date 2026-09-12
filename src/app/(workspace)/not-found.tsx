import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/shared/page-shell";

export default function WorkspaceNotFound() {
  return (
    <PageShell className="items-center justify-center min-h-[65vh]">
      <div className="flex flex-col items-center max-w-md text-center p-8 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-md">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
          <FileQuestion className="h-7 w-7" />
        </div>

        <span className="text-4xl font-extrabold tracking-tight text-primary">
          404
        </span>

        <h2 className="mt-2 text-xl font-bold text-foreground">
          Không tìm thấy trang yêu cầu
        </h2>

        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Trang chức năng bạn đang truy cập có thể đã được di chuyển, đổi tên hoặc
          chưa được khởi tạo trong hệ thống LogiX.
        </p>

        <div className="mt-6 flex items-center justify-center w-full">
          <Button asChild className="gap-2">
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              <span>Quay về Bảng điều khiển</span>
            </Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
