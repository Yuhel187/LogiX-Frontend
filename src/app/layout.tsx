import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/shared/theme-provider";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LogiX - Hệ thống quản trị Logistics Toàn Diện",
  description: "Giải pháp vận hành tập trung đa dịch vụ. Tối ưu hóa chuỗi cung ứng của bạn.",
  icons: {
    icon: "/fav_logo_logix.png",
    shortcut: "/fav_logo_logix.png",
    apple: "/fav_logo_logix.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", inter.variable, "font-sans")}
    >
      <body className={cn("min-h-full flex flex-col bg-background text-foreground font-sans", inter.className)}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}