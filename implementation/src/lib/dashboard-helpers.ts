import { format, startOfMonth, subMonths } from "date-fns";

export const COURSE_GOAL = 70;

export const DISCIPLINE_COLORS: Record<string, string> = {
  "Apprentissage religieux": "#6366f1",
  "Langue arabe": "#10b981",
  Informatique: "#f59e0b",
};

export const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export function getDisciplineColor(name: string) {
  return DISCIPLINE_COLORS[name] ?? "#64748b";
}

export function formatPerson(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`;
}

export function formatDate(date: string | Date, pattern = "PP") {
  return format(new Date(date), pattern);
}

export function formatTime(time: string) {
  return time;
}

export function countCoursesAttended(
  attendances: Array<{ status: string }> | undefined
) {
  if (!attendances) return 0;
  return attendances.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE"
  ).length;
}

export function getPaymentStatus(
  payments: Array<{ date: string | Date; amount: number }> | undefined
): "paid" | "unpaid" | "free" {
  if (!payments?.length) return "unpaid";

  const hasFree = payments.some((p) => p.amount === 0);
  if (hasFree) return "free";

  const now = new Date();
  const currentMonth = startOfMonth(now).getTime();
  const lastMonth = startOfMonth(subMonths(now, 1)).getTime();

  const paidMonths = new Set(
    payments
      .filter((p) => p.amount > 0)
      .map((p) => startOfMonth(new Date(p.date)).getTime())
  );

  if (
    paidMonths.has(currentMonth) ||
    paidMonths.has(lastMonth)
  ) {
    return "paid";
  }

  return "unpaid";
}

export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export function downloadFile(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function getTodayDayOfWeek() {
  return new Date().getDay();
}

export function isToday(date: string | Date) {
  const d = new Date(date);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekEnd(date = new Date()) {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}
