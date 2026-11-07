"use client";

import { useState } from "react";

import { Card, ErrorBanner, Loading, PageHeader, SaveBar, SelectField, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import { saveLabels } from "@/lib/i18n";
import type { Account, HRSettings, Page } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Form({ settings }: { settings: HRSettings }) {
  const { company, can, name, t } = useWorkspace();
  const editable = can("hr.settings.update");
  const accounts = useResource<Page<Account>>(`/accounting/accounts?company=${company.id}&is_group=false&page_size=500`);
  const initial = {
    hr_email: settings.hr_email,
    weekend_days: settings.weekend_days,
    pay_days_per_month: String(settings.pay_days_per_month),
    salary_expense_account: settings.salary_expense_account ? String(settings.salary_expense_account) : "",
    salary_payable_account: settings.salary_payable_account ? String(settings.salary_payable_account) : "",
    deductions_account: settings.deductions_account ? String(settings.deductions_account) : "",
  };
  const [base, setBase] = useState(initial);
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const dirty = JSON.stringify(values) !== JSON.stringify(base);
  const set = (key: keyof typeof values) => (event: { target: { value: string } }) => { setValues({ ...values, [key]: event.target.value }); setSaved(false); };
  const weekend = values.weekend_days.split(",").filter(Boolean).map(Number);
  const toggleDay = (day: number) => {
    const next = weekend.includes(day) ? weekend.filter((d) => d !== day) : [...weekend, day].sort();
    setValues({ ...values, weekend_days: next.join(",") });
    setSaved(false);
  };
  const save = () =>
    action.run(async () => {
      await api.patch(`/hr/settings/${company.id}`, {
        ...values,
        salary_expense_account: values.salary_expense_account ? Number(values.salary_expense_account) : null,
        salary_payable_account: values.salary_payable_account ? Number(values.salary_payable_account) : null,
        deductions_account: values.deductions_account ? Number(values.deductions_account) : null,
      });
      setBase(values);
      setSaved(true);
    });
  const options = (accounts.data?.results ?? []).map((item) => <option key={item.id} value={item.id}>{item.code} · {name(item)}</option>);

  return (
    <form onSubmit={onSubmit(save)} className="flex max-w-3xl flex-col gap-4">
      <ErrorBanner error={action.error} hideFields />
      <Card title={t("Leave")}>
        <div className="flex flex-col gap-5">
          <TextField label={t("HR email")} type="email" disabled={!editable} value={values.hr_email} onChange={set("hr_email")} error={action.field("hr_email")} hint={t("Gets a copy of every leave request and decision, and decides when someone has no manager.")} />
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{t("Weekend")}</span>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((label, day) => (
                <button key={label} type="button" disabled={!editable} aria-pressed={weekend.includes(day)} onClick={() => toggleDay(day)} className={`h-9 rounded-full border px-3.5 text-sm font-medium transition-colors ${weekend.includes(day) ? "border-accent bg-accent text-white" : "border-line-strong bg-surface hover:bg-surface-muted"}`}>
                  {t(label)}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-soft">{t("Weekend days are not counted as leave.")}</p>
          </div>
        </div>
      </Card>
      <Card title={t("Payroll")}>
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <TextField label={t("Pay days per month")} inputMode="numeric" disabled={!editable} value={values.pay_days_per_month} onChange={set("pay_days_per_month")} error={action.field("pay_days_per_month")} hint={t("A day's pay = monthly pay ÷ this. Kuwait labour law: 26.")} />
          <span />
          <SelectField label={t("Salaries expense")} disabled={!editable} value={values.salary_expense_account} onChange={set("salary_expense_account")}><option value="">—</option>{options}</SelectField>
          <SelectField label={t("Salaries payable")} disabled={!editable} value={values.salary_payable_account} onChange={set("salary_payable_account")}><option value="">—</option>{options}</SelectField>
          <SelectField label={t("Other deductions")} disabled={!editable} value={values.deductions_account} onChange={set("deductions_account")} hint={t("e.g. staff advances being repaid. Only needed if you use Deductions on payslips.")}><option value="">—</option>{options}</SelectField>
        </div>
      </Card>
      {editable ? <SaveBar dirty={dirty} saved={saved} pending={action.pending} onDiscard={() => setValues(base)} labels={saveLabels(t)} /> : null}
    </form>
  );
}

export default function HRSettingsPage() {
  const { company, name, t } = useWorkspace();
  const settings = useResource<HRSettings>(`/hr/settings/${company.id}`);
  return (
    <>
      <PageHeader title={t("HR settings")} description={`${t("Leave and payroll rules for")} ${name(company)}.`} />
      <ErrorBanner error={settings.error} />
      {settings.data ? <Form settings={settings.data} /> : settings.error ? null : <Loading />}
    </>
  );
}
