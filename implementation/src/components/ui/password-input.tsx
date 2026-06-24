"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordRule = {
  key: string;
  test: (v: string) => boolean;
};

const rules: PasswordRule[] = [
  { key: "minLength", test: (v) => v.length >= 8 },
  { key: "uppercase", test: (v) => /[A-Z]/.test(v) },
  { key: "digit", test: (v) => /[0-9]/.test(v) },
  { key: "special", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

type PasswordInputProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  showRules?: boolean;
  placeholder?: string;
};

export function PasswordInput({
  value,
  onChange,
  id,
  disabled,
  required,
  autoComplete = "new-password",
  showRules = true,
  placeholder,
}: PasswordInputProps) {
  const t = useTranslations("passwordRules");
  const [visible, setVisible] = useState(false);
  const [touched, setTouched] = useState(false);

  const show = showRules && touched && value.length > 0;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setTouched(true)}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="pe-10"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {show && (
        <ul className="space-y-1 text-xs">
          {rules.map((rule) => {
            const passed = rule.test(value);
            return (
              <li
                key={rule.key}
                className={cn(
                  "flex items-center gap-1.5 transition-colors",
                  passed ? "text-emerald-600" : "text-muted-foreground"
                )}
              >
                {passed ? (
                  <Check className="h-3 w-3 shrink-0" />
                ) : (
                  <X className="h-3 w-3 shrink-0" />
                )}
                {t(rule.key)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function isPasswordValid(value: string): boolean {
  return rules.every((r) => r.test(value));
}
