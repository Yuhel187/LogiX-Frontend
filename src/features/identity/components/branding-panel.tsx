import Image from "next/image";
import { Building2 } from "lucide-react";
import type { Dictionary } from "@/locales";

interface BrandingPanelProps {
  t: Dictionary["auth"];
}

export function BrandingPanel({ t }: BrandingPanelProps) {
  return (
    <div className="relative hidden lg:flex flex-col items-center justify-center min-h-screen p-12 text-center overflow-hidden border-r border-zinc-200/60 dark:border-zinc-800/40 bg-[#f6f6f7] dark:bg-[#070908] text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      {/* Background Square Grid Pattern (Crisp Square Grids) */}
      <div className="absolute inset-0 bg-grid-pattern opacity-100 pointer-events-none" />

      {/* Radial Green Ambient Glow behind logo */}
      <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] bg-emerald-400/25 dark:bg-emerald-500/20 blur-3xl rounded-full pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-lg space-y-10">
        {/* Floating Logo Container */}
        <div className="animate-float flex flex-col items-center">
          <div className="relative flex items-center justify-center">
            <Image
              src="/logo_logix.png"
              alt="LogiX Logo"
              width={300}
              height={100}
              priority
              className="h-auto w-auto max-w-[260px] sm:max-w-[300px] object-contain drop-shadow-[0_0_20px_rgba(16,185,129,0.25)]"
            />
          </div>

          {/* Console Badge Pill matching mockup */}
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-zinc-200/90 dark:border-emerald-500/30 bg-white/90 dark:bg-emerald-950/40 px-4 py-1.5 text-xs font-semibold text-zinc-800 dark:text-emerald-400 backdrop-blur-md shadow-2xs">
            <Building2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span>{t.consoleBadge}</span>
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
            {t.brandTitle}{" "}
            <span className="block text-[#10b981] dark:text-emerald-400 mt-1 font-extrabold">
              {t.brandHighlight}
            </span>
          </h1>
          <p className="max-w-md mx-auto text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
            {t.brandSubtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
