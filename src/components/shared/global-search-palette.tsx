"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  Boxes,
  Building2,
  ClipboardList,
  Contact,
  ContactRound,
  CornerDownLeft,
  Globe,
  Headset,
  LayoutDashboard,
  Loader2,
  MapPinned,
  Moon,
  Package,
  PackageOpen,
  PlusCircle,
  Route,
  Search,
  Settings,
  Sparkles,
  Sun,
  TrendingUp,
  Truck,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { WORKSPACE_HOME_ROUTE } from "@/lib/config/routes";
import { listOrdersApi } from "@/features/orders/api/orders.api";
import { ORDER_PERMISSIONS } from "@/features/orders";
import { listShipmentsApi } from "@/features/shipments/api/shipments.api";
import { SHIPMENT_PERMISSIONS } from "@/features/shipments";
import { listTripsApi } from "@/features/transport/api/trips.api";
import { TRANSPORT_PERMISSIONS } from "@/features/transport";
import { listWarehousesApi } from "@/features/master-data/api/warehouses.api";
import { listProductsApi } from "@/features/master-data/api/products.api";
import { listCustomersApi } from "@/features/master-data/api/customers.api";
import { listVehiclesApi } from "@/features/master-data/api/vehicles.api";
import { DRIVER_PERMISSIONS } from "@/features/master-data";

