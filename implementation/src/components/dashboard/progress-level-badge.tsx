"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ProgressLevel = "ACQUIRED" | "IN_PROGRESS" | "LEARNING";

export function ProgressLevelBadge({ level }: { level: ProgressLevel | string }) {
  const t = useTranslations("progress");

  const config = {
    ACQUIRED: {
      label: t("acquired"),
      className: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    IN_PROGRESS: {
      label: t("inProgress"),
      className: "bg-blue-100 text-blue-800 border-blue-200",
    },
    LEARNING: {
      label: t("learning"),
      className: "bg-amber-100 text-amber-800 border-amber-200",
    },
  }[level as ProgressLevel] ?? {
    label: level,
    className: "bg-muted text-muted-foreground",
  };

  return (
    <Badge variant="outline" className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}

export function getNextLevel(level: ProgressLevel): ProgressLevel | null {
  if (level === "LEARNING") return "IN_PROGRESS";
  if (level === "IN_PROGRESS") return "ACQUIRED";
  return null;
}
