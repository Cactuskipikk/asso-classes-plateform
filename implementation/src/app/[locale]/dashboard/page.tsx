"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { format } from "date-fns";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  ClipboardCheck,
  CreditCard,
  FileBarChart,
  GraduationCap,
  UserCog,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageLoading } from "@/components/dashboard/page-loading";
import { StatCard } from "@/components/dashboard/stat-card";
import { AttendanceBadge } from "@/components/dashboard/attendance-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  apiFetch,
  COURSE_GOAL,
  countCoursesAttended,
  DAY_KEYS,
  formatPerson,
  getTodayDayOfWeek,
  getWeekStart,
  getWeekEnd,
} from "@/lib/dashboard-helpers";

type DashboardData = {
  totalStudents: number;
  totalTeachers: number;
  todayCourses: number;
  unpaidAlerts: Array<{
    studentId: string;
    studentName: string;
    unpaidMonths: number;
  }>;
  attendanceRate: number;
  recentActivity: Array<{
    id: string;
    date: string;
    content: string | null;
    homework: string | null;
    courseSchedule: {
      class: { name: string };
      teacher?: { firstName: string; lastName: string };
      startTime?: string;
      endTime?: string;
      room?: { name: string };
    };
    attendances?: Array<{ status: string; student?: { firstName: string; lastName: string } }>;
  }>;
  consecutiveAbsenceAlerts: Array<{
    studentId: string;
    studentName: string;
    consecutiveAbsences: number;
  }>;
};

type CourseSchedule = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  class: { id: string; name: string; discipline: { name: string } };
  teacher: { firstName: string; lastName: string };
  room: { name: string };
};

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  class: { name: string } | null;
  attendances?: Array<{ status: string }>;
};

type ChartDay = { day: number; rate: number; label: string };