interface PaletteItem {
  id: string;
  groupKey:
    | "orders"
    | "shipments"
    | "trips"
    | "masterData"
    | "navigation"
    | "quickActions";
  title: string;
  subtitle?: string;
  badgeText: string;
  badgeVariant?: "primary" | "emerald" | "amber" | "blue" | "muted";
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

export function GlobalSearchPalette() {
  const router = useRouter();
  const { t, locale, setLocale } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const { hasPermission, hasAnyPermission, isSuperAdmin } = useAuth();

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const [orderItems, setOrderItems] = React.useState<PaletteItem[]>([]);
  const [shipmentItems, setShipmentItems] = React.useState<PaletteItem[]>([]);
  const [tripItems, setTripItems] = React.useState<PaletteItem[]>([]);
  const [masterItems, setMasterItems] = React.useState<PaletteItem[]>([]);

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const itemRefs = React.useRef<Map<number, HTMLButtonElement>>(new Map());

  const canReadOrders = isSuperAdmin || hasPermission(ORDER_PERMISSIONS.read);
  const canCreateOrders =
    isSuperAdmin || hasPermission(ORDER_PERMISSIONS.create);
  const canReadShipments =
    isSuperAdmin || hasPermission(SHIPMENT_PERMISSIONS.read);
  const canReadTrips =
    isSuperAdmin || hasPermission(TRANSPORT_PERMISSIONS.tripRead);
  const canCreateTrips =
    isSuperAdmin || hasPermission(TRANSPORT_PERMISSIONS.tripCreate);
  const canReadDriverTrips =
    isSuperAdmin || hasPermission(TRANSPORT_PERMISSIONS.driverRead);
  const canReadDrivers =
    isSuperAdmin || hasPermission(DRIVER_PERMISSIONS.read);
  const canReadInventory =
    isSuperAdmin ||
    hasAnyPermission([
      "inventory:stock:read",
      "inventory:stock:adjust",
      "inventory:warehouse:read",
    ]);

  // Global keyboard shortcut Ctrl+K / Cmd+K
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    setActiveIndex(0);
  }, []);

  const closeAndNavigate = React.useCallback(
    (href: string) => {
      handleOpenChange(false);
      router.push(href);
    },
    [router, handleOpenChange]
  );

  // Live operational entity search (debounced)
  React.useEffect(() => {
    if (!open) return;

    const trimmed = query.trim();
    const controller = new AbortController();

    const timer = window.setTimeout(
      async () => {
        setIsSearching(true);
        try {
          // When query is empty, load a compact preview of recent Orders & Trips
          if (!trimmed) {
            const [ordRes, trpRes] = await Promise.allSettled([
              canReadOrders
                ? listOrdersApi({ pageSize: 3 }, controller.signal)
                : Promise.resolve(null),
              canReadTrips
                ? listTripsApi({ page: 1, pageSize: 3 }, controller.signal)
                : Promise.resolve(null),
            ]);

            if (controller.signal.aborted) return;

            if (ordRes.status === "fulfilled" && ordRes.value?.items) {
              setOrderItems(
                ordRes.value.items.slice(0, 3).map((ord) => ({
                  id: `ord-${ord.id}`,
                  groupKey: "orders",
                  title: `${ord.orderNumber} · ${ord.customerName}`,
                  subtitle: `${ord.warehouseName} · ${ord.status}`,
                  badgeText: t("globalSearch.badges.order"),
                  badgeVariant: "blue",
                  icon: ClipboardList,
                  onSelect: () => closeAndNavigate(`/orders/${ord.id}`),
                }))
              );
            } else {
              setOrderItems([]);
            }

            if (trpRes.status === "fulfilled" && trpRes.value?.items) {
              setTripItems(
                trpRes.value.items.slice(0, 3).map((trip) => ({
                  id: `trp-${trip.id}`,
                  groupKey: "trips",
                  title: trip.tripNumber,
                  subtitle: `${trip.depotSnapshot.name} (${trip.depotSnapshot.province}) · ${trip.status}`,
                  badgeText: t("globalSearch.badges.trip"),
                  badgeVariant: "emerald",
                  icon: Route,
                  onSelect: () => closeAndNavigate(`/transport/${trip.id}`),
                }))
              );
            } else {
              setTripItems([]);
            }

            setShipmentItems([]);
            setMasterItems([]);
            return;
          }

          const normalized = trimmed.toLowerCase();

          const [
            ordRes,
            shpRes,
            trpRes,
            whRes,
            prodRes,
            custRes,
            vehRes,
          ] = await Promise.allSettled([
            canReadOrders
              ? listOrdersApi({ q: trimmed, pageSize: 5 }, controller.signal)
              : Promise.resolve(null),
            canReadShipments
              ? listShipmentsApi({ pageSize: 25 }, controller.signal)
              : Promise.resolve(null),
            canReadTrips
              ? listTripsApi(
                  { search: trimmed, page: 1, pageSize: 5 },
                  controller.signal
                )
              : Promise.resolve(null),
            listWarehousesApi({ q: trimmed, pageSize: 3 }),
            listProductsApi({ q: trimmed, pageSize: 3 }),
            listCustomersApi({ q: trimmed, pageSize: 3 }),
            listVehiclesApi({ q: trimmed, pageSize: 3 }),
          ]);

          if (controller.signal.aborted) return;

          if (ordRes.status === "fulfilled" && ordRes.value?.items) {
            setOrderItems(
              ordRes.value.items.slice(0, 5).map((ord) => ({
                id: `ord-${ord.id}`,
                groupKey: "orders",
                title: `${ord.orderNumber} · ${ord.customerName}`,
                subtitle: `${ord.warehouseName} · ${ord.status}`,
                badgeText: t("globalSearch.badges.order"),
                badgeVariant: "blue",
                icon: ClipboardList,
                onSelect: () => closeAndNavigate(`/orders/${ord.id}`),
              }))
            );
          } else {
            setOrderItems([]);
          }

          if (shpRes.status === "fulfilled" && shpRes.value?.items) {
            const matchedShipments = shpRes.value.items
              .filter(
                (s) =>
                  s.shipmentNumber.toLowerCase().includes(normalized) ||
                  s.orderNumber.toLowerCase().includes(normalized) ||
                  s.customerSnapshot.name.toLowerCase().includes(normalized) ||
                  s.warehouseSnapshot.name.toLowerCase().includes(normalized) ||
                  s.deliveryAddressSnapshot.province
                    .toLowerCase()
                    .includes(normalized)
              )
              .slice(0, 5);

            setShipmentItems(
              matchedShipments.map((s) => ({
                id: `shp-${s.id}`,
                groupKey: "shipments",
                title: `${s.shipmentNumber} · ${s.customerSnapshot.name}`,
                subtitle: `${s.orderNumber} · ${s.warehouseSnapshot.name} → ${s.deliveryAddressSnapshot.province} (${s.status})`,
                badgeText: t("globalSearch.badges.shipment"),
                badgeVariant: "amber",
                icon: PackageOpen,
                onSelect: () => closeAndNavigate(`/shipments/${s.id}`),
              }))
            );
          } else {
            setShipmentItems([]);
          }

          if (trpRes.status === "fulfilled" && trpRes.value?.items) {
            setTripItems(
              trpRes.value.items.slice(0, 5).map((trip) => ({
                id: `trp-${trip.id}`,
                groupKey: "trips",
                title: trip.tripNumber,
                subtitle: `${trip.depotSnapshot.name} (${trip.depotSnapshot.province}) · ${trip.status}`,
                badgeText: t("globalSearch.badges.trip"),
                badgeVariant: "emerald",
                icon: Route,
                onSelect: () => closeAndNavigate(`/transport/${trip.id}`),
              }))
            );
          } else {
            setTripItems([]);
          }

          const nextMaster: PaletteItem[] = [];
          if (whRes.status === "fulfilled" && whRes.value?.items) {
            for (const wh of whRes.value.items.slice(0, 3)) {
              nextMaster.push({
                id: `wh-${wh.id}`,
                groupKey: "masterData",
                title: `${wh.code} · ${wh.name}`,
                subtitle: [wh.addressLine, wh.district, wh.province]
                  .filter(Boolean)
                  .join(", "),
                badgeText: t("globalSearch.badges.warehouse"),
                badgeVariant: "primary",
                icon: Warehouse,
                onSelect: () => closeAndNavigate("/master-data/warehouses"),
              });
            }
          }
          if (prodRes.status === "fulfilled" && prodRes.value?.items) {
            for (const prod of prodRes.value.items.slice(0, 3)) {
              nextMaster.push({
                id: `prod-${prod.id}`,
                groupKey: "masterData",
                title: `${prod.sku} · ${prod.name}`,
                subtitle: `${prod.baseUnit} · ${prod.status}`,
                badgeText: t("globalSearch.badges.product"),
                badgeVariant: "primary",
                icon: Package,
                onSelect: () => closeAndNavigate("/master-data/products"),
              });
            }
          }
          if (custRes.status === "fulfilled" && custRes.value?.items) {
            for (const cust of custRes.value.items.slice(0, 3)) {
              nextMaster.push({
                id: `cust-${cust.id}`,
                groupKey: "masterData",
                title: `${cust.code} · ${cust.name}`,
                subtitle: [cust.phone, cust.email].filter(Boolean).join(" · "),
                badgeText: t("globalSearch.badges.customer"),
                badgeVariant: "primary",
                icon: Contact,
                onSelect: () => closeAndNavigate("/master-data/customers"),
              });
            }
          }
          if (vehRes.status === "fulfilled" && vehRes.value?.items) {
            for (const veh of vehRes.value.items.slice(0, 2)) {
              nextMaster.push({
                id: `veh-${veh.id}`,
                groupKey: "masterData",
                title: `${veh.licensePlate} · ${veh.code}`,
                subtitle: `${veh.capacityWeight} kg · ${veh.status}`,
                badgeText: t("globalSearch.badges.vehicle"),
                badgeVariant: "primary",
                icon: Truck,
                onSelect: () => closeAndNavigate("/master-data/vehicles"),
              });
            }
          }
          setMasterItems(nextMaster);
        } finally {
          if (!controller.signal.aborted) {
            setIsSearching(false);
          }
        }
      },
      trimmed ? 200 : 0
    );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    open,
    query,
    canReadOrders,
    canReadShipments,
    canReadTrips,
    closeAndNavigate,
    t,
  ]);

  // Workspace navigation items filtered by permission & query
  const navigationItems = React.useMemo<PaletteItem[]>(() => {
    const candidates: Array<{
      id: string;
      title: string;
      href: string;
      keywords: string;
      icon: React.ComponentType<{ className?: string }>;
      allowed: boolean;
    }> = [
      {
        id: "nav-dashboard",
        title: t("nav.overview"),
        href: WORKSPACE_HOME_ROUTE,
        keywords: "dashboard overview tong quan thong ke",
        icon: LayoutDashboard,
        allowed: true,
      },
      {
        id: "nav-orders",
        title: t("orders.navTitle"),
        href: "/orders",
        keywords: "orders sales don hang ban hang so-",
        icon: ClipboardList,
        allowed: canReadOrders,
      },
      {
        id: "nav-orders-new",
        title: t("globalSearch.pages.createOrder"),
        href: "/orders/new",
        keywords: "new order create tao don hang moi",
        icon: PlusCircle,
        allowed: canCreateOrders,
      },
      {
        id: "nav-shipments",
        title: t("shipments.navTitle"),
        href: "/shipments",
        keywords: "shipments pool van don lo hang shp-",
        icon: PackageOpen,
        allowed: canReadShipments,
      },
      {
        id: "nav-transport",
        title: t("routes.navTitle"),
        href: "/transport",
        keywords: "routes trips transport lo trinh chuyen xe tuyen duong tr-",
        icon: Route,
        allowed: canReadTrips,
      },
      {
        id: "nav-transport-new",
        title: t("globalSearch.pages.createTrip"),
        href: "/transport/new",
        keywords: "new trip create route tao chuyen xe moi",
        icon: PlusCircle,
        allowed: canCreateTrips,
      },
      {
        id: "nav-driver-trips",
        title: t("transport.driver.navTitle"),
        href: "/driver/trips",
        keywords: "driver trips chuyen giao hang cua toi tai xe",
        icon: MapPinned,
        allowed: canReadDriverTrips,
      },
      {
        id: "nav-inventory",
        title: t("inventory.navTitle"),
        href: "/inventory",
        keywords: "inventory stock ton kho nhap xuat",
        icon: Boxes,
        allowed: canReadInventory,
      },
      {
        id: "nav-forecast",
        title: t("forecast.navTitle"),
        href: "/forecast",
        keywords: "forecast demand prophet du bao nhu cau ton kho ai",
        icon: TrendingUp,
        allowed: true,
      },
      {
        id: "nav-warehouses",
        title: t("masterData.warehouse.title"),
        href: "/master-data/warehouses",
        keywords: "warehouses kho hang dia chi",
        icon: Warehouse,
        allowed: true,
      },
      {
        id: "nav-products",
        title: t("masterData.product.title"),
        href: "/master-data/products",
        keywords: "products sku san pham hang hoa",
        icon: Package,
        allowed: true,
      },
      {
        id: "nav-customers",
        title: t("masterData.customer.title"),
        href: "/master-data/customers",
        keywords: "customers khach hang doi tac",
        icon: Contact,
        allowed: true,
      },
      {
        id: "nav-vehicles",
        title: t("masterData.vehicle.title"),
        href: "/master-data/vehicles",
        keywords: "vehicles trucks phuong tien xe tai bien so",
        icon: Truck,
        allowed: true,
      },
      {
        id: "nav-drivers",
        title: t("masterData.driver.title"),
        href: "/master-data/drivers",
        keywords: "drivers tai xe lai xe",
        icon: ContactRound,
        allowed: canReadDrivers,
      },
      {
        id: "nav-admin-orgs",
        title: t("admin.organizations.title"),
        href: "/admin/organizations",
        keywords: "admin organizations tenants to chuc doanh nghiep",
        icon: Building2,
        allowed: isSuperAdmin,
      },
      {
        id: "nav-admin-users",
        title: t("admin.users.title"),
        href: "/admin/users",
        keywords: "admin users nguoi dung tai khoan",
        icon: Users,
        allowed: isSuperAdmin,
      },
      {
        id: "nav-admin-contacts",
        title: t("admin.contacts.title"),
        href: "/admin/contacts",
        keywords: "admin contacts demo leads khach hang lien he",
        icon: Headset,
        allowed: isSuperAdmin,
      },
      {
        id: "nav-settings-account",
        title: t("globalSearch.pages.accountSettings"),
        href: "/settings/account",
        keywords: "settings account profile cai dat tai khoan ho so",
        icon: Settings,
        allowed: true,
      },
      {
        id: "nav-settings-org",
        title: t("globalSearch.pages.organizationSettings"),
        href: "/settings/organization",
        keywords: "settings organization tenant cai dat to chuc cong ty",
        icon: Building2,
        allowed: true,
      },
    ];

    const trimmed = query.trim().toLowerCase();
    return candidates
      .filter((item) => {
        if (!item.allowed) return false;
        if (!trimmed) return true;
        return (
          item.title.toLowerCase().includes(trimmed) ||
          item.href.toLowerCase().includes(trimmed) ||
          item.keywords.includes(trimmed)
        );
      })
      .slice(0, trimmed ? 6 : 7)
      .map((item) => ({
        id: item.id,
        groupKey: "navigation" as const,
        title: item.title,
        subtitle: item.href,
        badgeText: t("globalSearch.badges.page"),
        badgeVariant: "muted" as const,
        icon: item.icon,
        onSelect: () => closeAndNavigate(item.href),
      }));
  }, [
    query,
    t,
    canReadOrders,
    canCreateOrders,
    canReadShipments,
    canReadTrips,
    canCreateTrips,
    canReadDriverTrips,
    canReadInventory,
    canReadDrivers,
    isSuperAdmin,
    closeAndNavigate,
  ]);

  // Quick actions & AI Copilot handoff
  const quickActionItems = React.useMemo<PaletteItem[]>(() => {
    const trimmed = query.trim();
    const isDark = resolvedTheme === "dark";

    const items: PaletteItem[] = [
      {
        id: "act-copilot",
        groupKey: "quickActions",
        title: trimmed
          ? t("globalSearch.actions.askCopilotWithQuery", { query: trimmed })
          : t("globalSearch.actions.askCopilotDefault"),
        subtitle: t("globalSearch.actions.askCopilotSubtitle"),
        badgeText: "AI",
        badgeVariant: "emerald",
        icon: Sparkles,
        onSelect: () => {
          handleOpenChange(false);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("logix:open-copilot", {
                detail: { prompt: trimmed },
              })
            );

            // Self-healing fallback: ensure sidebar is open after Dialog closes
            window.setTimeout(() => {
              const aside = document.querySelector(
                "aside[data-copilot-sidebar]"
              ) as HTMLElement | null;
              const toggleBtn = document.querySelector(
                'button[data-slot="chat-toggle-button"], button[data-testid="copilot-chat-toggle"], button.copilotKitButton'
              ) as HTMLButtonElement | null;

              const stillClosed = aside
                ? aside.getAttribute("aria-hidden") !== "false"
                : toggleBtn?.getAttribute("data-state") === "closed";

              if (toggleBtn && stillClosed) {
                toggleBtn.click();
              }
            }, 120);
          }
        },
      },
    ];

    const normalized = trimmed.toLowerCase();
    if (
      !normalized ||
      "theme dark light giao dien sang toi".includes(normalized)
    ) {
      items.push({
        id: "act-theme",
        groupKey: "quickActions",
        title: t("globalSearch.actions.switchTheme"),
        subtitle: isDark ? t("theme.light") : t("theme.dark"),
        badgeText: t("globalSearch.badges.action"),
        badgeVariant: "muted",
        icon: isDark ? Sun : Moon,
        onSelect: () => {
          setTheme(isDark ? "light" : "dark");
          setOpen(false);
        },
      });
    }

    if (
      !normalized ||
      "language locale ngon ngu tieng viet english".includes(normalized)
    ) {
      items.push({
        id: "act-locale",
        groupKey: "quickActions",
        title: t("globalSearch.actions.switchLanguage"),
        subtitle: locale === "vi" ? "Tiếng Việt → English" : "English → Tiếng Việt",
        badgeText: t("globalSearch.badges.action"),
        badgeVariant: "muted",
        icon: Globe,
        onSelect: () => {
          setLocale(locale === "vi" ? "en" : "vi");
          setOpen(false);
        },
      });
    }

    return items;
  }, [query, resolvedTheme, setTheme, locale, setLocale, t, handleOpenChange]);

  const groupedSections = React.useMemo(() => {
    const sections: Array<{
      key: PaletteItem["groupKey"];
      label: string;
      items: PaletteItem[];
    }> = [
      {
        key: "orders",
        label: t("globalSearch.groups.orders"),
        items: orderItems,
      },
      {
        key: "shipments",
        label: t("globalSearch.groups.shipments"),
        items: shipmentItems,
      },
      {
        key: "trips",
        label: t("globalSearch.groups.trips"),
        items: tripItems,
      },
      {
        key: "masterData",
        label: t("globalSearch.groups.masterData"),
        items: masterItems,
      },
      {
        key: "navigation",
        label: t("globalSearch.groups.navigation"),
        items: navigationItems,
      },
      {
        key: "quickActions",
        label: t("globalSearch.groups.quickActions"),
        items: quickActionItems,
      },
    ];
    return sections.filter((section) => section.items.length > 0);
  }, [
    orderItems,
    shipmentItems,
    tripItems,
    masterItems,
    navigationItems,
    quickActionItems,
    t,
  ]);

  const flatItems = React.useMemo(
    () => groupedSections.flatMap((section) => section.items),
    [groupedSections]
  );

  const safeActiveIndex =
    flatItems.length > 0 ? Math.min(activeIndex, flatItems.length - 1) : 0;

  // Keep active item scrolled into view
  React.useEffect(() => {
    const btn = itemRefs.current.get(safeActiveIndex);
    if (btn) {
      btn.scrollIntoView({ block: "nearest" });
    }
  }, [safeActiveIndex]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (flatItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flatItems[safeActiveIndex] ?? flatItems[0];
      target?.onSelect();
    }
  };

  const getBadgeStyles = (variant?: PaletteItem["badgeVariant"]) => {
    switch (variant) {
      case "emerald":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "blue":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "amber":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "primary":
        return "bg-primary/10 text-primary border-primary/20";
      default:
        return "bg-muted text-muted-foreground border-border/60";
    }
  };

  let runningFlatIndex = -1;

  return (
    <>
      <div className="app-header-search mx-2 hidden min-w-0 max-w-xs flex-1 sm:mx-4 md:block xl:max-w-sm 2xl:max-w-md">
        <button
          type="button"
          onClick={() => handleOpenChange(true)}
          aria-label={t("globalSearch.dialogTitle")}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-input/80 bg-muted/30 px-3 py-2 text-sm text-muted-foreground shadow-2xs transition-colors hover:border-ring hover:bg-muted/60 focus:outline-hidden min-w-0 cursor-pointer"
        >
          <span className="flex items-center gap-2 min-w-0 overflow-hidden">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <span className="truncate text-xs sm:text-sm text-left">
              {t("header.searchPlaceholder")}
            </span>
          </span>
          <kbd className="pointer-events-none hidden select-none items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium opacity-100 sm:flex border border-border/60 shrink-0">
            <span>⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Mobile compact search icon */}
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        aria-label={t("globalSearch.dialogTitle")}
        className="inline-flex md:hidden size-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
      >
        <Search className="size-5" />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="max-w-2xl gap-0 overflow-hidden rounded-2xl border border-border/80 bg-popover p-0 shadow-2xl sm:max-w-2xl"
        >
          <DialogTitle className="sr-only">
            {t("globalSearch.dialogTitle")}
          </DialogTitle>

          {/* Search Input Header */}
          <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3.5">
            {isSearching ? (
              <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
            ) : (
              <Search className="size-5 shrink-0 text-muted-foreground" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder={t("globalSearch.inputPlaceholder")}
              autoFocus
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveIndex(0);
                  inputRef.current?.focus();
                }}
                aria-label={t("globalSearch.ClearInput")}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center rounded border border-border/70 bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div className="max-h-[62vh] overflow-y-auto p-2 space-y-3">
            {orderItems.length === 0 &&
            shipmentItems.length === 0 &&
            tripItems.length === 0 &&
            masterItems.length === 0 &&
            navigationItems.length === 0 &&
            query.trim().length > 0 &&
            !isSearching ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm font-medium text-foreground">
                  {t("globalSearch.noResultsTitle")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("globalSearch.noResultsDesc")}
                </p>
              </div>
            ) : null}

            {groupedSections.map((section) => (
              <div key={section.key} className="space-y-1">
                <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    runningFlatIndex += 1;
                    const itemIndex = runningFlatIndex;
                    const isSelected = itemIndex === safeActiveIndex;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        ref={(el) => {
                          if (el) {
                            itemRefs.current.set(itemIndex, el);
                          } else {
                            itemRefs.current.delete(itemIndex);
                          }
                        }}
                        type="button"
                        onMouseEnter={() => setActiveIndex(itemIndex)}
                        onClick={item.onSelect}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer",
                          isSelected
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                              isSelected
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "border-border/60 bg-muted/50 text-muted-foreground"
                            )}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-foreground">
                              {item.title}
                            </div>
                            {item.subtitle && (
                              <div className="truncate text-xs text-muted-foreground">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={cn(
                              "rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                              getBadgeStyles(item.badgeVariant)
                            )}
                          >
                            {item.badgeText}
                          </span>
                          <ArrowRight
                            className={cn(
                              "size-3.5 transition-transform",
                              isSelected
                                ? "translate-x-0.5 text-primary opacity-100"
                                : "opacity-0"
                            )}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Keyboard Hints Footer */}
          <div className="flex items-center justify-between border-t border-border/70 bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-border/70 bg-background px-1 py-0.5 font-mono text-[10px]">
                  ↑
                </kbd>
                <kbd className="rounded border border-border/70 bg-background px-1 py-0.5 font-mono text-[10px]">
                  ↓
                </kbd>
                <span>{t("globalSearch.footer.navigate")}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="inline-flex items-center rounded border border-border/70 bg-background px-1 py-0.5 font-mono text-[10px]">
                  <CornerDownLeft className="size-2.5" />
                </kbd>
                <span>{t("globalSearch.footer.select")}</span>
              </span>
            </div>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border/70 bg-background px-1.5 py-0.5 font-mono text-[10px]">
                Ctrl + K
              </kbd>
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
