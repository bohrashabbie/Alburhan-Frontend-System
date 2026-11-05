"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useSWRConfig } from "swr";

import { PhotoUpload } from "@/components/photo-upload";
import { UserAvatar } from "@/components/user-avatar";
import { Badge, Button, Card, ErrorBanner, PageHeader, SaveBar, SelectField, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { fullName } from "@/lib/format";
import { onSubmit, useAction } from "@/lib/hooks";
import { saveLabels } from "@/lib/i18n";
import { useWorkspace } from "@/lib/workspace";

function Details() {
  const { me, companies, branches, name, setLocale, t } = useWorkspace();
  const { mutate } = useSWRConfig();
  const initial = {
    first_name: me.first_name,
    last_name: me.last_name,
    phone: me.phone,
    preferred_language: me.preferred_language,
    default_company: me.default_company ? String(me.default_company) : "",
    default_branch: me.default_branch ? String(me.default_branch) : "",
  };
  const [base, setBase] = useState(initial);
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const dirty = JSON.stringify(values) !== JSON.stringify(base);
  const set = (key: keyof typeof values) => (event: { target: { value: string } }) => {
    setValues({ ...values, [key]: event.target.value });
    setSaved(false);
  };
  const homeBranches = me.branches.filter((item) => String(item.company) === values.default_company);
  const save = () =>
    action.run(async () => {
      await api.patch("/me", { ...values, default_company: values.default_company ? Number(values.default_company) : null, default_branch: values.default_branch ? Number(values.default_branch) : null });
      const languageChanged = values.preferred_language !== base.preferred_language;
      setBase(values);
      setSaved(true);
      await mutate("/me");
      if (languageChanged) setLocale(values.preferred_language);
    });
  return (
    <form onSubmit={onSubmit(save)} className="flex flex-col gap-4">
      <ErrorBanner error={action.error} hideFields />
      <Card title={t("Personal details")}>
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <TextField label={t("First name")} value={values.first_name} onChange={set("first_name")} error={action.field("first_name")} />
          <TextField label={t("Last name")} value={values.last_name} onChange={set("last_name")} error={action.field("last_name")} />
          <TextField label={t("Email")} value={me.email} disabled hint={t("Your sign-in. Ask an administrator to change it.")} />
          <TextField label={t("Phone")} value={values.phone} onChange={set("phone")} error={action.field("phone")} />
        </div>
      </Card>
      <Card title={t("Preferences")}>
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <SelectField label={t("Language")} value={values.preferred_language} onChange={set("preferred_language")}>
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </SelectField>
          <span />
          <SelectField label={t("Home company")} value={values.default_company} onChange={(event) => { setValues({ ...values, default_company: event.target.value, default_branch: "" }); setSaved(false); }} error={action.field("default_company")} hint={t("Where the app opens after you sign in.")}>
            {companies.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
          </SelectField>
          <SelectField label={t("Home branch")} value={values.default_branch} onChange={set("default_branch")} error={action.field("default_branch")}>
            <option value="">{t("All branches")}</option>
            {(homeBranches.length ? homeBranches : branches).map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
          </SelectField>
        </div>
      </Card>
      <SaveBar dirty={dirty} saved={saved} pending={action.pending} onDiscard={() => setValues(base)} labels={saveLabels(t)} />
    </form>
  );
}

function Password() {
  const { t } = useWorkspace();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [done, setDone] = useState(false);
  const action = useAction();
  const mismatch = again.length > 0 && again !== next;
  const change = () =>
    action.run(async () => {
      await api.post("/me/password", { current_password: current, new_password: next });
      setCurrent("");
      setNext("");
      setAgain("");
      setDone(true);
    });
  return (
    <Card title={t("Password")}>
      <form onSubmit={onSubmit(change)} className="flex flex-col gap-4">
        <ErrorBanner error={action.error} hideFields />
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-3">
          <TextField label={t("Current password")} type="password" autoComplete="current-password" value={current} onChange={(e) => { setCurrent(e.target.value); setDone(false); }} error={action.field("current_password")} />
          <TextField label={t("New password")} type="password" autoComplete="new-password" value={next} onChange={(e) => { setNext(e.target.value); setDone(false); }} error={action.field("new_password")} hint={t("At least 8 characters; not only numbers.")} />
          <TextField label={t("Repeat new password")} type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} error={mismatch ? t("The two passwords differ.") : undefined} />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" variant="secondary" pending={action.pending} disabled={!current || !next || mismatch || next !== again}>
            <KeyRound aria-hidden className="size-4" />
            {t("Change password")}
          </Button>
          {done ? <span className="text-sm text-[#2e7d32]">{t("Password changed.")}</span> : null}
        </div>
      </form>
    </Card>
  );
}

function Access() {
  const { me, companies, branches, name, t } = useWorkspace();
  const companyName = (id: number) => name(companies.find((item) => item.id === id) ?? { name: "—" });
  const branchName = (id: number | null) => (id === null ? t("All branches") : name(branches.find((item) => item.id === id) ?? { name: "—" }));
  return (
    <Card title={t("My access")}>
      {me.is_superuser ? (
        <p className="flex items-center gap-2 text-sm"><ShieldCheck aria-hidden className="size-4 text-link" />{t("You are a system administrator: every permission in every company.")}</p>
      ) : me.access.length === 0 ? (
        <p className="text-sm text-ink-soft">{t("No roles yet. Ask an administrator.")}</p>
      ) : (
        <ul className="divide-y divide-line">
          {me.access.map((grant) => (
            <li key={`${grant.company}-${grant.branch}-${grant.role}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <span><span className="font-medium">{grant.role_name}</span><span className="text-ink-soft"> · {companyName(grant.company)} · {branchName(grant.branch)}</span></span>
              <Badge>{grant.permissions.length} {t("permissions")}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function ProfilePage() {
  const { me, company, t } = useWorkspace();
  const { mutate } = useSWRConfig();
  const display = fullName(me);
  return (
    <>
      <PageHeader title={t("My profile")} description={t("Your photo, details, password and what you can do.")} />
      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4 self-start lg:sticky lg:top-20">
          <section className="rounded-2xl border border-line bg-surface p-6 text-center">
            <div className="mx-auto w-fit"><UserAvatar url={me.avatar_url} name={display} size="size-28" text="text-3xl" /></div>
            <h2 className="mt-4 text-xl font-bold tracking-tight">{display}</h2>
            <p className="text-sm text-ink-soft">{me.email}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {me.is_superuser ? <Badge tone="success">{t("Administrator")}</Badge> : null}
              {[...new Set(me.access.filter((grant) => grant.company === company.id).map((grant) => grant.role_name))].map((role) => <Badge key={role}>{role}</Badge>)}
            </div>
            <div className="mt-5 border-t border-line pt-5">
              <PhotoUpload compact endpoint="/me/avatar" name={display} initialUrl={me.avatar_url} canEdit onChanged={() => mutate("/me")} title={t("Profile photo")} shape="rounded-full" />
              <p className="mt-3 text-xs text-ink-soft">{t("PNG, JPEG or WebP, up to 2 MB. Upload one or take a photo with the camera.")}</p>
            </div>
          </section>
        </aside>
        <div className="flex min-w-0 flex-col gap-4">
          <Details />
          <Password />
          <Access />
        </div>
      </div>
    </>
  );
}
