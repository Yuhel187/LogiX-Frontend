import type { ReactNode } from "react";
import { SidebarProvider } from "@/components/shared/sidebar-context";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppHeader } from "@/components/shared/app-header";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        {/* Left Sidebar Navigation */}
        <AppSidebar />

        {/* Right Area: Header + Main View Area */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <AppHeader />
          <main
            id="main-content"
            className="flex-1 overflow-y-auto overflow-x-hidden focus:outline-hidden"
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