export default function DashboardPage() {
  const { data: session } = useSession();
  const t = useTranslations("dashboard");
  const tDays = useTranslations("days");
  const tCommon = useTranslations("common");
  const tAtt = useTranslations("attendance");
  const tPay = useTranslations("payments");
  const tParent = useTranslations("parent");
  const tCourses = useTranslations("courses");
  const tProgress = useTranslations("progress");
  const tNav = useTranslations("nav");

  const role = session?.user?.role ?? "";
  const [data, setData] = useState<DashboardData | null>(null);
  const [chartData, setChartData] = useState<ChartDay[]>([]);
  const [todayCoursesList, setTodayCoursesList] = useState<CourseSchedule[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [children, setChildren] = useState<Student[]>([]);
  const [studentDetail, setStudentDetail] = useState<{
    attendances: Array<{ status: string; courseSession: { date: string; homework: string | null; content: string | null } }>;
    progressItems: Array<{ title: string; level: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboard, reports] = await Promise.all([
        apiFetch<DashboardData>("/api/dashboard"),
        role === "ADMIN"
          ? apiFetch<{ attendanceByDay: Array<{ day: number; rate: number }> }>(
              "/api/reports"
            )
          : Promise.resolve(null),
      ]);

      setData(dashboard);

      if (reports) {
        setChartData(
          reports.attendanceByDay.map((d) => ({
            ...d,
            label: tDays(DAY_KEYS[d.day]),
          }))
        );
      }

      const today = getTodayDayOfWeek();

      if (role === "TEACHER" || role === "ADMIN") {
        const courses = await apiFetch<CourseSchedule[]>(
          `/api/courses?dayOfWeek=${today}`
        );
        setTodayCoursesList(courses);
      }

      if (role === "TEACHER") {
        const classStudents = await apiFetch<Student[]>("/api/students");
        setStudents(classStudents);
      }

      if (role === "PARENT") {
        const kids = await apiFetch<Student[]>("/api/students");
        setChildren(kids);
      }

      if (role === "STUDENT" && session?.user?.id) {
        const detail = await apiFetch<{
          attendances: Array<{
            status: string;
            courseSession: { date: string; homework: string | null; content: string | null };
          }>;
          progressItems: Array<{ title: string; level: string }>;
        }>(`/api/students/${session.user.id}`);
        setStudentDetail(detail);
        const myCourses = await apiFetch<CourseSchedule[]>("/api/courses");
        setTodayCoursesList(
          myCourses.filter((c) => c.dayOfWeek === today)
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [role, session?.user?.id, tDays]);

  useEffect(() => {
    if (session?.user) load();
  }, [session?.user, load]);

  const weekSessions = useMemo(() => {
    if (!data?.recentActivity) return [];
    const start = getWeekStart();
    const end = getWeekEnd();
    return data.recentActivity.filter((s) => {
      const d = new Date(s.date);
      return d >= start && d <= end;
    });
  }, [data?.recentActivity]);

  if (loading) return <PageLoading />;

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-destructive">
        {error || tCommon("noResults")}
      </div>
    );
  }

  if (role === "ADMIN") {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title={t("totalStudents")}
            value={data.totalStudents}
            icon={GraduationCap}
            borderColor="border-s-indigo-500"
            iconBg="bg-indigo-100 text-indigo-600"
          />
          <StatCard
            title={t("totalTeachers")}
            value={data.totalTeachers}
            icon={UserCog}
            borderColor="border-s-emerald-500"
            iconBg="bg-emerald-100 text-emerald-600"
          />
          <StatCard
            title={t("todayCourses")}
            value={data.todayCourses}
            icon={Calendar}
            borderColor="border-s-blue-500"
            iconBg="bg-blue-100 text-blue-600"
          />
          <StatCard
            title={t("unpaidAlerts")}
            value={data.unpaidAlerts.length}
            icon={CreditCard}
            borderColor="border-s-amber-500"
            iconBg="bg-amber-100 text-amber-600"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("attendanceRate")}</CardTitle>
              <CardDescription>{data.attendanceRate}%</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={data.attendanceRate} className="h-3" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("attendanceByDay")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => [`${v}%`, t("attendanceRate")]} />
                    <Bar dataKey="rate" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("recentActivity")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{tCommon("noResults")}</p>
                ) : (
                  data.recentActivity.slice(0, 10).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-start justify-between gap-4 rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{session.courseSchedule.class.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(session.date), "PP")}
                          {session.courseSchedule.teacher &&
                            ` · ${formatPerson(
                              session.courseSchedule.teacher.firstName,
                              session.courseSchedule.teacher.lastName
                            )}`}
                        </p>
                      </div>
                      <Badge variant="secondary">{session.courseSchedule.class.name}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("quickActions")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button asChild variant="outline" className="justify-start gap-2">
                <Link href="/dashboard/students">
                  <GraduationCap className="h-4 w-4" />
                  {t("addStudent")}
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2">
                <Link href="/dashboard/courses">
                  <BookOpen className="h-4 w-4" />
                  {t("addCourse")}
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2">
                <Link href="/dashboard/reports">
                  <FileBarChart className="h-4 w-4" />
                  {t("generateReport")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                {tAtt("consecutiveAbsences")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.consecutiveAbsenceAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tCommon("noResults")}</p>
              ) : (
                data.consecutiveAbsenceAlerts.map((a) => (
                  <div key={a.studentId} className="rounded-lg bg-amber-50 p-3 text-sm">
                    <span className="font-medium">{a.studentName}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      — {a.consecutiveAbsences} {tAtt("absenceAlert")}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <CreditCard className="h-5 w-5" />
                {tPay("unpaidAlert")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.unpaidAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tCommon("noResults")}</p>
              ) : (
                data.unpaidAlerts.map((a) => (
                  <div key={a.studentId} className="rounded-lg bg-red-50 p-3 text-sm">
                    <span className="font-medium">{a.studentName}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      — {a.unpaidMonths} {tPay("monthsUnpaid")}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (role === "TEACHER") {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} />

        <Card>
          <CardHeader>
            <CardTitle>{t("todayCourses")}</CardTitle>
            <CardDescription>{todayCoursesList.length} {tCourses("schedule")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayCoursesList.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tCommon("noResults")}</p>
            ) : (
              todayCoursesList.map((course) => (
                <div
                  key={course.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">{course.class.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {course.startTime} – {course.endTime} · {course.room.name}
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link href="/dashboard/attendance">
                      <ClipboardCheck className="me-2 h-4 w-4" />
                      {tAtt("markAttendance")}
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("studentsOverview")}</CardTitle>
            <CardDescription>{students.length} {t("totalStudents").toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {students.map((student) => (
                <div key={student.id} className="rounded-lg border p-3">
                  <p className="font-medium">
                    {formatPerson(student.firstName, student.lastName)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {student.class?.name ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (role === "PARENT") {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} />

        {children.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {tCommon("noResults")}
            </CardContent>
          </Card>
        ) : (
          children.map((child) => {
            const attended = countCoursesAttended(child.attendances);
            const childSessions = data.recentActivity.filter((s) =>
              s.attendances?.some(
                (a) =>
                  a.student &&
                  `${a.student.firstName} ${a.student.lastName}` ===
                    formatPerson(child.firstName, child.lastName)
              )
            );

            return (
              <Card key={child.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        {formatPerson(child.firstName, child.lastName)}
                      </CardTitle>
                      <CardDescription>{child.class?.name ?? "—"}</CardDescription>
                    </div>
                    <Badge variant="outline">
                      {attended}/{COURSE_GOAL}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{t("coursesRemaining")}</span>
                      <span>{attended}/{COURSE_GOAL}</span>
                    </div>
                    <Progress value={(attended / COURSE_GOAL) * 100} />
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-semibold">{tParent("thisWeekLearned")}</h4>
                    {weekSessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{tCommon("noResults")}</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {weekSessions.slice(0, 3).map((s) => (
                          <li key={s.id}>
                            {format(new Date(s.date), "EEE")}: {s.content || "—"}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-semibold">{tParent("homeworkToDo")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {childSessions.find((s) => s.homework)?.homework ?? "—"}
                    </p>
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-semibold">{t("recentAttendance")}</h4>
                    <div className="flex flex-wrap gap-2">
                      {childSessions.slice(0, 5).map((s) => {
                        const att = s.attendances?.[0];
                        return (
                          <div key={s.id} className="flex items-center gap-2 text-sm">
                            <span>{format(new Date(s.date), "MM/dd")}</span>
                            {att && <AttendanceBadge status={att.status} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    );
  }

  if (role === "STUDENT") {
    const attended = countCoursesAttended(
      studentDetail?.attendances?.map((a) => ({ status: a.status }))
    );
    const progress = (attended / COURSE_GOAL) * 100;

    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="flex flex-col items-center justify-center p-8">
            <div className="relative flex h-40 w-40 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${progress * 2.64} 264`}
                  className="text-primary"
                />
              </svg>
              <div className="absolute text-center">
                <p className="text-3xl font-bold">{attended}</p>
                <p className="text-sm text-muted-foreground">/ {COURSE_GOAL}</p>
              </div>
            </div>
            <p className="mt-4 font-medium">{t("coursesRemaining")}</p>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("thisWeekSchedule")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {todayCoursesList.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tCommon("noResults")}</p>
              ) : (
                todayCoursesList.map((c) => (
                  <div key={c.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{c.class.name}</p>
                    <p className="text-muted-foreground">
                      {tDays(DAY_KEYS[c.dayOfWeek])} · {c.startTime} · {c.room.name}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{tCourses("homework")}</CardTitle>
            </CardHeader>
            <CardContent>
              {studentDetail?.attendances?.find((a) => a.courseSession.homework) ? (
                <p className="text-sm">
                  {studentDetail.attendances.find((a) => a.courseSession.homework)
                    ?.courseSession.homework}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">{tCommon("noResults")}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tNav("progress")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {studentDetail?.progressItems?.length ? (
                studentDetail.progressItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-2">
                    <span className="text-sm">{item.title}</span>
                    <Badge
                      variant="outline"
                      className={
                        item.level === "ACQUIRED"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : item.level === "IN_PROGRESS"
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                      }
                    >
                      {tProgress(
                        item.level === "ACQUIRED"
                          ? "acquired"
                          : item.level === "IN_PROGRESS"
                            ? "inProgress"
                            : "learning"
                      )}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{tCommon("noResults")}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {todayCoursesList[0] && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-3 p-4">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{t("nextCourseReminder")}</p>
                <p className="text-sm text-muted-foreground">
                  {todayCoursesList[0].class.name} · {todayCoursesList[0].startTime} ·{" "}
                  {todayCoursesList[0].room.name}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <PageHeader title={t("title")} description={tCommon("noResults")} />
  );
}
