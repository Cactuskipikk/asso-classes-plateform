"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import {
  Bell,
  ChevronRight,
  LogOut,
  Menu,
  Settings,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DashboardUser } from "@/components/layout/sidebar";

type HeaderProps = {
  user: DashboardUser;
  onMenuClick?: () => void;
};

const routeTitleKeys: Record<string, string> = {
  "/dashboard": "dashboard",
  "/dashboard/students": "students",
  "/dashboard/teachers": "teachers",
  "/dashboard/classes": "classes",
  "/dashboard/courses": "courses",
  "/dashboard/attendance": "attendance",
  "/dashboard/payments": "payments",
  "/dashboard/progress": "progress",
  "/dashboard/rooms": "rooms",
  "/dashboard/meetings": "meetings",
  "/dashboard/reports": "reports",
  "/dashboard/settings": "settings",
  "/dashboard/children": "myChildren",
  "/dashboard/notifications": "notifications",
};

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getPageTitleKey(pathname: string): string {
  const sortedRoutes = Object.keys(routeTitleKeys).sort(
    (a, b) => b.length - a.length
  );

  for (const route of sortedRoutes) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return routeTitleKeys[route];
    }
  }

  return "dashboard";
}

export function Header({ user, onMenuClick }: HeaderProps) {
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const tLayout = useTranslations("layout");
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  const pageTitleKey = getPageTitleKey(pathname);

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const crumbs: { href: string; labelKey: string }[] = [];

    let currentPath = "";
    for (const segment of segments) {
      currentPath += `/${segment}`;
      const labelKey = routeTitleKeys[currentPath];
      if (labelKey) {
        crumbs.push({ href: currentPath, labelKey });
      }
    }

    return crumbs.length > 0 ? crumbs : [{ href: "/dashboard", labelKey: "dashboard" }];
  }, [pathname]);

  useEffect(() => {
    async function fetchUnreadCount() {
      try {
        const response = await fetch("/api/notifications?unread=true");
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(Array.isArray(data) ? data.length : 0);
        }
      } catch {
        setUnreadCount(0);
      }
    }

    fetchUnreadCount();
  }, [pathname]);

  async function handleLogout() {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label={tLayout("openMenu")}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold md:text-xl">
            {t(pageTitleKey as Parameters<typeof t>[0])}
          </h1>

          <nav aria-label="Breadcrumb" className="hidden md:block">
            <ol className="flex items-center gap-1 text-sm text-muted-foreground">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;

                return (
                  <li key={crumb.href} className="flex items-center gap-1">
                    {index > 0 && (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    )}
                    {isLast ? (
                      <span className="font-medium text-foreground">
                        {t(crumb.labelKey as Parameters<typeof t>[0])}
                      </span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="transition-colors hover:text-foreground"
                      >
                        {t(crumb.labelKey as Parameters<typeof t>[0])}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/dashboard/notifications" aria-label={t("notifications")}>
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px]"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full"
                aria-label={tLayout("profile")}
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(user.firstName, user.lastName)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="cursor-pointer">
                  <User className="me-2 h-4 w-4" />
                  {tLayout("profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="cursor-pointer">
                  <Settings className="me-2 h-4 w-4" />
                  {t("settings")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="me-2 h-4 w-4" />
                {tAuth("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
