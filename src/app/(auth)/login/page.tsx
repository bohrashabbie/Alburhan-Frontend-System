"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Brand } from "@/components/brand";
import { ErrorBanner } from "@/components/ui";
import { session } from "@/lib/api";
import { onSubmit, useAction, useFreshStart } from "@/lib/hooks";
import { saveLocale, useLocale, useT } from "@/lib/locale";

/** Taller fields than the in-app forms, as on the reference sign-in page. */
const INPUT =
  "h-12 w-full rounded-xl border border-line-strong bg-surface px-4 text-base text-ink placeholder:text-ink-faint aria-invalid:border-danger";

function LanguageSwitch() {
  const router = useRouter();
  const arabic = useLocale() === "ar";
  const choose = (locale: "en" | "ar") => {
    saveLocale(locale);
    router.refresh();
  };
  return (
    <div className="flex rounded-full border border-line p-0.5 text-sm">
      {(
        [
          ["en", "EN"],
          ["ar", "عربي"],
        ] as const
      ).map(([locale, label]) => {
        const active = (locale === "ar") === arabic;
        return (
          <button
            key={locale}
            type="button"
            aria-pressed={active}
            onClick={() => choose(locale)}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              active ? "bg-accent text-white" : "text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function LoginPage() {
  const t = useT();
  const freshStart = useFreshStart();
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const action = useAction();

  const submit = () =>
    action.run(async () => {
      await session.login(email.trim(), password);
      await freshStart("/overview");
    });

  return (
    <>
      <header className="flex items-center justify-between px-6 pt-6 sm:px-8 sm:pt-8">
        <Brand large />
        <LanguageSwitch />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[30rem]">
          <div className="text-center">
            <h1 className="text-[28px] leading-9 font-semibold tracking-tight">
              {t("Al-Burhan ERP")}
            </h1>
            <p className="mt-1.5 text-base text-ink-soft">
              {t("Sign in to manage showrooms, projects, stock and accounts")}
            </p>
          </div>

          <form onSubmit={onSubmit(submit)} className="mt-9 flex flex-col gap-5">
            <ErrorBanner error={action.error} hideFields />

            <div className="flex flex-col gap-2">
              <label htmlFor={emailId} className="text-[15px] font-semibold">
                {t("Email")}
              </label>
              <input
                id={emailId}
                type="email"
                autoComplete="username"
                autoFocus
                required
                value={email}
                aria-invalid={Boolean(action.field("email"))}
                onChange={(event) => setEmail(event.target.value)}
                className={INPUT}
              />
              {action.field("email") ? (
                <p className="text-sm text-danger">{action.field("email")}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor={passwordId} className="text-[15px] font-semibold">
                {t("Password")}
              </label>
              <div className="relative">
                <input
                  id={passwordId}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  aria-invalid={Boolean(action.field("password"))}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`${INPUT} pe-12`}
                />
                <button
                  type="button"
                  aria-label={showPassword ? t("Hide password") : t("Show password")}
                  title={showPassword ? t("Hide password") : t("Show password")}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 end-0 flex w-12 items-center justify-center rounded-e-xl text-ink-soft transition-colors hover:text-ink"
                >
                  {showPassword ? (
                    <EyeOff aria-hidden className="size-5" />
                  ) : (
                    <Eye aria-hidden className="size-5" />
                  )}
                </button>
              </div>
              {action.field("password") ? (
                <p className="text-sm text-danger">{action.field("password")}</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={action.pending}
              className="mt-2 h-12 w-full rounded-full bg-accent text-base font-semibold text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action.pending ? t("Signing in…") : t("Sign in")}
            </button>
          </form>

          <p className="mt-8 border-t border-line pt-6 text-center text-sm text-ink-soft">
            {t("Forgot your password? Ask your system administrator to reset it.")}
          </p>
        </div>
      </main>

      <footer className="px-6 pb-6 text-center text-xs text-ink-faint">
        © {new Date().getFullYear()} Al-Burhan Regional
      </footer>
    </>
  );
}
