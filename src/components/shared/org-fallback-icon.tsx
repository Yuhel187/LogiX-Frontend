"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface OrgFallbackIconProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

/**
 * Modern building organization fallback icon matching user reference design:
 * Solid green rounded-squircle with white building outline, 6 windows, and entrance door.
 */
export function OrgFallbackIcon({
  className,
  size = "md",
}: OrgFallbackIconProps) {
  const sizeClasses = {
    xs: "size-5 rounded-md",
    sm: "size-6.5 rounded-lg",
    md: "size-8 rounded-lg",
    lg: "size-10 rounded-xl",
    xl: "size-14 rounded-2xl",
  }[size];

  return (
    <div
      data-slot="org-fallback-icon"
      className={cn(
        "flex shrink-0 items-center justify-center bg-emerald-600 dark:bg-emerald-600 text-white shadow-2xs select-none",
        sizeClasses,
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[62%] text-white"
      >
        {/* Building frame with rounded corners */}
        <rect x="4" y="2.5" width="16" height="19" rx="3" />
        {/* Door at bottom center */}
        <path d="M9.5 21.5v-3.5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5v3.5" />
        {/* 6 Windows in 2 columns */}
        <path d="M8 6.5h2" />
        <path d="M14 6.5h2" />
        <path d="M8 10.5h2" />
        <path d="M14 10.5h2" />
        <path d="M8 14.5h2" />
        <path d="M14 14.5h2" />
      </svg>
    </div>
  );
}

interface OrgLogoProps {
  name: string;
  logoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

/**
 * Renders the organization logo if available, or seamlessly fallbacks to OrgFallbackIcon.
 */
export function OrgLogo({ name, logoUrl, size = "md", className }: OrgLogoProps) {
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);

  const sizeClasses = {
    xs: "size-5 rounded-md",
    sm: "size-6.5 rounded-lg",
    md: "size-8 rounded-lg",
    lg: "size-10 rounded-xl",
    xl: "size-14 rounded-2xl",
  }[size];

  if (logoUrl && failedUrl !== logoUrl) {
    return (
      <div
        className={cn(
          "overflow-hidden shrink-0 border border-border/50 bg-background flex items-center justify-center shadow-xs",
          sizeClasses,
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={logoUrl}
          src={logoUrl}
          alt={name}
          onError={() => setFailedUrl(logoUrl)}
          className="size-full object-cover"
        />
      </div>
    );
  }

  return <OrgFallbackIcon size={size} className={className} />;
}
