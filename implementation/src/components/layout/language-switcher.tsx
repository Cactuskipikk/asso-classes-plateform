"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const localeLabels: Record<(typeof routing.locales)[number], string> = {
  fr: "Français",
  en: "English",
  tr: "Türkçe",
  ar: "العربية",
  ku: "Kurdî",
};

type LanguageSwitcherProps = {
  variant?: "default" | "ghost" | "outline";
  className?: string;
  showLabel?: boolean;
};

export function LanguageSwitcher({
  variant = "ghost",
  className,
  showLabel = false,
}: LanguageSwitcherProps) {
  const t = useTranslations("layout");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(nextLocale: (typeof routing.locales)[number]) {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={showLabel ? "default" : "icon"}
          className={cn("gap-2", className)}
          aria-label={t("language")}
        >
          <Globe className="h-4 w-4" />
          {showLabel && (
            <span className="text-sm">{localeLabels[locale as keyof typeof localeLabels]}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => switchLocale(loc)}
            className={cn(locale === loc && "bg-accent font-medium")}
          >
            {localeLabels[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
