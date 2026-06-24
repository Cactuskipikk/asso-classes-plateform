"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function PageLoading() {
  const t = useTranslations("common");

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm">{t("loading")}</p>
    </div>
  );
}
