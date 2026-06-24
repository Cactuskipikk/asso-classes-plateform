"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { format, isPast, isToday } from "date-fns";
import { AlertCircle, CalendarDays, Loader2, Plus, Users } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, formatPerson } from "@/lib/dashboard-helpers";

type BoardMember = {
  id: string;
  firstName: string;
  lastName: string;
};

type Decision = {
  id: string;
  description: string;
  reviewDate: string;
  applied: boolean | null;
  notAppliedReason: string | null;
};

type Meeting = {
  id: string;
  date: string;
  notes: string | null;
  attendances: Array<{
    memberId: string;
    present: boolean;
    member: BoardMember;
  }>;
  decisions: Decision[];
};

export default function MeetingsPage() {
  const t = useTranslations("meetings");
  const tCommon = useTranslations("common");

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [decisionText, setDecisionText] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [meetingDate, setMeetingDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meetingsData, teachersData] = await Promise.all([
        apiFetch<Meeting[]>("/api/meetings"),
        apiFetch<BoardMember[]>("/api/teachers"),
      ]);
      setMeetings(meetingsData);
      setMembers(teachersData.slice(0, 9));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dueDecisions = useMemo(() => {
    const all: Array<Decision & { meetingDate: string }> = [];
    for (const m of meetings) {
      for (const d of m.decisions) {
        if (
          d.applied === null &&
          (isPast(new Date(d.reviewDate)) || isToday(new Date(d.reviewDate)))
        ) {
          all.push({ ...d, meetingDate: m.date });
        }
      }
    }
    return all;
  }, [meetings]);

  function openMeeting(meeting: Meeting) {
    setSelected(meeting);
    setNotes(meeting.notes ?? "");
    const map: Record<string, boolean> = {};
    for (const m of members) {
      const att = meeting.attendances.find((a) => a.memberId === m.id);
      map[m.id] = att?.present ?? false;
    }
    setAttendanceMap(map);
  }

  async function saveMeeting() {
    if (!selected) return;
    setSaving(true);
    try {
      await apiFetch(`/api/meetings/${selected.id}`, {
        method: "PUT",
        body: JSON.stringify({ notes }),
      });
      await apiFetch(`/api/meetings/${selected.id}/attendances`, {
        method: "PUT",
        body: JSON.stringify({
          attendances: members.map((m) => ({
            memberId: m.id,
            present: attendanceMap[m.id] ?? false,
          })),
        }),
      });
      await load();
      const updated = await apiFetch<Meeting>(`/api/meetings/${selected.id}`);
      setSelected(updated);
    } finally {
      setSaving(false);
    }
  }

  async function addDecision(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    await apiFetch(`/api/meetings/${selected.id}/decisions`, {
      method: "POST",
      body: JSON.stringify({ description: decisionText }),
    });
    setDecisionText("");
    const updated = await apiFetch<Meeting>(`/api/meetings/${selected.id}`);
    setSelected(updated);
    await load();
  }

  async function handleAddMeeting(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/meetings", {
        method: "POST",
        body: JSON.stringify({ date: meetingDate }),
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
            {t("addMeeting")}
          </Button>
        }
      />

      {dueDecisions.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-5 w-5" />
              {t("decisionsDueReview")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dueDecisions.map((d) => (
              <div key={d.id} className="rounded-lg border border-amber-200 bg-white p-3 text-sm">
                <p>{d.description}</p>
                <p className="text-muted-foreground">
                  {t("reviewDate")}: {format(new Date(d.reviewDate), "PP")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {meetings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {tCommon("noResults")}
              </CardContent>
            </Card>
          ) : (
            meetings.map((meeting) => (
              <Card
                key={meeting.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => openMeeting(meeting)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">
                        {format(new Date(meeting.date), "PPP")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {meeting.decisions.length} {t("decisions")}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    {meeting.attendances.filter((a) => a.present).length}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {selected && (
          <Card>
            <CardHeader>
              <CardTitle>{format(new Date(selected.date), "PPP")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="mb-2 font-medium">{t("members")}</h4>
                <div className="space-y-2">
                  {members.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-3 rounded-lg border p-2"
                    >
                      <Checkbox
                        checked={attendanceMap[member.id] ?? false}
                        onCheckedChange={(checked) =>
                          setAttendanceMap({
                            ...attendanceMap,
                            [member.id]: checked === true,
                          })
                        }
                      />
                      <span className="text-sm">
                        {formatPerson(member.firstName, member.lastName)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("notes")}</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <Button onClick={saveMeeting} disabled={saving}>
                {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {tCommon("save")}
              </Button>

              <div>
                <h4 className="mb-2 font-medium">{t("decisions")}</h4>
                <div className="mb-3 space-y-2">
                  {selected.decisions.map((d) => (
                    <div key={d.id} className="rounded-lg border p-3 text-sm">
                      <p>{d.description}</p>
                      <p className="text-muted-foreground">
                        {t("reviewDate")}: {format(new Date(d.reviewDate), "PP")}
                      </p>
                    </div>
                  ))}
                </div>
                <form onSubmit={addDecision} className="flex gap-2">
                  <Input
                    required
                    placeholder={t("addDecision")}
                    value={decisionText}
                    onChange={(e) => setDecisionText(e.target.value)}
                  />
                  <Button type="submit" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addMeeting")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMeeting} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("date")}</Label>
              <Input
                type="date"
                required
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
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
