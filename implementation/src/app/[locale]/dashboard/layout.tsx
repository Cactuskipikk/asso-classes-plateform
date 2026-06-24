import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/routing";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { DashboardShell } from "./dashboard-shell";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function DashboardLayout({ children, params }: Props) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect({ href: "/login", locale });
  }

  const sessionUser = session!.user;

  const user = {
    name:
      sessionUser.name ??
      `${sessionUser.firstName} ${sessionUser.lastName}`,
    firstName: sessionUser.firstName,
    lastName: sessionUser.lastName,
    email: sessionUser.email ?? "",
    role: sessionUser.role,
  };

  return (
    <DashboardShell user={user} sidebar={Sidebar} header={Header}>
      {children}
    </DashboardShell>
  );
}
