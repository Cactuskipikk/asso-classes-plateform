"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  DoorOpen,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  TrendingUp,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export type DashboardUser = {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
};

const adminNav: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/dashboard/students", labelKey: "students", icon: GraduationCap },
  { href: "/dashboard/teachers", labelKey: "teachers", icon: UserCog },
  { href: "/dashboard/classes", labelKey: "classes", icon: Users },
  { href: "/dashboard/courses", labelKey: "courses", icon: BookOpen },
  { href: "/dashboard/attendance", labelKey: "attendance", icon: ClipboardCheck },
  { href: "/dashboard/payments", labelKey: "payments", icon: CreditCard },
  { href: "/dashboard/rooms", labelKey: "rooms", icon: DoorOpen },
  { href: "/dashboard/meetings", labelKey: "meetings", icon: CalendarDays },
  { href: "/dashboard/reports", labelKey: "reports", icon: FileBarChart },
  { href: "/dashboard/settings", labelKey: "settings", icon: Settings },
];

const teacherNav: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/dashboard/courses", labelKey: "myCourses", icon: BookOpen },
  { href: "/dashboard/attendance", labelKey: "attendance", icon: ClipboardCheck },
  { href: "/dashboard/progress", labelKey: "progress", icon: TrendingUp },
];

const parentNav: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/dashboard/children", labelKey: "myChildren", icon: Users },
  { href: "/dashboard/progress", labelKey: "progress", icon: TrendingUp },
];

const studentNav: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/dashboard/courses", labelKey: "myCourses", icon: BookOpen },
  { href: "/dashboard/progress", labelKey: "progress", icon: TrendingUp },
];

function getNavItems(role: string): NavItem[] {
  switch (role) {
    case "ADMIN":
      return adminNav;
    case "TEACHER":
      return teacherNav;
    case "PARENT":
      return parentNav;
    case "STUDENT":
      return studentNav;
    default:
      return [{ href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard }];
  }
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

type SidebarProps = {
  user: DashboardUser;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export function Sidebar({ user, mobileOpen = false, onMobileClose }: SidebarProps) {
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navItems = getNavItems(user.role);

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    await signOut({ callbackUrl: "/login" });
  }

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{tCommon("appName")}</p>
          <p className="truncate text-xs text-muted-foreground">{user.role}</p>
        </div>
        {onMobileClose && (
          <Button
            variant="ghost"
            size="icon"
            className="ms-auto lg:hidden"
            onClick={onMobileClose}
            aria-label={tCommon("cancel")}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t(item.labelKey as Parameters<typeof t>[0])}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(user.firstName, user.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <LanguageSwitcher variant="outline" showLabel />
        </div>

        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOut className="h-4 w-4" />
          {tAuth("logout")}
        </Button>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden h-full w-64 shrink-0 flex-col border-e bg-card lg:flex">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <aside className="absolute start-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-card shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
