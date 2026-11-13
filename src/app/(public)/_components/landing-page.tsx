"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Menu, RotateCcw, X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge, type LogisticsStatus } from "@/components/shared/status-badge";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useAuth } from "@/lib/auth";
import {
  LOGIN_ROUTE,
  PUBLIC_LANDING_ROUTE,
  REGISTER_ROUTE,
  WORKSPACE_HOME_ROUTE,
} from "@/lib/config/routes";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const POLYGON_CORNERS: Record<
  Corner,
  { pos: string; dir: string; mask: string; clips: [string, string, string] }
> = {
  "top-left": {
    pos: "top-0 left-0",
    dir: "bg-gradient-to-br",
    mask: "[mask-image:radial-gradient(ellipse_85%_85%_at_0%_0%,#000_20%,transparent_75%)]",
    clips: [
      "polygon(0 0, 100% 0, 74% 38%, 40% 72%, 0 100%)",
      "polygon(0 0, 72% 0, 52% 46%, 18% 76%, 0 84%)",
      "polygon(82% 0, 86% 0, 32% 78%, 28% 78%)",
    ],
  },
  "top-right": {
    pos: "top-0 right-0",
    dir: "bg-gradient-to-bl",
    mask: "[mask-image:radial-gradient(ellipse_85%_85%_at_100%_0%,#000_20%,transparent_75%)]",
    clips: [
      "polygon(100% 0, 0 0, 26% 38%, 60% 72%, 100% 100%)",
      "polygon(100% 0, 28% 0, 48% 46%, 82% 76%, 100% 84%)",
      "polygon(18% 0, 14% 0, 68% 78%, 72% 78%)",
    ],
  },
  "bottom-left": {
    pos: "bottom-0 left-0",
    dir: "bg-gradient-to-tr",
    mask: "[mask-image:radial-gradient(ellipse_85%_85%_at_0%_100%,#000_20%,transparent_75%)]",
    clips: [
      "polygon(0 100%, 0 0, 38% 26%, 72% 60%, 100% 100%)",
      "polygon(0 100%, 0 28%, 46% 48%, 76% 82%, 84% 100%)",
      "polygon(0 18%, 0 14%, 78% 68%, 78% 72%)",
    ],
  },
  "bottom-right": {
    pos: "bottom-0 right-0",
    dir: "bg-gradient-to-tl",
    mask: "[mask-image:radial-gradient(ellipse_85%_85%_at_100%_100%,#000_20%,transparent_75%)]",
    clips: [
      "polygon(100% 100%, 100% 0, 62% 26%, 28% 60%, 0 100%)",
      "polygon(100% 100%, 100% 28%, 54% 48%, 24% 82%, 16% 100%)",
      "polygon(100% 18%, 100% 14%, 22% 68%, 22% 72%)",
    ],
  },
};

const POLYGON_TONES = [
  "from-foreground/[0.05] via-foreground/[0.02] to-transparent dark:from-foreground/[0.06] dark:via-foreground/[0.02]",
  "from-primary/[0.12] via-primary/[0.04] to-transparent dark:from-primary/[0.18] dark:via-primary/[0.06]",
  "from-primary/20 to-transparent dark:from-primary/25",
] as const;

