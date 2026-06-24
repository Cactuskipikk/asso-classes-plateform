"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ArrowRight, ClipboardCheck, TrendingUp } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import {
  apiFetch,
  COURSE_GOAL,
  countCoursesAttended,
  formatPerson,
} from "@/lib/dashboard-helpers";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  class: { name: string } | null;
  attendances?: Array<{ status: string }>;
};

export default function ChildrenPage() {
  const t = useTranslations("parent");
  const tCommon = useTranslations("common");
  const tStudents = useTranslations("students");

  const [children, setChildren] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Student[]>("/api/students");
      setChildren(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <PageHeader title={t("myChildren")} />

      {children.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {tCommon("noResults")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {children.map((child) => {
            const attended = countCoursesAttended(child.attendances);

            return (
              <Card key={child.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>
                        {formatPerson(child.firstName, child.lastName)}
                      </CardTitle>
                      <CardDescription>
                        {child.class?.name ?? tStudents("class")}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {attended}/{COURSE_GOAL}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={(attended / COURSE_GOAL) * 100} />

                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild variant="outline" size="sm" className="justify-start">
                      <Link href={`/dashboard/children/${child.id}`}>
                        <TrendingUp className="me-2 h-4 w-4" />
                        {t("childProgress")}
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="justify-start">
                      <Link href={`/dashboard/children/${child.id}?tab=attendance`}>
                        <ClipboardCheck className="me-2 h-4 w-4" />
                        {t("childAttendance")}
                      </Link>
                    </Button>
                  </div>

                  <Button asChild className="w-full">
                    <Link href={`/dashboard/children/${child.id}`}>
                      {t("viewDetails")}
                      <ArrowRight className="ms-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
