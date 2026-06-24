import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LocaleHomePage({ params }: Props) {
  const { locale } = await params;
  const session = await auth();

  if (session?.user) {
    redirect({ href: "/dashboard", locale });
  } else {
    redirect({ href: "/login", locale });
  }
}
