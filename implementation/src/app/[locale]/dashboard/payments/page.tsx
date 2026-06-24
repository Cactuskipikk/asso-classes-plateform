"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { format, startOfMonth, subMonths } from "date-fns";
import { AlertTriangle, Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageLoading } from "@/components/dashboard/page-loading";
import { StatCard } from "@/components/dashboard/stat-card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  apiFetch,
  formatPerson,
} from "@/lib/dashboard-helpers";
import { CreditCard, Gift, Wallet } from "lucide-react";

type Payment = {
  id: string;
  amount: number;
  type: string;
  date: string;
  notes: string | null;
  student: { id: string; firstName: string; lastName: string };
};

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  payments?: Payment[];
};

export default function PaymentsPage() {
  const t = useTranslations("payments");
  const tCommon = useTranslations("common");
  const tStudents = useTranslations("students");

  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    studentId: "",
    amount: "",
    type: "NORMAL",
    date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      const [paymentsData, studentsData] = await Promise.all([
        apiFetch<Payment[]>(`/api/payments?${params}`),
        apiFetch<Student[]>("/api/students"),
      ]);
      setPayments(paymentsData);
      setStudents(studentsData);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const d = new Date(p.date);
      if (startDate && d < new Date(startDate)) return false;
      if (endDate && d > new Date(endDate)) return false;
      return true;
    });
  }, [payments, startDate, endDate]);

  const summary = useMemo(() => {
    const collected = filtered.reduce((s, p) => s + p.amount, 0);
    const freeCount = filtered.filter((p) => p.type === "FREE").length;
    const now = new Date();
    const unpaid = students.filter((student) => {
      const paidMonths = new Set(
        (student.payments ?? [])
          .filter((p) => p.amount > 0)
          .map((p) => startOfMonth(new Date(p.date)).getTime())
      );
      const months = [
        startOfMonth(subMonths(now, 1)).getTime(),
        startOfMonth(now).getTime(),
      ];
      return months.some((m) => !paidMonths.has(m));
    });
    return { collected, freeCount, unpaidCount: unpaid.length, unpaidStudents: unpaid };
  }, [filtered, students]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          studentId: form.studentId,
          amount: parseFloat(form.amount),
          type: form.type,
          date: form.date,
          notes: form.notes || undefined,
        }),
      });
      setDialogOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function typeLabel(type: string) {
    if (type === "REDUCED") return t("reduced");
    if (type === "FREE") return t("free");
    return t("normal");
  }

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="me-2 h-4 w-4" />
            {t("addPayment")}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title={t("totalCollected")}
          value={`${summary.collected.toFixed(0)} €`}
          icon={Wallet}
          borderColor="border-s-emerald-500"
          iconBg="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          title={t("outstanding")}
          value={summary.unpaidCount}
          icon={CreditCard}
          borderColor="border-s-amber-500"
          iconBg="bg-amber-100 text-amber-600"
        />
        <StatCard
          title={t("freeStudents")}
          value={summary.freeCount}
          icon={Gift}
          borderColor="border-s-blue-500"
          iconBg="bg-blue-100 text-blue-600"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="sm:w-[180px]">
            <SelectValue placeholder={t("type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("total")}</SelectItem>
            <SelectItem value="NORMAL">{t("normal")}</SelectItem>
            <SelectItem value="REDUCED">{t("reduced")}</SelectItem>
            <SelectItem value="FREE">{t("free")}</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tStudents("name")}</TableHead>
              <TableHead>{t("amount")}</TableHead>
              <TableHead>{t("type")}</TableHead>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("notes")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {tCommon("noResults")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {formatPerson(p.student.firstName, p.student.lastName)}
                  </TableCell>
                  <TableCell>{p.amount.toFixed(2)} €</TableCell>
                  <TableCell>
                    <Badge variant="outline">{typeLabel(p.type)}</Badge>
                  </TableCell>
                  <TableCell>{format(new Date(p.date), "PP")}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {p.notes ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            {t("twoMonthsUnpaid")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {summary.unpaidStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tCommon("noResults")}</p>
          ) : (
            summary.unpaidStudents.map((s) => (
              <div key={s.id} className="rounded-lg bg-amber-50 p-3 text-sm">
                {formatPerson(s.firstName, s.lastName)}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addPayment")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>{tStudents("name")}</Label>
              <Select
                value={form.studentId}
                onValueChange={(v) => setForm({ ...form, studentId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {formatPerson(s.firstName, s.lastName)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("amount")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("type")}</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">{t("normal")}</SelectItem>
                    <SelectItem value="REDUCED">{t("reduced")}</SelectItem>
                    <SelectItem value="FREE">{t("free")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("date")}</Label>
              <Input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("notes")}</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
