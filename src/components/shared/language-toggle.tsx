"use client";

import * as React from "react";
import { Check, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/lib/i18n";

export function LanguageToggle() {
  const { locale, setLocale, locales, t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 rounded-lg text-muted-foreground hover:text-foreground"
          aria-label={t("language.switchLanguage")}
          title={t("language.switchLanguage")}
        >
          <Globe className="size-5" />
          <span className="sr-only">{t("language.switchLanguage")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36 shadow-lg">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
          <Globe className="size-3.5" />
          <span>{t("language.select")}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {locales.map((item) => {
          const isSelected = item.code === locale;
          return (
            <DropdownMenuItem
              key={item.code}
              onClick={() => setLocale(item.code)}
              className="flex items-center justify-between cursor-pointer text-xs py-2"
            >
              <span
                className={
                  isSelected
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                }
              >
                {item.name}
              </span>
              {isSelected && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
