"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, Loader2, Plus, Users } from "lucide-react";
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
import { apiFetch, formatPerson } from "@/lib/dashboard-helpers";

type ClassItem = {
  id: string;
  name: string;
  organizationType: string;
  ageMin: number | null;
  ageMax: number | null;
  studentCount: number;
  discipline: { id: string; name: string };
  schoolYear: { id: string; name: string };
};

type Discipline = { id: string; name: string };
type SchoolYear = { id: string; name: string; active: boolean };
type Course = {
  classId: string;
  teacher: { firstName: string; lastName: string };
};
type ClassDetail = ClassItem & {
  students: Array<{ id: string; firstName: string; lastName: string; email: string }>;
};

export default function ClassesPage() {
  const t = useTranslations("classes");
  const tCommon = useTranslations("common");

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    organizationType: "BY_SUBJECT",
    ageMin: "",
    ageMax: "",
    disciplineId: "",
    schoolYearId: "",
  });

  const teacherMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of courses) {
      if (!map.has(c.classId)) {
        map.set(
          c.classId,
          formatPerson(c.teacher.firstName, c.teacher.lastName)
        );
      }
    }
    return map;
  }, [courses]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [classesData, disciplinesData, yearsData, coursesData] =
        await Promise.all([
          apiFetch<ClassItem[]>("/api/classes"),
          apiFetch<Discipline[]>("/api/disciplines"),
          apiFetch<SchoolYear[]>("/api/school-years"),
          apiFetch<Course[]>("/api/courses"),
        ]);
      setClasses(classesData);
      setDisciplines(disciplinesData);
      setSchoolYears(yearsData);
      setCourses(coursesData);
      const activeYear = yearsData.find((y) => y.active);
      if (activeYear) {
        setForm((f) => ({ ...f, schoolYearId: activeYear.id }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openClassDetail(id: string) {
    const detail = await apiFetch<ClassDetail>(`/api/classes/${id}`);
    setSelectedClass(detail);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/classes", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          organizationType: form.organizationType,
          disciplineId: form.disciplineId,
          schoolYearId: form.schoolYearId,
          ...(form.organizationType === "BY_AGE"
            ? {
                ageMin: parseInt(form.ageMin, 10),
                ageMax: parseInt(form.ageMax, 10),
              }
            : {}),
        }),
      });
      setDialogOpen(false);
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
            {t("addClass")}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {classes.map((cls) => (
          <Card
            key={cls.id}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => openClassDetail(cls.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{cls.name}</CardTitle>
                <Badge variant="secondary">{cls.discipline.name}</Badge>
              </div>
              <CardDescription>
                {cls.organizationType === "BY_AGE"
                  ? `${t("byAge")} (${cls.ageMin}-${cls.ageMax})`
                  : t("bySubject")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                {cls.studentCount} {t("studentCount")}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                {teacherMap.get(cls.id) ?? "—"}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedClass} onOpenChange={() => setSelectedClass(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedClass?.name}</DialogTitle>
          </DialogHeader>
          {selectedClass && (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedClass.students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        {tCommon("noResults")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedClass.students.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          {formatPerson(s.firstName, s.lastName)}
                        </TableCell>
                        <TableCell>{s.email}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addClass")}</DialogTitle>
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
              <Label>{t("discipline")}</Label>
              <Select
                value={form.disciplineId}
                onValueChange={(v) => setForm({ ...form, disciplineId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("discipline")} />
                </SelectTrigger>
                <SelectContent>
                  {disciplines.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("organizationType")}</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="orgType"
                    checked={form.organizationType === "BY_SUBJECT"}
                    onChange={() =>
                      setForm({ ...form, organizationType: "BY_SUBJECT" })
                    }
                  />
                  {t("bySubject")}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="orgType"
                    checked={form.organizationType === "BY_AGE"}
                    onChange={() =>
                      setForm({ ...form, organizationType: "BY_AGE" })
                    }
                  />
                  {t("byAge")}
                </label>
              </div>
            </div>
            {form.organizationType === "BY_AGE" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("ageRange")} min</Label>
                  <Input
                    type="number"
                    required
                    value={form.ageMin}
                    onChange={(e) => setForm({ ...form, ageMin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("ageRange")} max</Label>
                  <Input
                    type="number"
                    required
                    value={form.ageMax}
                    onChange={(e) => setForm({ ...form, ageMax: e.target.value })}
                  />
                </div>
              </div>
            )}
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
