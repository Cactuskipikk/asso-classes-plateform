"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { GripVertical, Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageLoading } from "@/components/dashboard/page-loading";
import {
  ProgressLevelBadge,
  getNextLevel,
} from "@/components/dashboard/progress-level-badge";
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
import { apiFetch, formatPerson } from "@/lib/dashboard-helpers";

type ProgressItem = {
  id: string;
  title: string;
  level: string;
  order: number;
};

type Student = {
  id: string;
  firstName: string;
  lastName: string;
};

export default function ProgressPage() {
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";
  const t = useTranslations("progress");
  const tCommon = useTranslations("common");
  const tStudents = useTranslations("students");

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [items, setItems] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const loadStudents = useCallback(async () => {
    if (role === "STUDENT" && session?.user?.id) {
      setSelectedStudentId(session.user.id);
      return;
    }
    const data = await apiFetch<Student[]>("/api/students");
    setStudents(data);
    if (data.length > 0 && !selectedStudentId) {
      setSelectedStudentId(data[0].id);
    }
  }, [role, session?.user?.id, selectedStudentId]);

  const loadItems = useCallback(async (studentId: string) => {
    if (!studentId) return;
    const data = await apiFetch<ProgressItem[]>(
      `/api/progress?studentId=${studentId}`
    );
    setItems(data);
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        await loadStudents();
      } finally {
        setLoading(false);
      }
    }
    if (role) init();
  }, [role, loadStudents]);

  useEffect(() => {
    if (selectedStudentId) loadItems(selectedStudentId);
  }, [selectedStudentId, loadItems]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudentId) return;
    setSaving(true);
    try {
      await apiFetch("/api/progress", {
        method: "POST",
        body: JSON.stringify({
          studentId: selectedStudentId,
          title: newTitle,
          level: "LEARNING",
          order: items.length,
        }),
      });
      setNewTitle("");
      setDialogOpen(false);
      await loadItems(selectedStudentId);
    } finally {
      setSaving(false);
    }
  }

  async function changeLevel(item: ProgressItem) {
    const next = getNextLevel(item.level as "LEARNING" | "IN_PROGRESS" | "ACQUIRED");
    if (!next) return;
    await apiFetch(`/api/progress/${item.id}`, {
      method: "PUT",
      body: JSON.stringify({ level: next }),
    });
    await loadItems(selectedStudentId);
  }

  async function reorder(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    setItems(reordered.map((item, i) => ({ ...item, order: i })));

    await Promise.all(
      reordered.map((item, i) =>
        apiFetch(`/api/progress/${item.id}`, {
          method: "PUT",
          body: JSON.stringify({ order: i }),
        })
      )
    );
  }

  const canEdit = role === "TEACHER" || role === "ADMIN";

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        actions={
          canEdit && (
            <Button onClick={() => setDialogOpen(true)} disabled={!selectedStudentId}>
              <Plus className="me-2 h-4 w-4" />
              {t("addItem")}
            </Button>
          )
        }
      />

      {(role === "TEACHER" || role === "ADMIN" || role === "PARENT") && (
        <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder={tStudents("name")} />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {formatPerson(s.firstName, s.lastName)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="space-y-2">
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {tCommon("noResults")}
            </CardContent>
          </Card>
        ) : (
          items.map((item, index) => (
            <Card
              key={item.id}
              draggable={canEdit}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) {
                  reorder(dragIndex, index);
                  setDragIndex(null);
                }
              }}
              className="transition-shadow hover:shadow-sm"
            >
              <CardContent className="flex items-center gap-3 p-4">
                {canEdit && (
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.title}</p>
                </div>
                <ProgressLevelBadge level={item.level} />
                {canEdit && item.level !== "ACQUIRED" && (
                  <Button size="sm" variant="outline" onClick={() => changeLevel(item)}>
                    {t("validate")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {role === "PARENT" && students.length > 1 && (
        <div className="grid gap-4 md:grid-cols-2">
          {students.map((child) => (
            <Card key={child.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {formatPerson(child.firstName, child.lastName)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="link"
                  className="p-0"
                  onClick={() => setSelectedStudentId(child.id)}
                >
                  {t("viewProgress")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addItem")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={addItem} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("itemTitle")}</Label>
              <Input
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
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
