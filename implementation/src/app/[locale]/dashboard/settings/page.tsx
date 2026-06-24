"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageLoading } from "@/components/dashboard/page-loading";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/dashboard-helpers";

type UserProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  locale: string;
  notifyPush: boolean;
  notifyEmail: boolean;
};

type SchoolYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
};

type Discipline = {
  id: string;
  name: string;
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tAuth = useTranslations("auth");
  const tLayout = useTranslations("layout");
  const tSchool = useTranslations("schoolYear");

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newDiscipline, setNewDiscipline] = useState("");
  const [yearForm, setYearForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const user = await apiFetch<UserProfile>("/api/users/me");
      setProfile(user);

      if (user.role === "ADMIN") {
        const [years, discs] = await Promise.all([
          apiFetch<SchoolYear[]>("/api/school-years"),
          apiFetch<Discipline[]>("/api/disciplines"),
        ]);
        setSchoolYears(years);
        setDisciplines(discs);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const updated = await apiFetch<UserProfile>("/api/users/me", {
        method: "PUT",
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
          locale: profile.locale,
          notifyPush: profile.notifyPush,
          notifyEmail: profile.notifyEmail,
        }),
      });
      setProfile(updated);
      if (updated.locale !== profile.locale) {
        router.replace("/dashboard/settings", { locale: updated.locale as "fr" | "en" | "tr" | "ar" | "ku" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function addDiscipline(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch("/api/disciplines", {
      method: "POST",
      body: JSON.stringify({ name: newDiscipline }),
    });
    setNewDiscipline("");
    const discs = await apiFetch<Discipline[]>("/api/disciplines");
    setDisciplines(discs);
  }

  async function addSchoolYear(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch("/api/school-years", {
      method: "POST",
      body: JSON.stringify({
        ...yearForm,
        active: true,
      }),
    });
    setYearForm({ name: "", startDate: "", endDate: "" });
    const years = await apiFetch<SchoolYear[]>("/api/school-years");
    setSchoolYears(years);
  }

  async function archiveYear(id: string) {
    if (!confirm(tSchool("confirmArchive"))) return;
    await apiFetch(`/api/school-years/${id}`, {
      method: "PUT",
      body: JSON.stringify({ active: false }),
    });
    const years = await apiFetch<SchoolYear[]>("/api/school-years");
    setSchoolYears(years);
  }

  if (loading || !profile) return <PageLoading />;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />

      <form onSubmit={saveProfile} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("profile")}</CardTitle>
            <CardDescription>{t("profileDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{tAuth("firstName")}</Label>
                <Input
                  value={profile.firstName}
                  onChange={(e) =>
                    setProfile({ ...profile, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{tAuth("lastName")}</Label>
                <Input
                  value={profile.lastName}
                  onChange={(e) =>
                    setProfile({ ...profile, lastName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{tAuth("email")}</Label>
              <Input value={profile.email} disabled />
            </div>
            <div className="space-y-2">
              <Label>{tAuth("phone")}</Label>
              <Input
                value={profile.phone ?? ""}
                onChange={(e) =>
                  setProfile({ ...profile, phone: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("notifications")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="push">{t("pushNotifications")}</Label>
              <Switch
                id="push"
                checked={profile.notifyPush}
                onCheckedChange={(v) =>
                  setProfile({ ...profile, notifyPush: v })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email">{t("emailNotifications")}</Label>
              <Switch
                id="email"
                checked={profile.notifyEmail}
                onCheckedChange={(v) =>
                  setProfile({ ...profile, notifyEmail: v })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tLayout("language")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={profile.locale}
              onValueChange={(v) => setProfile({ ...profile, locale: v })}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="tr">Türkçe</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
                <SelectItem value="ku">Kurdî</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {tCommon("save")}
        </Button>
      </form>

      {profile.role === "ADMIN" && (
        <>
          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>{tSchool("title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {schoolYears.map((year) => (
                <div
                  key={year.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {year.name}
                      {year.active && (
                        <span className="ms-2 text-xs text-emerald-600">
                          ({tSchool("current")})
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {year.startDate.slice(0, 10)} – {year.endDate.slice(0, 10)}
                    </p>
                  </div>
                  {year.active && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => archiveYear(year.id)}
                    >
                      <Trash2 className="me-2 h-4 w-4" />
                      {tSchool("archive")}
                    </Button>
                  )}
                </div>
              ))}

              <form onSubmit={addSchoolYear} className="space-y-3 border-t pt-4">
                <p className="font-medium">{tSchool("startNewYear")}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input
                    placeholder={tSchool("yearName")}
                    required
                    value={yearForm.name}
                    onChange={(e) =>
                      setYearForm({ ...yearForm, name: e.target.value })
                    }
                  />
                  <Input
                    type="date"
                    required
                    value={yearForm.startDate}
                    onChange={(e) =>
                      setYearForm({ ...yearForm, startDate: e.target.value })
                    }
                  />
                  <Input
                    type="date"
                    required
                    value={yearForm.endDate}
                    onChange={(e) =>
                      setYearForm({ ...yearForm, endDate: e.target.value })
                    }
                  />
                </div>
                <Button type="submit" size="sm">
                  <Plus className="me-2 h-4 w-4" />
                  {tSchool("startNewYear")}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("disciplines")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {disciplines.map((d) => (
                  <li key={d.id} className="rounded-lg border px-3 py-2 text-sm">
                    {d.name}
                  </li>
                ))}
              </ul>
              <form onSubmit={addDiscipline} className="flex gap-2">
                <Input
                  required
                  placeholder={t("disciplineName")}
                  value={newDiscipline}
                  onChange={(e) => setNewDiscipline(e.target.value)}
                />
                <Button type="submit" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
