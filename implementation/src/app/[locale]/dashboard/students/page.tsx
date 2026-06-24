"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageLoading } from "@/components/dashboard/page-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  apiFetch,
  countCoursesAttended,
  formatPerson,
  getPaymentStatus,
  paginate,
} from "@/lib/dashboard-helpers";
import { PasswordInput, isPasswordValid } from "@/components/ui/password-input";

type Student = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  gender: string | null;
  birthDate: string | null;
  class: { id: string; name: string } | null;
  parentId: string | null;
  attendances?: Array<{ status: string }>;
  payments?: Array<{ date: string; amount: number }>;
};

type ClassItem = { id: string; name: string };

const PAGE_SIZE = 10;

export default function StudentsPage() {
  const t = useTranslations("students");
  const tCommon = useTranslations("common");
  const tAuth = useTranslations("auth");
  const tPay = useTranslations("payments");

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [parents, setParents] = useState<Array<{ id: string; firstName: string; lastName: string; email: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    gender: "M",
    birthDate: "",
    classId: "",
    parentId: "",
  });

  function resetForm() {
    setForm({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      gender: "M",
      birthDate: "",
      classId: "",
      parentId: "",
    });
  }

  function openAdd() {
    setEditStudent(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(student: Student) {
    setEditStudent(student);
    setForm({
      email: student.email,
      password: "",
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender ?? "M",
      birthDate: student.birthDate ? student.birthDate.split("T")[0] : "",
      classId: student.class?.id ?? "",
      parentId: student.parentId ?? "",
    });
    setDialogOpen(true);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (classFilter !== "all") params.set("classId", classFilter);
      const [studentsData, classesData] = await Promise.all([
        apiFetch<Student[]>(`/api/students?${params}`),
        apiFetch<ClassItem[]>("/api/classes"),
      ]);
      setStudents(studentsData);
      setClasses(classesData);
    } finally {
      setLoading(false);
    }
  }, [search, classFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    apiFetch<Array<{ id: string; firstName: string; lastName: string; email: string }>>(
      "/api/parents"
    )
      .then(setParents)
      .catch(() => []);
  }, []);

  const filtered = useMemo(() => students, [students]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = paginate(filtered, page, PAGE_SIZE);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editStudent && !isPasswordValid(form.password)) return;
    if (editStudent && form.password && !isPasswordValid(form.password)) return;
    setSaving(true);
    try {
      if (editStudent) {
        await apiFetch(`/api/students/${editStudent.id}`, {
          method: "PUT",
          body: JSON.stringify({
            email: form.email,
            firstName: form.firstName,
            lastName: form.lastName,
            gender: form.gender,
            birthDate: form.birthDate || undefined,
            classId: form.classId || null,
            parentId: form.parentId || null,
            ...(form.password ? { password: form.password } : {}),
          }),
        });
      } else {
        await apiFetch("/api/students", {
          method: "POST",
          body: JSON.stringify({
            ...form,
            birthDate: form.birthDate,
            classId: form.classId || undefined,
            parentId: form.parentId || undefined,
          }),
        });
      }
      setDialogOpen(false);
      resetForm();
      setEditStudent(null);
      await load();
    } catch {
      /* toast could go here */
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(student: Student) {
    if (!confirm(tCommon("confirm"))) return;
    try {
      await apiFetch(`/api/students/${student.id}`, { method: "DELETE" });
      await load();
    } catch {
      /* silent */
    }
  }

  function paymentBadge(status: ReturnType<typeof getPaymentStatus>) {
    if (status === "paid")
      return <Badge className="bg-emerald-100 text-emerald-800">{tPay("normal")}</Badge>;
    if (status === "free")
      return <Badge className="bg-blue-100 text-blue-800">{tPay("free")}</Badge>;
    return <Badge variant="destructive">{tPay("unpaidAlert")}</Badge>;
  }

  if (loading && students.length === 0) return <PageLoading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        actions={
          <Button onClick={openAdd}>
            <Plus className="me-2 h-4 w-4" />
            {t("addStudent")}
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="ps-9"
            placeholder={tCommon("search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={classFilter}
          onValueChange={(v) => {
            setClassFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder={t("class")} />
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
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{tAuth("email")}</TableHead>
              <TableHead>{t("class")}</TableHead>
              <TableHead>{t("coursesAttended")}</TableHead>
              <TableHead>{tCommon("status")}</TableHead>
              <TableHead>{tCommon("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {tCommon("noResults")}
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    {formatPerson(student.firstName, student.lastName)}
                  </TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.class?.name ?? "—"}</TableCell>
                  <TableCell>{countCoursesAttended(student.attendances)}</TableCell>
                  <TableCell>{paymentBadge(getPaymentStatus(student.payments))}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(student)}
                        title={tCommon("edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(student)}
                        title={tCommon("delete")}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} {t("title").toLowerCase()}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {tCommon("previous")}
          </Button>
          <span className="flex items-center px-2 text-sm">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {tCommon("next")}
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) setEditStudent(null);
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editStudent ? `${tCommon("edit")} — ${formatPerson(editStudent.firstName, editStudent.lastName)}` : t("addStudent")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{tAuth("firstName")}</Label>
                <Input
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{tAuth("lastName")}</Label>
                <Input
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{tAuth("email")}</Label>
              <Input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>
                {tAuth("password")}
                {editStudent && " (optional)"}
              </Label>
              <PasswordInput
                value={form.password}
                onChange={(v) => setForm({ ...form, password: v })}
                required={!editStudent}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("gender")}</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => setForm({ ...form, gender: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">{t("male")}</SelectItem>
                    <SelectItem value="F">{t("female")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("birthDate")}</Label>
                <Input
                  type="date"
                  required
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("class")}</Label>
              <Select
                value={form.classId}
                onValueChange={(v) => setForm({ ...form, classId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("class")} />
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
              <Label>{t("parent")}</Label>
              <Select
                value={form.parentId}
                onValueChange={(v) => setForm({ ...form, parentId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("parent")} />
                </SelectTrigger>
                <SelectContent>
                  {parents.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
