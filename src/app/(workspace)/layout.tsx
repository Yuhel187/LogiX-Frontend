import type { ReactNode } from "react";
import { SidebarProvider } from "@/components/shared/sidebar-context";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppHeader } from "@/components/shared/app-header";
import { WorkspaceGuard } from "@/components/shared/workspace-guard";
import { CopilotChatProvider } from "@/features/chat/components/copilot-chat-provider";
import { LogixCopilotSidebar } from "@/features/chat/components/logix-copilot-sidebar";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceGuard>
      <CopilotChatProvider>
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

            {/* Copilot AI Slide Bar */}
            <LogixCopilotSidebar defaultOpen={true} />
          </div>
        </SidebarProvider>
      </CopilotChatProvider>
    </WorkspaceGuard>
  );
}
