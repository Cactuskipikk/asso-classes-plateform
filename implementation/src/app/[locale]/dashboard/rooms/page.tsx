"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Clock, Loader2, Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageLoading } from "@/components/dashboard/page-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  apiFetch,
  formatPerson,
  getTodayDayOfWeek,
} from "@/lib/dashboard-helpers";

type Room = {
  id: string;
  name: string;
  capacity: number | null;
  courseSchedules?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    class: { name: string };
    teacher: { firstName: string; lastName: string };
  }>;
};

type Course = {
  roomId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  class: { name: string };
  teacher: { firstName: string; lastName: string };
};

export default function RoomsPage() {
  const t = useTranslations("rooms");
  const tCommon = useTranslations("common");
  const tCourses = useTranslations("courses");

  const [rooms, setRooms] = useState<Room[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", capacity: "" });

  const today = getTodayDayOfWeek();

  const scheduleByRoom = useMemo(() => {
    const map = new Map<string, Course[]>();
    for (const c of courses) {
      if (c.dayOfWeek !== today) continue;
      const list = map.get(c.roomId) ?? [];
      list.push(c);
      map.set(c.roomId, list);
    }
    return map;
  }, [courses, today]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsData, coursesData] = await Promise.all([
        apiFetch<Room[]>("/api/rooms"),
        apiFetch<Course[]>("/api/courses"),
      ]);
      setRooms(roomsData);
      setCourses(coursesData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/rooms", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          capacity: form.capacity ? parseInt(form.capacity, 10) : undefined,
        }),
      });
      setDialogOpen(false);
      setForm({ name: "", capacity: "" });
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="me-2 h-4 w-4" />
            {t("addRoom")}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => {
          const todaySchedule = scheduleByRoom.get(room.id) ?? [];
          const isOccupied = todaySchedule.length > 0;

          return (
            <Card key={room.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>{room.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={
                      isOccupied
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }
                  >
                    {isOccupied ? t("occupied") : t("available")}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t("capacity")}: {room.capacity ?? "—"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  {t("todaySchedule")}
                </h4>
                {todaySchedule.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {tCommon("noResults")}
                  </p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {todaySchedule.map((s, i) => (
                      <li key={i} className="rounded-lg border p-2">
                        <p className="font-medium">{s.class.name}</p>
                        <p className="text-muted-foreground">
                          {s.startTime} – {s.endTime} ·{" "}
                          {formatPerson(s.teacher.firstName, s.teacher.lastName)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addRoom")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("name")}</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("capacity")}</Label>
              <Input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {tCommon("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
