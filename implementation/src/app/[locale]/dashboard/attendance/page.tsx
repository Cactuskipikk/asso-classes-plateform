"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { CheckCircle2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageLoading } from "@/components/dashboard/page-loading";
import { AttendanceBadge } from "@/components/dashboard/attendance-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  apiFetch,
  formatPerson,
  getTodayDayOfWeek,
} from "@/lib/dashboard-helpers";

type Course = {
  id: string;
  startTime: string;
  endTime: string;
  class: { id: string; name: string };
  room: { name: string };
};

type Student = {
  id: string;
  firstName: string;
  lastName: string;
};

type AttendanceRecord = {
  id: string;
  status: string;
  lateMinutes: number;
  student: { firstName: string; lastName: string; class: { name: string } | null };
  courseSession: { date: string };
};

type AttendanceEntry = {
  studentId: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  arrivalTime?: string;
};

export default function AttendancePage() {
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";
  const t = useTranslations("attendance");
  const tCommon = useTranslations("common");
  const tCourses = useTranslations("courses");
  const tStudents = useTranslations("students");

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [entries, setEntries] = useState<Record<string, AttendanceEntry>>({});
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [classFilter, setClassFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const loadAdmin = useCallback(async () => {
    const params = new URLSearchParams();
    if (classFilter !== "all") params.set("classId", classFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const [recordsData, classesData] = await Promise.all([
      apiFetch<AttendanceRecord[]>(`/api/attendance?${params}`),
      apiFetch<Array<{ id: string; name: string }>>("/api/classes"),
    ]);
    setRecords(recordsData);
    setClasses(classesData);
  }, [classFilter, startDate, endDate]);

  const loadTeacher = useCallback(async () => {
    const today = getTodayDayOfWeek();
    const coursesData = await apiFetch<Course[]>(
      `/api/courses?dayOfWeek=${today}`
    );
    setCourses(coursesData);
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        if (role === "ADMIN") await loadAdmin();
        else if (role === "TEACHER") await loadTeacher();
      } finally {
        setLoading(false);
      }
    }
    if (role) init();
  }, [role, loadAdmin, loadTeacher]);

  useEffect(() => {
    if (role === "ADMIN") loadAdmin();
  }, [role, loadAdmin]);

  async function selectCourse(courseId: string) {
    setSelectedCourseId(courseId);
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    const classStudents = await apiFetch<Student[]>(
      `/api/students?classId=${course.class.id}`
    );
    setStudents(classStudents);

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    let sessions = await apiFetch<Array<{ id: string; date: string }>>(
      `/api/courses/${courseId}/sessions`
    );

    let todaySession = sessions.find(
      (s) => format(new Date(s.date), "yyyy-MM-dd") === format(today, "yyyy-MM-dd")
    );

    if (!todaySession) {
      const created = await apiFetch<{ id: string; date: string }>(
        `/api/courses/${courseId}/sessions`,
        {
          method: "POST",
          body: JSON.stringify({ date: today.toISOString() }),
        }
      );
      todaySession = created;
    }

    setSessionId(todaySession.id);

    const initial: Record<string, AttendanceEntry> = {};
    for (const s of classStudents) {
      initial[s.id] = { studentId: s.id, status: "PRESENT" };
    }
    setEntries(initial);
  }

  function setStatus(studentId: string, status: AttendanceEntry["status"]) {
    setEntries((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], studentId, status },
    }));
  }

  function setArrivalTime(studentId: string, time: string) {
    setEntries((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        studentId,
        status: "LATE",
        arrivalTime: time
          ? new Date(`${format(new Date(), "yyyy-MM-dd")}T${time}`).toISOString()
          : undefined,
      },
    }));
  }

  async function handleSubmit() {
    if (!sessionId) return;
    setSubmitting(true);
    setSuccess(false);
    try {
      await apiFetch("/api/attendance", {
        method: "POST",
        body: JSON.stringify({
          courseSessionId: sessionId,
          attendances: Object.values(entries),
        }),
      });
      setSuccess(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoading />;

  if (role === "TEACHER") {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} />

        <Card>
          <CardHeader>
            <CardTitle>{tCourses("schedule")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedCourseId} onValueChange={selectCourse}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectCourse")} />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.class.name} · {c.startTime} · {c.room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {students.length > 0 && (
              <div className="space-y-3">
                {students.map((student) => {
                  const entry = entries[student.id];
                  return (
                    <div
                      key={student.id}
                      className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <p className="font-medium">
                        {formatPerson(student.firstName, student.lastName)}
                      </p>
                      <div className="flex flex-wrap items-center gap-4">
                        {(["PRESENT", "ABSENT", "LATE"] as const).map((status) => (
                          <label key={status} className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name={`status-${student.id}`}
                              checked={entry?.status === status}
                              onChange={() => setStatus(student.id, status)}
                            />
                            {t(status === "PRESENT" ? "present" : status === "ABSENT" ? "absent" : "late")}
                          </label>
                        ))}
                        {entry?.status === "LATE" && (
                          <Input
                            type="time"
                            className="w-[130px]"
                            onChange={(e) =>
                              setArrivalTime(student.id, e.target.value)
                            }
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {t("markAttendance")}
                </Button>
                {success && (
                  <p className="flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {tCommon("save")}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (role === "ADMIN") {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} />

        <div className="flex flex-col gap-3 sm:flex-row">
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="sm:w-[200px]">
              <SelectValue placeholder={tStudents("class")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon("total")}</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tStudents("name")}</TableHead>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{tCommon("status")}</TableHead>
                <TableHead>{t("lateMinutes")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {tCommon("noResults")}
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {formatPerson(r.student.firstName, r.student.lastName)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(r.courseSession.date), "PP")}
                    </TableCell>
                    <TableCell>
                      <AttendanceBadge status={r.status} />
                    </TableCell>
                    <TableCell>{r.lateMinutes || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return <PageHeader title={t("title")} description={tCommon("noResults")} />;
}
