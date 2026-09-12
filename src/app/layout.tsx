import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { LanguageProvider } from "@/lib/i18n";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | LogiX TMS",
    default: "LogiX - Hệ thống Quản lý Vận tải & Chuỗi Cung ứng",
  },
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
      className={cn(
        "h-full antialiased font-sans",
        geistMono.variable,
        inter.variable
      )}
    >
      <body
        className={cn(
          "min-h-full flex flex-col bg-background text-foreground font-sans",
          inter.className
        )}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}