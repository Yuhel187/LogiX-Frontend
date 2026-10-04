import type { ReactNode } from "react";

export default function InventoryLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="w-full p-4 sm:p-6 md:p-8">{children}</div>;
}
