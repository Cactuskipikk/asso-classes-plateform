"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import {
  GraduationCap,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useToast } from "@/components/ui/use-toast";
import { PasswordInput, isPasswordValid } from "@/components/ui/password-input";

type ChildForm = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  gender: "M" | "F" | "";
  birthDate: string;
};

function createEmptyChild(): ChildForm {
  return {
    id: crypto.randomUUID(),
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    gender: "",
    birthDate: "",
  };
}

export default function RegisterPage() {
  const t = useTranslations("auth");
  const tStudents = useTranslations("students");
  const tParent = useTranslations("parent");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [gdprConsent, setGdprConsent] = useState(false);
  const [children, setChildren] = useState<ChildForm[]>([createEmptyChild()]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function addChild() {
    setChildren((prev) => [...prev, createEmptyChild()]);
  }

  function removeChild(id: string) {
    setChildren((prev) =>
      prev.length > 1 ? prev.filter((child) => child.id !== id) : prev
    );
  }

  function updateChild(id: string, field: keyof ChildForm, value: string) {
    setChildren((prev) =>
      prev.map((child) =>
        child.id === id ? { ...child, [field]: value } : child
      )
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!isPasswordValid(password)) {
      setError(t("passwordTooWeak"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    if (!gdprConsent) {
      setError(t("gdprConsentLabel"));
      return;
    }

    setIsLoading(true);

    try {
      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          phone,
          gdprConsent: true,
        }),
      });

      if (!registerResponse.ok) {
        const data = await registerResponse.json().catch(() => ({}));
        throw new Error(data.error || t("registerError"));
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        throw new Error(t("registerError"));
      }

      const filledChildren = children.filter(
        (child) =>
          child.firstName ||
          child.lastName ||
          child.email ||
          child.password ||
          child.birthDate
      );

      for (const child of filledChildren) {
        if (
          !child.firstName ||
          !child.lastName ||
          !child.email ||
          !child.password ||
          !child.gender ||
          !child.birthDate
        ) {
          throw new Error(t("registerError"));
        }

        if (!isPasswordValid(child.password)) {
          throw new Error(`${child.firstName}: ${t("passwordTooWeak")}`);
        }

        const studentResponse = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: child.firstName,
            lastName: child.lastName,
            email: child.email,
            password: child.password,
            gender: child.gender,
            birthDate: child.birthDate,
          }),
        });

        if (!studentResponse.ok) {
          const data = await studentResponse.json().catch(() => ({}));
          throw new Error(data.error || t("registerError"));
        }
      }

      toast({
        title: t("registerSuccess"),
      });

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("registerError"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-blue-100 px-4 py-12 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-indigo-300/25 blur-3xl dark:bg-indigo-600/15" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-blue-300/25 blur-3xl dark:bg-blue-600/15" />
      </div>

      <div className="absolute end-4 top-4 z-10">
        <LanguageSwitcher variant="outline" showLabel />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl">
        <Card className="border-white/60 bg-white/85 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl">{t("registerTitle")}</CardTitle>
              <CardDescription>{t("registerSubtitle")}</CardDescription>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-8">
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {error}
                </div>
              )}

              <section className="space-y-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <UserPlus className="h-5 w-5 text-primary" />
                  {t("registerTitle")}
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t("firstName")}</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t("lastName")}</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("phone")}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password">{t("password")}</Label>
                    <PasswordInput
                      id="password"
                      value={password}
                      onChange={setPassword}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
                    <PasswordInput
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      required
                      disabled={isLoading}
                      showRules={false}
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
                  <Checkbox
                    id="gdprConsent"
                    checked={gdprConsent}
                    onCheckedChange={(checked) =>
                      setGdprConsent(checked === true)
                    }
                    disabled={isLoading}
                  />
                  <Label htmlFor="gdprConsent" className="text-sm leading-relaxed">
                    {t("gdprConsent")}{" "}
                    <Link
                      href="/privacy"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {t("privacyPolicy")}
                    </Link>
                  </Label>
                </div>
              </section>

              <Separator />

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold">{t("childrenSection")}</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addChild}
                    disabled={isLoading}
                  >
                    <Plus className="h-4 w-4" />
                    {tParent("addChild")}
                  </Button>
                </div>

                <div className="space-y-6">
                  {children.map((child, index) => (
                    <div
                      key={child.id}
                      className="rounded-xl border bg-muted/20 p-4 shadow-sm"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <p className="text-sm font-medium text-muted-foreground">
                          {tStudents("title")} {index + 1}
                        </p>
                        {children.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeChild(child.id)}
                            disabled={isLoading}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            {tCommon("delete")}
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>{t("firstName")}</Label>
                          <Input
                            value={child.firstName}
                            onChange={(e) =>
                              updateChild(child.id, "firstName", e.target.value)
                            }
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("lastName")}</Label>
                          <Input
                            value={child.lastName}
                            onChange={(e) =>
                              updateChild(child.id, "lastName", e.target.value)
                            }
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("email")}</Label>
                          <Input
                            type="email"
                            value={child.email}
                            onChange={(e) =>
                              updateChild(child.id, "email", e.target.value)
                            }
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("password")}</Label>
                          <PasswordInput
                            value={child.password}
                            onChange={(v) => updateChild(child.id, "password", v)}
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{tStudents("gender")}</Label>
                          <Select
                            value={child.gender}
                            onValueChange={(value) =>
                              updateChild(child.id, "gender", value)
                            }
                            disabled={isLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={tStudents("gender")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="M">{tStudents("male")}</SelectItem>
                              <SelectItem value="F">{tStudents("female")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{tStudents("birthDate")}</Label>
                          <Input
                            type="date"
                            value={child.birthDate}
                            onChange={(e) =>
                              updateChild(child.id, "birthDate", e.target.value)
                            }
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {tCommon("loading")}
                  </>
                ) : (
                  t("register")
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t("hasAccount")}{" "}
                <Link
                  href="/login"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("login")}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
