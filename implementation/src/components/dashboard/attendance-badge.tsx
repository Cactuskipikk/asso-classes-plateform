"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

export function AttendanceBadge({ status }: { status: AttendanceStatus | string }) {
  const t = useTranslations("attendance");

  const config = {
    PRESENT: {
      label: t("present"),
      className: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    ABSENT: {
      label: t("absent"),
      className: "bg-red-100 text-red-800 border-red-200",
    },
    LATE: {
      label: t("late"),
      className: "bg-amber-100 text-amber-800 border-amber-200",
    },
  }[status as AttendanceStatus] ?? {
    label: status,
    className: "bg-muted text-muted-foreground",
  };

  return (
    <Badge variant="outline" className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
