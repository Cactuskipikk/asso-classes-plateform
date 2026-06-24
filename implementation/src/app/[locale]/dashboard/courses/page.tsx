"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageLoading } from "@/components/dashboard/page-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  apiFetch,
  DAY_KEYS,
  formatPerson,
  getDisciplineColor,
} from "@/lib/dashboard-helpers";

type Course = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isCollective: boolean;
  class: { id: string; name: string; discipline: { name: string } };
  teacher: { id: string; firstName: string; lastName: string };
  room: { id: string; name: string };
};

type Session = {
  id: string;
  date: string;
  status: string;
  content: string | null;
  homework: string | null;
  cancelReason: string | null;
};

const TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

export default function CoursesPage() {
  const t = useTranslations("courses");
  const tDays = useTranslations("days");
  const tCommon = useTranslations("common");

  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [teachers, setTeachers] = useState<
    Array<{ id: string; firstName: string; lastName: string }>
  >([]);
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [saving, setSaving] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [form, setForm] = useState({
    classId: "",
    teacherId: "",
    roomId: "",
    dayOfWeek: "1",
    startTime: "09:00",
    endTime: "10:00",
    isCollective: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [coursesData, classesData, teachersData, roomsData] =
        await Promise.all([
          apiFetch<Course[]>("/api/courses"),
          apiFetch<Array<{ id: string; name: string }>>("/api/classes"),
          apiFetch<
            Array<{ id: string; firstName: string; lastName: string }>
          >("/api/teachers"),
          apiFetch<Array<{ id: string; name: string }>>("/api/rooms"),
        ]);
      setCourses(coursesData);
      setClasses(classesData);
      setTeachers(teachersData);
      setRooms(roomsData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grid = useMemo(() => {
    const map = new Map<string, Course[]>();
    for (const slot of TIME_SLOTS) {
      for (let day = 0; day <= 6; day++) {
        map.set(`${day}-${slot}`, []);
      }
    }
    for (const course of courses) {
      const slotKey = TIME_SLOTS.find((s) => course.startTime.startsWith(s.slice(0, 2)));
      if (slotKey) {
        const key = `${course.dayOfWeek}-${slotKey}`;
        const existing = map.get(key) ?? [];
        existing.push(course);
        map.set(key, existing);
      }
    }
    return map;
  }, [courses]);

  async function openCourse(course: Course) {
    setSelectedCourse(course);
    const data = await apiFetch<Session[]>(`/api/courses/${course.id}/sessions`);
    setSessions(data);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/courses", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          dayOfWeek: parseInt(form.dayOfWeek, 10),
        }),
      });
      setDialogOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelSession(sessionId: string) {
    await apiFetch(`/api/sessions/${sessionId}`, {
      method: "PUT",
      body: JSON.stringify({
        status: "CANCELLED",
        cancelReason: cancelReason || "Cancelled",
      }),
    });
    if (selectedCourse) openCourse(selectedCourse);
  }

  async function handleDeleteCourse() {
    if (!selectedCourse || !confirm(tCommon("confirm"))) return;
    await apiFetch(`/api/courses/${selectedCourse.id}`, { method: "DELETE" });
    setSelectedCourse(null);
    await load();
  }

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="me-2 h-4 w-4" />
            {t("addCourse")}
          </Button>
        }
      />

      <div className="overflow-x-auto rounded-lg border">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-8 border-b bg-muted/50">
            <div className="p-2 text-sm font-medium">{t("schedule")}</div>
            {DAY_KEYS.map((key, i) => (
              <div key={key} className="border-s p-2 text-center text-sm font-medium">
                {tDays(key)}
              </div>
            ))}
          </div>
          {TIME_SLOTS.map((slot) => (
            <div key={slot} className="grid grid-cols-8 border-b last:border-b-0">
              <div className="flex items-center p-2 text-xs text-muted-foreground">
                {slot}
              </div>
              {DAY_KEYS.map((_, day) => {
                const items = grid.get(`${day}-${slot}`) ?? [];
                return (
                  <div key={day} className="min-h-[72px] border-s p-1">
                    {items.map((course) => (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => openCourse(course)}
                        className="mb-1 w-full rounded-md p-2 text-start text-xs text-white shadow-sm transition-opacity hover:opacity-90"
                        style={{
                          backgroundColor: getDisciplineColor(
                            course.class.discipline.name
                          ),
                        }}
                      >
                        <p className="font-semibold">{course.class.name}</p>
                        <p className="opacity-90">
                          {formatPerson(course.teacher.firstName, course.teacher.lastName)}
                        </p>
                        <p className="opacity-80">
                          {course.startTime}-{course.endTime} · {course.room.name}
                        </p>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedCourse?.class.name}</DialogTitle>
          </DialogHeader>
          {selectedCourse && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {tDays(DAY_KEYS[selectedCourse.dayOfWeek])} ·{" "}
                {selectedCourse.startTime} – {selectedCourse.endTime} ·{" "}
                {selectedCourse.room.name}
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">{t("schedule")}</h4>
                {sessions.map((session) => (
                  <Card key={session.id}>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          {format(new Date(session.date), "PP")}
                        </CardTitle>
                        <Badge
                          variant={
                            session.status === "CANCELLED"
                              ? "destructive"
                              : session.status === "COMPLETED"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {session.status === "CANCELLED"
                            ? t("cancelled")
                            : session.status === "COMPLETED"
                              ? t("completed")
                              : t("scheduled")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-3 text-sm">
                      {session.content && (
                        <p>
                          <span className="font-medium">{t("content")}:</span>{" "}
                          {session.content}
                        </p>
                      )}
                      {session.homework && (
                        <p>
                          <span className="font-medium">{t("homework")}:</span>{" "}
                          {session.homework}
                        </p>
                      )}
                      {session.status !== "CANCELLED" && (
                        <div className="flex gap-2 pt-2">
                          <Input
                            placeholder={t("cancelReason")}
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancelSession(session.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button variant="destructive" onClick={handleDeleteCourse}>
                <Trash2 className="me-2 h-4 w-4" />
                {t("cancelCourse")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addCourse")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("class")}</Label>
              <Select
                value={form.classId}
                onValueChange={(v) => setForm({ ...form, classId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("teacher")}</Label>
              <Select
                value={form.teacherId}
                onValueChange={(v) => setForm({ ...form, teacherId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((tch) => (
                    <SelectItem key={tch.id} value={tch.id}>
                      {formatPerson(tch.firstName, tch.lastName)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("room")}</Label>
              <Select
                value={form.roomId}
                onValueChange={(v) => setForm({ ...form, roomId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>{t("day")}</Label>
                <Select
                  value={form.dayOfWeek}
                  onValueChange={(v) => setForm({ ...form, dayOfWeek: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_KEYS.map((key, i) => (
                      <SelectItem key={key} value={String(i)}>
                        {tDays(key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("startTime")}</Label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("endTime")}</Label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isCollective}
                onChange={(e) =>
                  setForm({ ...form, isCollective: e.target.checked })
                }
              />
              {t("collective")}
            </label>
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
