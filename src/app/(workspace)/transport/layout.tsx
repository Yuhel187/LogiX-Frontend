import type { ReactNode } from "react";

export default function TransportLayout({ children }: { children: ReactNode }) {
  return (
    <div className="@container w-full min-w-0 p-4 sm:p-6 md:p-8">
      {children}
    </div>
  );
}
