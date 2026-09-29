"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Lock, Smartphone, ChevronRight, Mail, Building2 } from "lucide-react";
import { ProfileTab } from "./profile-tab";
import { SecurityTab } from "./security-tab";
import { SessionsTab } from "./sessions-tab";

export function AccountSettingsView() {
  const { t } = useTranslation();
  const { user, activeTenant } = useAuth();
  const [activeTab, setActiveTab] = React.useState<string>("profile");

  const getInitials = (name?: string) => {
    if (!name) return "LX";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-16 animate-in fade-in duration-300">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          {t("nav.overview")}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground font-semibold">{t("account.breadcrumb")}</span>
      </nav>

      {/* Page Header Profile Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-r from-primary/10 via-background to-muted/40 p-6 sm:p-8 backdrop-blur-md shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Avatar className="size-20 sm:size-24 border-2 border-background shadow-lg ring-2 ring-primary/20">
              <AvatarImage src={user?.avatarUrl || ""} alt={user?.displayName || "User"} className="object-cover" />
              <AvatarFallback className="bg-primary/15 text-primary font-bold text-2xl">
                {getInitials(user?.displayName)}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {user?.displayName || "LogiX User"}
                </h1>
                {activeTenant?.role && (
                  <Badge variant="outline" className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary border-primary/25 text-xs font-semibold">
                    {activeTenant.role}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Mail className="size-3.5" />
                  <span>{user?.email || "user@logix.vn"}</span>
                </span>
                {activeTenant?.name && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-primary" />
                    <span className="font-medium text-foreground">{activeTenant.name}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full sm:w-auto sm:inline-flex h-12 p-1 rounded-2xl bg-muted/70 border border-border/60">
          <TabsTrigger
            value="profile"
            className="flex items-center gap-2 rounded-xl text-xs sm:text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all cursor-pointer h-10 px-4"
          >
            <User className="size-4 shrink-0" />
            <span>{t("account.tabs.profile")}</span>
          </TabsTrigger>

          <TabsTrigger
            value="security"
            className="flex items-center gap-2 rounded-xl text-xs sm:text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all cursor-pointer h-10 px-4"
          >
            <Lock className="size-4 shrink-0" />
            <span>{t("account.tabs.security")}</span>
          </TabsTrigger>

          <TabsTrigger
            value="sessions"
            className="flex items-center gap-2 rounded-xl text-xs sm:text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all cursor-pointer h-10 px-4"
          >
            <Smartphone className="size-4 shrink-0" />
            <span>{t("account.tabs.sessions")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0 focus-visible:outline-hidden">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="security" className="mt-0 focus-visible:outline-hidden">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="sessions" className="mt-0 focus-visible:outline-hidden">
          <SessionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
