"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  Bell,
  BellOff,
  CheckCheck,
  AlertTriangle,
  CreditCard,
  CalendarX,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageLoading } from "@/components/dashboard/page-loading";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  channel: string;
  createdAt: string;
};

const typeIcons: Record<string, React.ElementType> = {
  ABSENCE_ALERT: AlertTriangle,
  PAYMENT_REMINDER: CreditCard,
  COURSE_REMINDER: CalendarClock,
  COURSE_CANCELLED: CalendarX,
};

const typeColors: Record<string, string> = {
  ABSENCE_ALERT: "text-orange-500",
  PAYMENT_REMINDER: "text-red-500",
  COURSE_REMINDER: "text-blue-500",
  COURSE_CANCELLED: "text-gray-500",
};

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(ids: string[]) {
    const res = await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
      );
    }
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title={t("title")} />
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="me-2 h-4 w-4" />
            {t("markAllRead")}
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <BellOff className="mb-3 h-12 w-12 opacity-40" />
            <p className="text-lg font-medium">{t("noNotifications")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const Icon = typeIcons[notification.type] || Bell;
            const iconColor = typeColors[notification.type] || "text-muted-foreground";

            return (
              <Card
                key={notification.id}
                className={`transition-colors ${
                  notification.read ? "opacity-60" : "border-primary/20 bg-primary/[0.02]"
                }`}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={`mt-0.5 shrink-0 ${iconColor}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{notification.title}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.read && (
                        <Badge variant="default" className="shrink-0 text-[10px]">
                          New
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <time className="text-xs text-muted-foreground">
                        {format(new Date(notification.createdAt), "dd/MM/yyyy HH:mm")}
                      </time>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => markAsRead([notification.id])}
                        >
                          {t("markRead")}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
