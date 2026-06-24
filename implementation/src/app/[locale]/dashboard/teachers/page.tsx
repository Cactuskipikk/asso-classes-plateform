"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import { apiFetch, formatPerson } from "@/lib/dashboard-helpers";
import { PasswordInput, isPasswordValid } from "@/components/ui/password-input";

type Teacher = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  teacherType: string;
  titularCourses: Array<{ id: string; class: { name: string } }>;
};

export default function TeachersPage() {
  const t = useTranslations("teachers");
  const tCommon = useTranslations("common");
  const tAuth = useTranslations("auth");

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    teacherType: "TITULAR",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Teacher[]>("/api/teachers");
      setTeachers(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setEditTeacher(null);
    setForm({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
      teacherType: "TITULAR",
    });
    setDialogOpen(true);
  }

  function openEdit(teacher: Teacher) {
    setEditTeacher(teacher);
    setForm({
      email: teacher.email,
      password: "",
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      phone: teacher.phone ?? "",
      teacherType: teacher.teacherType,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password && !isPasswordValid(form.password)) return;
    if (!editTeacher && !isPasswordValid(form.password)) return;
    setSaving(true);
    try {
      if (editTeacher) {
        await apiFetch(`/api/teachers/${editTeacher.id}`, {
          method: "PUT",
          body: JSON.stringify({
            email: form.email,
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone || null,
            teacherType: form.teacherType,
            ...(form.password ? { password: form.password } : {}),
          }),
        });
      } else {
        await apiFetch("/api/teachers", {
          method: "POST",
          body: JSON.stringify(form),
        });
      }
      setDialogOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(tCommon("confirm"))) return;
    await apiFetch(`/api/teachers/${id}`, { method: "DELETE" });
    await load();
  }

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        actions={
          <Button onClick={openAdd}>
            <Plus className="me-2 h-4 w-4" />
            {t("addTeacher")}
          </Button>
        }
      />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name") ?? tAuth("firstName")}</TableHead>
              <TableHead>{tAuth("email")}</TableHead>
              <TableHead>{t("type")}</TableHead>
              <TableHead>{t("assignedCourses")}</TableHead>
              <TableHead>{tCommon("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {tCommon("noResults")}
                </TableCell>
              </TableRow>
            ) : (
              teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">
                    {formatPerson(teacher.firstName, teacher.lastName)}
                  </TableCell>
                  <TableCell>{teacher.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {teacher.teacherType === "TITULAR"
                        ? t("titular")
                        : t("substitute")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {teacher.titularCourses.length > 0
                      ? teacher.titularCourses
                          .map((c) => c.class.name)
                          .join(", ")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(teacher)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(teacher.id)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTeacher ? tCommon("edit") : t("addTeacher")}
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
                {editTeacher && " (optional)"}
              </Label>
              <PasswordInput
                value={form.password}
                onChange={(v) => setForm({ ...form, password: v })}
                required={!editTeacher}
              />
            </div>
            <div className="space-y-2">
              <Label>{tAuth("phone")}</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("type")}</Label>
              <Select
                value={form.teacherType}
                onValueChange={(v) => setForm({ ...form, teacherType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TITULAR">{t("titular")}</SelectItem>
                  <SelectItem value="SUBSTITUTE">{t("substitute")}</SelectItem>
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
