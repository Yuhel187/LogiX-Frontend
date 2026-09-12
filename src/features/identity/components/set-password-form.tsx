"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { LocaleSwitcher, type Locale } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import type { Dictionary } from "@/locales";

interface SetPasswordFormProps {
  t: Dictionary["auth"];
  currentLocale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onSubmitSuccess?: () => void;
}

export function SetPasswordForm({
  t,
  currentLocale,
  onLocaleChange,
  onSubmitSuccess,
}: SetPasswordFormProps) {
  const searchParams = useSearchParams();
  const targetEmail = searchParams?.get("email") || "user@logix.vn";

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (onSubmitSuccess) onSubmitSuccess();
    }, 800);
  };

  return (
    <div className="relative flex flex-col justify-between min-h-screen p-6 sm:p-10 bg-white dark:bg-[#090b0c] text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      {/* Top Right Controls (VI/EN & Theme Switcher) */}
      <div className="flex items-center justify-end gap-3 w-full">
        <LocaleSwitcher currentLocale={currentLocale} onLocaleChange={onLocaleChange} />
        <ThemeToggle />
      </div>

      {/* Main Form Box */}
      <div className="w-full max-w-sm mx-auto my-auto space-y-6 py-6">
        {/* Mobile Logo (Wareflex style) */}
        <div className="lg:hidden flex justify-center pb-4">
          <Image
            src="/logo_logix.png"
            alt="LogiX Logo"
            width={720}
            height={216}
            priority
            className="h-32 sm:h-40 max-w-70 w-auto object-contain"
          />
        </div>

        {/* Header Title & Subtitle */}
        <div className="text-center lg:text-left space-y-1.5">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            {t.setPasswordTitle}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t.setPasswordSubtitle}
          </p>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Email (Readonly Display) */}
          <div className="space-y-1.5">
            <label
              htmlFor="target-email"
              className="block text-xs mb-2 font-semibold text-zinc-700 dark:text-zinc-300"
            >
              {t.targetEmailLabel}
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 h-4 w-4 text-zinc-600 dark:text-zinc-400 pointer-events-none z-10" />
              <input
                id="target-email"
                type="email"
                readOnly
                value={targetEmail}
                className="w-full h-11 pl-10 pr-4 bg-zinc-100/90 dark:bg-[#141618] border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 font-semibold cursor-not-allowed outline-none select-none"
              />
            </div>
          </div>

          {/* New Password Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="new-password"
              className="block text-xs mb-2 font-semibold text-zinc-700 dark:text-zinc-300"
            >
              {t.newPasswordLabel}
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 h-4 w-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
              <input
                id="new-password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t.newPasswordPlaceholder}
                className="w-full h-11 pl-10 pr-4 bg-zinc-50 dark:bg-[#111315] border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Confirm New Password Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="confirm-new-password"
              className="block text-xs mb-2 font-semibold text-zinc-700 dark:text-zinc-300"
            >
              {t.confirmNewPasswordLabel}
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 h-4 w-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
              <input
                id="confirm-new-password"
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder={t.confirmNewPasswordPlaceholder}
                className="w-full h-11 pl-10 pr-4 bg-zinc-50 dark:bg-[#111315] border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 mt-6 bg-[#10b981] hover:bg-[#059669] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] disabled:opacity-60 cursor-pointer text-sm"
          >
            <span>{isLoading ? "..." : t.setPasswordSubmitButton}</span>
            {!isLoading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        {/* Footer Login Link */}
        <div className="text-center text-xs text-zinc-600 dark:text-zinc-400 pt-4">
          <span>{t.backToLoginText} </span>
          <Link
            href="/login"
            className="font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
          >
            {t.loginLinkText}
          </Link>
        </div>
      </div>

      {/* Footer Copyright */}
      <div className="text-center py-2 text-[11px] text-zinc-400 dark:text-zinc-600">
        {t.copyright}
      </div>
    </div>
  );
}