function CornerPolygons({
  corners = ["top-left", "bottom-right"],
  size = "sm",
}: {
  corners?: Corner[];
  size?: "sm" | "lg";
}) {
  const sizeClass =
    size === "lg"
      ? "w-64 h-64 sm:w-96 sm:h-96 lg:w-[28rem] lg:h-[28rem]"
      : "w-44 h-44 sm:w-64 sm:h-64";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {corners.map((corner) => {
        const cfg = POLYGON_CORNERS[corner];
        return (
          <div key={corner} className={cn("absolute", cfg.pos, sizeClass, cfg.mask)}>
            {cfg.clips.map((clipPath, i) => (
              <div
                key={clipPath}
                className={cn("absolute inset-0", cfg.dir, POLYGON_TONES[i])}
                style={{ clipPath }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function Reveal({
  children,
  className,
  delayMs = 0,
  initialVisible = false,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  initialVisible?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = React.useState(initialVisible);

  React.useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setVisible(entry.isIntersecting);
      },
      { threshold: 0.06, rootMargin: "-16px 0px -16px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible && delayMs > 0 ? `${delayMs}ms` : "0ms" }}
      className={cn(
        "transition-[opacity,transform,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,transform]",
        "motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:blur-0",
        visible
          ? "opacity-100 translate-y-0 scale-100 blur-0"
          : "opacity-0 translate-y-4 scale-[0.985] blur-[1px]",
        className
      )}
    >
      {children}
    </div>
  );
}

const NAV_ANCHORS = [
  { href: "#capabilities", key: "landing.nav.capabilities" },
  { href: "#platform", key: "landing.nav.platform" },
  { href: "#architecture", key: "landing.nav.architecture" },
  { href: "#faq", key: "landing.nav.faq" },
] as const;

const HERO_KPIS = [
  {
    title: "landing.hero.preview.kpis.ordersLabel",
    value: "landing.hero.preview.kpis.ordersValue",
    note: "landing.hero.preview.kpis.ordersNote",
  },
  {
    title: "landing.hero.preview.kpis.shipmentsLabel",
    value: "landing.hero.preview.kpis.shipmentsValue",
    note: "landing.hero.preview.kpis.shipmentsNote",
  },
  {
    title: "landing.hero.preview.kpis.tripsLabel",
    value: "landing.hero.preview.kpis.tripsValue",
    note: "landing.hero.preview.kpis.tripsNote",
  },
  {
    title: "landing.hero.preview.kpis.stockLabel",
    value: "landing.hero.preview.kpis.stockValue",
    note: "landing.hero.preview.kpis.stockNote",
  },
] as const;

const HERO_ROWS: Array<{
  c1: string;
  c2: string;
  c3: string;
  status: LogisticsStatus;
  sKey: string;
}> = [
  {
    c1: "landing.hero.preview.rows.row1Code",
    c2: "landing.hero.preview.rows.row1Route",
    c3: "landing.hero.preview.rows.row1Progress",
    status: "in_transit",
    sKey: "landing.hero.preview.rows.row1Status",
  },
  {
    c1: "landing.hero.preview.rows.row2Code",
    c2: "landing.hero.preview.rows.row2Route",
    c3: "landing.hero.preview.rows.row2Progress",
    status: "delivered",
    sKey: "landing.hero.preview.rows.row2Status",
  },
  {
    c1: "landing.hero.preview.rows.row3Code",
    c2: "landing.hero.preview.rows.row3Route",
    c3: "landing.hero.preview.rows.row3Progress",
    status: "processing",
    sKey: "landing.hero.preview.rows.row3Status",
  },
];

const PILLARS = [
  { code: "01", title: "landing.pillars.item1Title", desc: "landing.pillars.item1Desc" },
  { code: "02", title: "landing.pillars.item2Title", desc: "landing.pillars.item2Desc" },
  { code: "03", title: "landing.pillars.item3Title", desc: "landing.pillars.item3Desc" },
  { code: "04", title: "landing.pillars.item4Title", desc: "landing.pillars.item4Desc" },
] as const;

const CAPABILITIES = [
  {
    tag: "landing.capabilities.items.orders.tag",
    title: "landing.capabilities.items.orders.title",
    desc: "landing.capabilities.items.orders.desc",
  },
  {
    tag: "landing.capabilities.items.inventory.tag",
    title: "landing.capabilities.items.inventory.title",
    desc: "landing.capabilities.items.inventory.desc",
  },
  {
    tag: "landing.capabilities.items.transport.tag",
    title: "landing.capabilities.items.transport.title",
    desc: "landing.capabilities.items.transport.desc",
  },
  {
    tag: "landing.capabilities.items.driver.tag",
    title: "landing.capabilities.items.driver.title",
    desc: "landing.capabilities.items.driver.desc",
  },
  {
    tag: "landing.capabilities.items.forecast.tag",
    title: "landing.capabilities.items.forecast.title",
    desc: "landing.capabilities.items.forecast.desc",
  },
  {
    tag: "landing.capabilities.items.governance.tag",
    title: "landing.capabilities.items.governance.title",
    desc: "landing.capabilities.items.governance.desc",
  },
] as const;

const ORDERS_ROWS: typeof HERO_ROWS = [
  {
    c1: "landing.showcase.ordersTab.r1Order",
    c2: "landing.showcase.ordersTab.r1Wh",
    c3: "landing.showcase.ordersTab.r1Items",
    status: "confirmed",
    sKey: "landing.showcase.ordersTab.r1Status",
  },
  {
    c1: "landing.showcase.ordersTab.r2Order",
    c2: "landing.showcase.ordersTab.r2Wh",
    c3: "landing.showcase.ordersTab.r2Items",
    status: "processing",
    sKey: "landing.showcase.ordersTab.r2Status",
  },
  {
    c1: "landing.showcase.ordersTab.r3Order",
    c2: "landing.showcase.ordersTab.r3Wh",
    c3: "landing.showcase.ordersTab.r3Items",
    status: "pending",
    sKey: "landing.showcase.ordersTab.r3Status",
  },
];

const FORECAST_ROWS: typeof HERO_ROWS = [
  {
    c1: "landing.showcase.forecastTab.s1Sku",
    c2: "landing.showcase.forecastTab.s1Wh",
    c3: "landing.showcase.forecastTab.s1Demand",
    status: "low_stock",
    sKey: "landing.showcase.forecastTab.s1Status",
  },
  {
    c1: "landing.showcase.forecastTab.s2Sku",
    c2: "landing.showcase.forecastTab.s2Wh",
    c3: "landing.showcase.forecastTab.s2Demand",
    status: "in_stock",
    sKey: "landing.showcase.forecastTab.s2Status",
  },
  {
    c1: "landing.showcase.forecastTab.s3Sku",
    c2: "landing.showcase.forecastTab.s3Wh",
    c3: "landing.showcase.forecastTab.s3Demand",
    status: "in_stock",
    sKey: "landing.showcase.forecastTab.s3Status",
  },
];

const WORKFLOW_STEPS = [
  {
    num: "landing.workflow.steps.s1Num",
    title: "landing.workflow.steps.s1Title",
    desc: "landing.workflow.steps.s1Desc",
  },
  {
    num: "landing.workflow.steps.s2Num",
    title: "landing.workflow.steps.s2Title",
    desc: "landing.workflow.steps.s2Desc",
  },
  {
    num: "landing.workflow.steps.s3Num",
    title: "landing.workflow.steps.s3Title",
    desc: "landing.workflow.steps.s3Desc",
  },
  {
    num: "landing.workflow.steps.s4Num",
    title: "landing.workflow.steps.s4Title",
    desc: "landing.workflow.steps.s4Desc",
  },
] as const;

const FAQ_ITEMS = [
  { q: "landing.faq.items.q1", a: "landing.faq.items.a1" },
  { q: "landing.faq.items.q2", a: "landing.faq.items.a2" },
  { q: "landing.faq.items.q3", a: "landing.faq.items.a3" },
  { q: "landing.faq.items.q4", a: "landing.faq.items.a4" },
  { q: "landing.faq.items.q5", a: "landing.faq.items.a5" },
] as const;

const FOOTER_COLS = [
  {
    heading: "landing.footer.colProduct",
    links: [
      { href: "#capabilities", label: "landing.capabilities.items.orders.title" },
      { href: "#capabilities", label: "landing.capabilities.items.inventory.title" },
      { href: "#capabilities", label: "landing.capabilities.items.transport.title" },
      { href: "#capabilities", label: "landing.capabilities.items.forecast.title" },
    ],
  },
  {
    heading: "landing.footer.colArchitecture",
    links: [
      { href: "#platform", label: "landing.nav.platform" },
      { href: "#architecture", label: "landing.nav.architecture" },
      { href: "#faq", label: "landing.nav.faq" },
    ],
  },
  {
    heading: "landing.footer.colAccess",
    links: [
      { href: LOGIN_ROUTE, label: "landing.nav.login" },
      { href: REGISTER_ROUTE, label: "landing.nav.register" },
      { href: "/forgot-password", label: "landing.footer.forgotPassword" },
    ],
  },
] as const;

function BrandMark({
  subtitle,
  compact = false,
  priority = false,
}: {
  subtitle?: string;
  compact?: boolean;
  priority?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md border border-border bg-background overflow-hidden",
          compact ? "size-8" : "size-9"
        )}
      >
        <Image
          src="/fav_logo_logix.png"
          alt="LogiX Logo"
          width={compact ? 28 : 32}
          height={compact ? 28 : 32}
          priority={priority}
          className="size-full object-contain p-0.5"
        />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-base font-bold tracking-tight text-foreground">
          Logi<span className="text-primary">X</span>
        </span>
        {subtitle && (
          <span className="hidden sm:inline-block text-[10px] font-medium uppercase tracking-widest text-muted-foreground mt-0.5">
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}

function ShowcaseDataTable({
  headers,
  rows,
  monoThirdCol = false,
  hideInTransitDot = false,
}: {
  headers: [string, string, string, string];
  rows: typeof HERO_ROWS;
  monoThirdCol?: boolean;
  hideInTransitDot?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Table>
      <TableHeader className="bg-muted/35">
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="px-4 text-xs text-muted-foreground">{headers[0]}</TableHead>
          <TableHead className="px-4 text-xs text-muted-foreground">{headers[1]}</TableHead>
          <TableHead className="px-4 text-xs text-muted-foreground">{headers[2]}</TableHead>
          <TableHead className="px-4 text-right text-xs text-muted-foreground">
            {headers[3]}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.c1} className="border-border/70 hover:bg-muted/20">
            <TableCell className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
              {t(row.c1)}
            </TableCell>
            <TableCell className="px-4 py-3 text-xs text-muted-foreground">
              {t(row.c2)}
            </TableCell>
            <TableCell
              className={cn(
                "px-4 py-3 text-xs tabular-nums text-foreground",
                monoThirdCol && "font-mono"
              )}
            >
              {t(row.c3)}
            </TableCell>
            <TableCell className="px-4 py-3 text-right">
              <StatusBadge
                status={row.status}
                label={t(row.sKey)}
                showDot={!(hideInTransitDot && row.status === "in_transit")}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ShowcaseSplit({
  badge,
  title,
  desc,
  bullets,
  children,
}: {
  badge: string;
  title: string;
  desc: string;
  bullets: [string, string, string];
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 rounded-lg border border-border bg-card shadow-xs overflow-hidden lg:grid-cols-12 lg:divide-x lg:divide-border">
      <div className="p-6 sm:p-8 lg:col-span-5 flex flex-col justify-center space-y-4">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {badge}
        </p>
        <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
        <ul className="space-y-2.5 pt-2 border-t border-border/70">
          {bullets.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 text-xs sm:text-sm text-foreground/90"
            >
              <span
                className="mt-2 h-0.5 w-3 shrink-0 bg-primary"
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-5 sm:p-7 bg-muted/20 lg:col-span-7 flex items-center">
        {children}
      </div>
    </div>
  );
}

export function LandingPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [approvalDecision, setApprovalDecision] = React.useState<
    "pending" | "approved" | "rejected"
  >("pending");

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/15 selection:text-foreground">
      {/* Top Enterprise Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href={PUBLIC_LANDING_ROUTE}
            className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BrandMark subtitle={t("landing.nav.brandSubtitle")} priority />
          </Link>

          <nav aria-label="Landing Navigation" className="hidden md:flex items-center gap-1">
            {NAV_ANCHORS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>

            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-border">
              {isAuthenticated ? (
                <Button asChild className="h-9 px-4 text-xs sm:text-sm font-medium rounded-md gap-1.5">
                  <Link href={WORKSPACE_HOME_ROUTE}>
                    <span>{t("landing.nav.workspace")}</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" className="h-9 px-3.5 text-xs sm:text-sm font-medium rounded-md">
                    <Link href={LOGIN_ROUTE}>{t("landing.nav.login")}</Link>
                  </Button>
                  <Button asChild className="h-9 px-4 text-xs sm:text-sm font-medium rounded-md gap-1.5">
                    <Link href={REGISTER_ROUTE}>
                      <span>{t("landing.nav.register")}</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </>
              )}
            </div>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden size-9 rounded-md"
                  aria-label={t("landing.nav.openMenu")}
                >
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-6 flex flex-col gap-6">
                <SheetTitle>
                  <BrandMark compact />
                </SheetTitle>
                <nav className="flex flex-col gap-1">
                  {NAV_ANCHORS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {t(item.key)}
                    </Link>
                  ))}
                </nav>
                <div className="flex items-center justify-between border-y border-border py-4">
                  <LocaleSwitcher />
                  <ThemeToggle />
                </div>
                <div className="mt-auto flex flex-col gap-2.5">
                  {isAuthenticated ? (
                    <Button asChild className="h-10 w-full text-sm font-medium rounded-md gap-2">
                      <Link href={WORKSPACE_HOME_ROUTE} onClick={() => setMobileOpen(false)}>
                        <span>{t("landing.nav.workspace")}</span>
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button asChild variant="outline" className="h-10 w-full text-sm font-medium rounded-md">
                        <Link href={LOGIN_ROUTE} onClick={() => setMobileOpen(false)}>
                          {t("landing.nav.login")}
                        </Link>
                      </Button>
                      <Button asChild className="h-10 w-full text-sm font-medium rounded-md gap-2">
                        <Link href={REGISTER_ROUTE} onClick={() => setMobileOpen(false)}>
                          <span>{t("landing.nav.register")}</span>
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* 1. Hero & Console Preview */}
        <section className="relative overflow-hidden border-b border-border bg-background">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-35 dark:opacity-25"
          />
          <CornerPolygons corners={["top-left", "bottom-right"]} size="lg" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-16 sm:pb-20">
            <Reveal initialVisible>
              <div className="max-w-3xl space-y-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {t("landing.hero.eyebrow")}
                </p>
                <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.12]">
                  {t("landing.hero.title")}
                </h1>
                <p className="max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {t("landing.hero.subtitle")}
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <Button asChild className="h-10 sm:h-11 px-6 text-sm font-semibold rounded-md gap-2">
                    <Link href={isAuthenticated ? WORKSPACE_HOME_ROUTE : REGISTER_ROUTE}>
                      <span>
                        {t(
                          isAuthenticated
                            ? "landing.hero.primaryCtaAuth"
                            : "landing.hero.primaryCta"
                        )}
                      </span>
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-10 sm:h-11 px-5 text-sm font-medium rounded-md border-border bg-background"
                  >
                    <Link href={isAuthenticated ? "#platform" : LOGIN_ROUTE}>
                      {t(
                        isAuthenticated
                          ? "landing.hero.secondaryCta"
                          : "landing.hero.loginCta"
                      )}
                    </Link>
                  </Button>
                </div>
              </div>
            </Reveal>

            <Reveal initialVisible delayMs={120} className="mt-10 sm:mt-14">
              <Card className="relative gap-0 py-0 rounded-lg border border-border bg-card shadow-sm ring-0 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3 sm:px-6">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-sm border border-border bg-background overflow-hidden">
                      <Image
                        src="/fav_logo_logix.png"
                        alt="LogiX Icon"
                        width={20}
                        height={20}
                        className="size-full object-contain p-0.5"
                      />
                    </div>
                    <span className="truncate text-xs font-semibold text-foreground">
                      {t("landing.hero.preview.orgBadge")}
                    </span>
                  </div>
                  <span className="hidden sm:inline-block font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground shrink-0">
                    {t("landing.hero.preview.envBadge")}
                  </span>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 space-y-5">
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                    {HERO_KPIS.map((kpi) => (
                      <StatCard
                        key={kpi.title}
                        title={t(kpi.title)}
                        value={t(kpi.value)}
                        description={t(kpi.note)}
                        className="rounded-md border-border bg-background shadow-none hover:shadow-none hover:border-primary/40"
                      />
                    ))}
                  </div>

                  <div className="rounded-md border border-border bg-background overflow-hidden">
                    <div className="border-b border-border bg-muted/30 px-4 py-2.5">
                      <span className="text-xs font-semibold text-foreground">
                        {t("landing.hero.preview.tableTitle")}
                      </span>
                    </div>
                    <ShowcaseDataTable
                      headers={[
                        t("landing.hero.preview.colCode"),
                        t("landing.hero.preview.colRoute"),
                        t("landing.hero.preview.colProgress"),
                        t("landing.hero.preview.colStatus"),
                      ]}
                      rows={HERO_ROWS}
                      monoThirdCol
                      hideInTransitDot
                    />
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </section>

        {/* 2. Architecture Pillar Strip */}
        <section className="border-b border-border bg-muted/35">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-px bg-border border-x border-border sm:grid-cols-2 lg:grid-cols-4">
              {PILLARS.map((pillar, idx) => (
                <div
                  key={pillar.code}
                  className="bg-muted/35 hover:bg-card transition-colors duration-200 p-6 sm:p-7"
                >
                  <Reveal delayMs={idx * 70}>
                    <span className="font-mono text-[11px] font-semibold tracking-wider text-primary">
                      {pillar.code}
                    </span>
                    <h2 className="mt-2 text-sm font-semibold tracking-tight text-foreground">
                      {t(pillar.title)}
                    </h2>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {t(pillar.desc)}
                    </p>
                  </Reveal>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Core Capabilities Grid */}
        <section
          id="capabilities"
          className="relative overflow-hidden border-b border-border bg-background py-16 sm:py-20 lg:py-24"
        >
          <CornerPolygons corners={["top-right", "bottom-left"]} size="sm" />
          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="max-w-2xl space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {t("landing.capabilities.eyebrow")}
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {t("landing.capabilities.title")}
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {t("landing.capabilities.subtitle")}
                </p>
              </div>
            </Reveal>

            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {CAPABILITIES.map((cap, idx) => (
                <Reveal key={cap.tag} delayMs={(idx % 3) * 80} className="h-full">
                  <Card className="h-full gap-3 rounded-lg border border-border border-t-2 border-t-border bg-card py-6 ring-0 transition-all duration-300 hover:border-t-primary hover:shadow-sm">
                    <CardHeader className="px-6 gap-2.5">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">
                        {t(cap.tag)}
                      </span>
                      <CardTitle className="text-base font-semibold tracking-tight text-foreground">
                        {t(cap.title)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-6">
                      <CardDescription className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                        {t(cap.desc)}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Interactive Platform Showcase */}
        <section
          id="platform"
          className="relative overflow-hidden border-b border-border bg-muted/35 py-16 sm:py-20 lg:py-24"
        >
          <CornerPolygons corners={["top-left", "bottom-right"]} size="sm" />
          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="max-w-2xl space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {t("landing.showcase.eyebrow")}
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {t("landing.showcase.title")}
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {t("landing.showcase.subtitle")}
                </p>
              </div>
            </Reveal>

            <Reveal delayMs={80}>
              <Tabs defaultValue="orders" className="mt-8 sm:mt-10 gap-6">
                <TabsList className="grid w-full grid-cols-2 gap-1 rounded-md border border-border bg-card p-1 group-data-horizontal/tabs:h-auto sm:inline-flex sm:w-fit sm:group-data-horizontal/tabs:h-10">
                  <TabsTrigger
                    value="orders"
                    className="rounded-sm px-3.5 py-2 text-xs sm:text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {t("landing.showcase.tabs.orders")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="transport"
                    className="rounded-sm px-3.5 py-2 text-xs sm:text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {t("landing.showcase.tabs.transport")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="forecast"
                    className="rounded-sm px-3.5 py-2 text-xs sm:text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {t("landing.showcase.tabs.forecast")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="copilot"
                    className="rounded-sm px-3.5 py-2 text-xs sm:text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {t("landing.showcase.tabs.copilot")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="orders"
                  className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
                >
                  <ShowcaseSplit
                    badge={t("landing.showcase.ordersTab.badge")}
                    title={t("landing.showcase.ordersTab.title")}
                    desc={t("landing.showcase.ordersTab.desc")}
                    bullets={[
                      t("landing.showcase.ordersTab.bullets.b1"),
                      t("landing.showcase.ordersTab.bullets.b2"),
                      t("landing.showcase.ordersTab.bullets.b3"),
                    ]}
                  >
                    <Card className="w-full gap-0 py-0 rounded-md border border-border bg-card shadow-none ring-0 overflow-hidden">
                      <ShowcaseDataTable
                        headers={[
                          t("landing.showcase.ordersTab.colOrder"),
                          t("landing.showcase.ordersTab.colWarehouse"),
                          t("landing.showcase.ordersTab.colItems"),
                          t("landing.showcase.ordersTab.colStatus"),
                        ]}
                        rows={ORDERS_ROWS}
                      />
                    </Card>
                  </ShowcaseSplit>
                </TabsContent>

                <TabsContent
                  value="transport"
                  className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
                >
                  <ShowcaseSplit
                    badge={t("landing.showcase.transportTab.badge")}
                    title={t("landing.showcase.transportTab.title")}
                    desc={t("landing.showcase.transportTab.desc")}
                    bullets={[
                      t("landing.showcase.transportTab.bullets.b1"),
                      t("landing.showcase.transportTab.bullets.b2"),
                      t("landing.showcase.transportTab.bullets.b3"),
                    ]}
                  >
                    <Card className="w-full gap-4 rounded-md border border-border bg-card py-5 shadow-none ring-0">
                      <CardHeader className="px-5 flex flex-row items-center justify-between gap-3">
                        <CardTitle className="font-mono text-sm font-semibold">
                          {t("landing.showcase.transportTab.cardTitle")}
                        </CardTitle>
                        <span className="rounded-sm border border-primary/30 bg-primary/5 px-2.5 py-0.5 font-mono text-[11px] font-medium text-primary">
                          {t("landing.showcase.transportTab.approvedBadge")}
                        </span>
                      </CardHeader>
                      <CardContent className="px-5 space-y-4">
                        <dl className="grid grid-cols-2 gap-4 rounded-md border border-border bg-muted/25 p-3.5">
                          <div>
                            <dt className="text-[11px] text-muted-foreground">
                              {t("landing.showcase.transportTab.distanceLabel")}
                            </dt>
                            <dd className="mt-1 font-mono text-sm font-semibold tabular-nums">
                              {t("landing.showcase.transportTab.distanceValue")}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[11px] text-muted-foreground">
                              {t("landing.showcase.transportTab.durationLabel")}
                            </dt>
                            <dd className="mt-1 font-mono text-sm font-semibold tabular-nums">
                              {t("landing.showcase.transportTab.durationValue")}
                            </dd>
                          </div>
                        </dl>
                        <div className="space-y-2">
                          {[
                            t("landing.showcase.transportTab.stop1"),
                            t("landing.showcase.transportTab.stop2"),
                            t("landing.showcase.transportTab.stop3"),
                          ].map((stop, idx) => (
                            <div
                              key={stop}
                              className="flex items-center gap-3 rounded-md border border-border/80 bg-background px-3.5 py-2.5 text-xs"
                            >
                              <span className="font-mono text-[11px] font-semibold text-primary shrink-0">
                                {`0${idx + 1}`}
                              </span>
                              <span>{stop}</span>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {t("landing.showcase.transportTab.progressLabel")}
                            </span>
                            <span className="font-mono font-semibold tabular-nums">2 / 3</span>
                          </div>
                          <Progress value={67} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  </ShowcaseSplit>
                </TabsContent>

                <TabsContent
                  value="forecast"
                  className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
                >
                  <ShowcaseSplit
                    badge={t("landing.showcase.forecastTab.badge")}
                    title={t("landing.showcase.forecastTab.title")}
                    desc={t("landing.showcase.forecastTab.desc")}
                    bullets={[
                      t("landing.showcase.forecastTab.bullets.b1"),
                      t("landing.showcase.forecastTab.bullets.b2"),
                      t("landing.showcase.forecastTab.bullets.b3"),
                    ]}
                  >
                    <Card className="w-full gap-0 py-0 rounded-md border border-border bg-card shadow-none ring-0 overflow-hidden">
                      <ShowcaseDataTable
                        headers={[
                          t("landing.showcase.forecastTab.colSku"),
                          t("landing.showcase.forecastTab.colWarehouse"),
                          t("landing.showcase.forecastTab.colDemand"),
                          t("landing.showcase.forecastTab.colRisk"),
                        ]}
                        rows={FORECAST_ROWS}
                        monoThirdCol
                      />
                    </Card>
                  </ShowcaseSplit>
                </TabsContent>

                <TabsContent
                  value="copilot"
                  className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
                >
                  <ShowcaseSplit
                    badge={t("landing.showcase.copilotTab.badge")}
                    title={t("landing.showcase.copilotTab.title")}
                    desc={t("landing.showcase.copilotTab.desc")}
                    bullets={[
                      t("landing.showcase.copilotTab.bullets.b1"),
                      t("landing.showcase.copilotTab.bullets.b2"),
                      t("landing.showcase.copilotTab.bullets.b3"),
                    ]}
                  >
                    <div className="w-full space-y-4">
                      <div className="rounded-md border border-border bg-card p-4 text-xs">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                          {t("landing.showcase.copilotTab.promptLabel")}
                        </span>
                        <p className="mt-1.5 text-sm text-foreground leading-relaxed">
                          {t("landing.showcase.copilotTab.promptText")}
                        </p>
                      </div>

                      <Card className="gap-4 rounded-md border border-border bg-card py-5 shadow-none ring-0">
                        <CardHeader className="px-5 space-y-1">
                          <CardTitle className="text-sm font-semibold">
                            {t("landing.showcase.copilotTab.cardTitle")}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {t("landing.showcase.copilotTab.cardSubtitle")}
                          </CardDescription>
                        </CardHeader>
                        <Separator />
                        <CardContent className="px-5 space-y-3">
                          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                            <div className="rounded-md border border-border bg-muted/25 px-3 py-2.5">
                              <dt className="text-[11px] text-muted-foreground">
                                {t("landing.showcase.copilotTab.fieldTrip")}
                              </dt>
                              <dd className="mt-1 font-mono font-semibold text-foreground">
                                {t("landing.showcase.copilotTab.fieldTripVal")}
                              </dd>
                            </div>
                            <div className="rounded-md border border-border bg-muted/25 px-3 py-2.5">
                              <dt className="text-[11px] text-muted-foreground">
                                {t("landing.showcase.copilotTab.fieldPlan")}
                              </dt>
                              <dd className="mt-1 font-mono font-medium text-foreground">
                                {t("landing.showcase.copilotTab.fieldPlanVal")}
                              </dd>
                            </div>
                          </dl>

                          {approvalDecision !== "pending" && (
                            <div
                              role="status"
                              className={cn(
                                "rounded-md border px-3.5 py-2.5 text-xs font-medium animate-in fade-in-0 duration-200 motion-reduce:animate-none",
                                approvalDecision === "approved"
                                  ? "border-primary/30 bg-primary/10 text-primary"
                                  : "border-border bg-muted/40 text-muted-foreground"
                              )}
                            >
                              {t(
                                approvalDecision === "approved"
                                  ? "landing.showcase.copilotTab.approvedNotice"
                                  : "landing.showcase.copilotTab.rejectedNotice"
                              )}
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="px-5 flex flex-wrap items-center justify-end gap-2">
                          {approvalDecision === "pending" ? (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setApprovalDecision("rejected")}
                                className="h-9 px-3.5 text-xs font-medium rounded-md gap-1.5"
                              >
                                <X className="size-3.5" />
                                <span>{t("landing.showcase.copilotTab.rejectBtn")}</span>
                              </Button>
                              <Button
                                type="button"
                                onClick={() => setApprovalDecision("approved")}
                                className="h-9 px-4 text-xs font-semibold rounded-md gap-1.5"
                              >
                                <Check className="size-3.5" />
                                <span>{t("landing.showcase.copilotTab.approveBtn")}</span>
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setApprovalDecision("pending")}
                              className="h-9 px-3.5 text-xs font-medium rounded-md gap-1.5"
                            >
                              <RotateCcw className="size-3.5" />
                              <span>{t("landing.showcase.copilotTab.resetBtn")}</span>
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    </div>
                  </ShowcaseSplit>
                </TabsContent>
              </Tabs>
            </Reveal>
          </div>
        </section>

        {/* 5. Operational Workflow Grid */}
        <section
          id="architecture"
          className="relative overflow-hidden border-b border-border bg-background py-16 sm:py-20 lg:py-24"
        >
          <CornerPolygons corners={["top-right", "bottom-left"]} size="sm" />
          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="max-w-2xl space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {t("landing.workflow.eyebrow")}
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {t("landing.workflow.title")}
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {t("landing.workflow.subtitle")}
                </p>
              </div>
            </Reveal>

            <div className="mt-10 grid grid-cols-1 gap-px bg-border border border-border rounded-lg overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
              {WORKFLOW_STEPS.map((step, idx) => (
                <div
                  key={step.num}
                  className="bg-card p-6 sm:p-7 transition-colors duration-200 hover:bg-muted/25"
                >
                  <Reveal delayMs={idx * 80} className="h-full flex flex-col">
                    <div className="space-y-2">
                      <span className="font-mono text-lg font-bold tracking-tight text-primary">
                        {t(step.num)}
                      </span>
                      <div className="h-0.5 w-8 bg-primary/40" aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 text-sm sm:text-base font-semibold tracking-tight text-foreground">
                      {t(step.title)}
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                      {t(step.desc)}
                    </p>
                  </Reveal>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Enterprise FAQ (2-column split) */}
        <section id="faq" className="border-b border-border bg-muted/35 py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12 items-start">
              <div className="lg:col-span-4">
                <Reveal>
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      {t("landing.faq.eyebrow")}
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                      {t("landing.faq.title")}
                    </h2>
                  </div>
                </Reveal>
              </div>

              <div className="lg:col-span-8">
                <Reveal delayMs={80}>
                  <Accordion type="single" collapsible className="rounded-lg border border-border bg-card">
                    {FAQ_ITEMS.map((item, idx) => (
                      <AccordionItem key={item.q} value={`item-${idx + 1}`}>
                        <AccordionTrigger className="px-6 py-4 text-sm font-medium text-foreground hover:no-underline hover:bg-muted/30 cursor-pointer">
                          {t(item.q)}
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-4 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                          {t(item.a)}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Final CTA Band */}
        <section className="bg-background py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="relative overflow-hidden flex flex-col items-start justify-between gap-6 rounded-lg border border-border bg-muted/30 p-8 sm:p-10 lg:flex-row lg:items-center transition-colors duration-300 hover:border-primary/40">
                <CornerPolygons corners={["top-right", "bottom-left"]} size="sm" />
                <div className="relative z-10 max-w-2xl space-y-2">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {t("landing.cta.title")}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t("landing.cta.subtitle")}
                  </p>
                </div>
                <div className="relative z-10 flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-3 shrink-0">
                  {isAuthenticated ? (
                    <Button asChild className="h-10 px-5 text-sm font-semibold rounded-md gap-2">
                      <Link href={WORKSPACE_HOME_ROUTE}>
                        <span>{t("landing.cta.primaryAuth")}</span>
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button
                        asChild
                        variant="outline"
                        className="h-10 px-5 text-sm font-medium rounded-md border-border bg-background"
                      >
                        <Link href={LOGIN_ROUTE}>{t("landing.cta.secondary")}</Link>
                      </Button>
                      <Button asChild className="h-10 px-5 text-sm font-semibold rounded-md gap-2">
                        <Link href={REGISTER_ROUTE}>
                          <span>{t("landing.cta.primary")}</span>
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* Enterprise Footer */}
      <footer className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <Reveal>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-3 sm:col-span-2 lg:col-span-1">
                <Link href={PUBLIC_LANDING_ROUTE} className="inline-flex">
                  <BrandMark compact />
                </Link>
                <p className="text-xs leading-relaxed text-muted-foreground max-w-xs">
                  {t("landing.footer.description")}
                </p>
              </div>
              {FOOTER_COLS.map((col) => (
                <div key={col.heading} className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    {t(col.heading)}
                  </h3>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        <Link href={link.href} className="hover:text-foreground transition-colors">
                          {t(link.label)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Reveal>
          <div className="mt-10 flex flex-col-reverse items-start justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-center">
            <p className="text-xs text-muted-foreground">{t("landing.footer.copyright")}</p>
            <div className="flex items-center gap-2.5">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

