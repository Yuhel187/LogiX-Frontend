import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  container?: boolean;
}

export function PageShell({
  children,
  className,
  container = true,
  ...props
}: PageShellProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 p-4 sm:p-6 lg:p-8 animate-in fade-in-50 duration-300",
        container ? "mx-auto w-full max-w-7xl" : "w-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
