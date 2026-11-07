import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "@copilotkit/react-core/v2/styles.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { LanguageProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { DynamicTenantHead } from "@/components/shared/dynamic-tenant-head";

export const metadata: Metadata = {
  description:
    "Giải pháp vận hành tập trung đa dịch vụ. Nền tảng quản lý vận tải, điều phối đơn hàng, kho bãi và giám sát hành trình LogiX.",
  icons: {
    icon: [
      { url: "/fav_logo_logix.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/fav_logo_logix.png",
    apple: "/fav_logo_logix.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className="h-full antialiased font-sans"
    >
      <body
        className="min-h-full flex flex-col bg-background text-foreground font-sans"
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <AuthProvider>
              <DynamicTenantHead />
              <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
