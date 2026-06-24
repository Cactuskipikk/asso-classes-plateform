"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Link } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageLoading } from "@/components/dashboard/page-loading";
import { AttendanceBadge } from "@/components/dashboard/attendance-badge";
import { ProgressLevelBadge } from "@/components/dashboard/progress-level-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  apiFetch,
  COURSE_GOAL,
  countCoursesAttended,
  formatPerson,
} from "@/lib/dashboard-helpers";

type StudentDetail = {
  id: string;
  firstName: string;
  lastName: string;
  class: { name: string } | null;
  attendances: Array<{
    status: string;
    courseSession: {
      date: string;
      homework: string | null;
      content: string | null;
      courseSchedule: { class: { name: string } };
    };
  }>;
  progressItems: Array<{ id: string; title: string; level: string }>;
};

export default function ChildDetailPage() {
  const params = useParams<{ id: string }>();
  const childId = params.id;
  const t = useTranslations("parent");
  const tCommon = useTranslations("common");
  const tCourses = useTranslations("courses");
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "progress";

  const [child, setChild] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    try {
      const data = await apiFetch<StudentDetail>(`/api/students/${childId}`);
      setChild(data);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !child) return <PageLoading />;

  const attended = countCoursesAttended(child.attendances);

  return (
    <div className="space-y-6">
      <PageHeader
        title={formatPerson(child.firstName, child.lastName)}
        description={child.class?.name ?? undefined}
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/children">
              <ArrowLeft className="me-2 h-4 w-4" />
              {tCommon("back")}
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span>{tCourses("schedule")}</span>
            <span>
              {attended}/{COURSE_GOAL}
            </span>
          </div>
          <Progress value={(attended / COURSE_GOAL) * 100} />
        </CardContent>
      </Card>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="progress">{t("childProgress")}</TabsTrigger>
          <TabsTrigger value="attendance">{t("childAttendance")}</TabsTrigger>
          <TabsTrigger value="courses">{tCourses("title")}</TabsTrigger>
          <TabsTrigger value="homework">{tCourses("homework")}</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="mt-4 space-y-2">
          {child.progressItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tCommon("noResults")}</p>
          ) : (
            child.progressItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <span>{item.title}</span>
                  <ProgressLevelBadge level={item.level} />
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="attendance" className="mt-4 space-y-2">
          {child.attendances.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tCommon("noResults")}</p>
          ) : (
            child.attendances.slice(0, 20).map((a, i) => (
              <Card key={i}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">
                      {format(new Date(a.courseSession.date), "PP")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {a.courseSession.courseSchedule.class.name}
                    </p>
                  </div>
                  <AttendanceBadge status={a.status} />
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="courses" className="mt-4 space-y-2">
          {child.attendances.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tCommon("noResults")}</p>
          ) : (
            child.attendances
              .filter((a) => a.status === "PRESENT" || a.status === "LATE")
              .map((a, i) => (
                <Card key={i}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">
                      {format(new Date(a.courseSession.date), "PP")} —{" "}
                      {a.courseSession.courseSchedule.class.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 text-sm text-muted-foreground">
                    {a.courseSession.content ?? "—"}
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>

        <TabsContent value="homework" className="mt-4 space-y-2">
          {child.attendances.filter((a) => a.courseSession.homework).length === 0 ? (
            <p className="text-sm text-muted-foreground">{tCommon("noResults")}</p>
          ) : (
            child.attendances
              .filter((a) => a.courseSession.homework)
              .map((a, i) => (
                <Card key={i}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">
                      {format(new Date(a.courseSession.date), "PP")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 text-sm">
                    {a.courseSession.homework}
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
