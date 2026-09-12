"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { LocaleSwitcher, type Locale } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import type { Dictionary } from "@/locales";

interface ForgotPasswordFormProps {
  t: Dictionary["auth"];
  currentLocale: Locale;
  onLocaleChange: (locale: Locale) => void;
}

export function ForgotPasswordForm({
  t,
  currentLocale,
  onLocaleChange,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSent(true);
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

        {!isSent ? (
          /* STATE 1: Request Password Reset */
          <>
            {/* Header Title & Subtitle */}
            <div className="text-center lg:text-left space-y-1.5">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                {t.forgotPasswordTitle}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {t.forgotPasswordSubtitle}
              </p>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="forgot-email"
                  className="block text-xs mb-2 font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  {t.emailLabel}
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 h-4 w-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailRegisterPlaceholder}
                    className="w-full h-11 pl-10 pr-4 bg-zinc-50 dark:bg-[#111315] border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 mt-6 bg-[#10b981] hover:bg-[#059669] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] disabled:opacity-60 cursor-pointer text-sm"
              >
                <span>{isLoading ? "..." : t.sendResetLinkButton}</span>
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            {/* Footer Back to Login Link */}
            <div className="text-center text-xs text-zinc-600 dark:text-zinc-400 pt-4">
              <span>{t.backToLoginText} </span>
              <Link
                href="/login"
                className="font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                {t.loginLinkText}
              </Link>
            </div>
          </>
        ) : (
          /* STATE 2: Reset Email Sent Notification */
          <div className="text-left space-y-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                {t.emailSentTitle}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {t.emailSentSubtitle} <span className="font-semibold text-zinc-900 dark:text-zinc-100">{email}</span>.
              </p>
            </div>

            <div className="pt-2 space-y-4">
              <Link
                href="/login"
                className="w-full h-11 bg-[#10b981] hover:bg-[#059669] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md text-sm"
              >
                <span>{t.loginLinkText}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <div className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                <span>{t.resendEmailText} </span>
                <button
                  type="button"
                  onClick={() => setIsSent(false)}
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  {t.resendLink}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Copyright */}
      <div className="text-center py-2 text-[11px] text-zinc-400 dark:text-zinc-600">
        {t.copyright}
      </div>
    </div>
  );
}
