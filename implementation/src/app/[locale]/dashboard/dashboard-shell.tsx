"use client";

import { useState, type ComponentType } from "react";
import type { DashboardUser } from "@/components/layout/sidebar";

type SidebarComponentProps = {
  user: DashboardUser;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

type HeaderComponentProps = {
  user: DashboardUser;
  onMenuClick?: () => void;
};

type DashboardShellProps = {
  user: DashboardUser;
  children: React.ReactNode;
  sidebar: ComponentType<SidebarComponentProps>;
  header: ComponentType<HeaderComponentProps>;
};

export function DashboardShell({
  user,
  children,
  sidebar: SidebarComponent,
  header: HeaderComponent,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarComponent
        user={user}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <HeaderComponent user={user} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
