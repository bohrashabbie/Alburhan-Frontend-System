"use client";

import { useState } from "react";

import { Button, Drawer, EmptyState, ErrorBanner, Loading, PageHeader, SearchField, TextField } from "@/components/ui";
import { api, withQuery } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import { decimalsOf, formatAmount, fromMinor, toMinor } from "@/lib/money";
import type { Page, SalaryRow } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const PARTS = [
  ["basic_salary", "Basic salary"],
  ["housing_allowance", "Housing"],
  ["transport_allowance", "Transport"],
  ["other_allowance", "Other"],
] as const;
type Part = (typeof PARTS)[number][0];

const today = () => new Date().toISOString().slice(0, 10);

/** One employee: set a new salary from a date, and see every earlier one. */
function SalaryDrawer({ row, onDone }: { row: SalaryRow; onDone: () => void }) {
  const { company, can, locale, t } = useWorkspace();
  const decimals = decimalsOf(company.currency);
  const live = useResource<SalaryRow>(`/hr/salaries/${row.id}`);
  const current = live.data ?? row;
  const start = Object.fromEntries(PARTS.map(([key]) => [key, String(Number(current[key]))])) as Record<Part, string>;
  const [values, setValues] = useState(start);
  const [from, setFrom] = useState(today());
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const editable = can("hr.salary.update");
  const total = PARTS.reduce((sum, [key]) => sum + toMinor(values[key] || "0", decimals), 0n);
  const changed = PARTS.some(([key]) => Number(values[key] || 0) !== Number(current[key]));
  const money = (value: string) => formatMoney(value, company.currency, locale);
  const save = () =>
    action.run(async () => {
      await api.post(`/hr/salaries/${row.id}/set`, { ...values, effective_from: from, note });
      await live.mutate();
      setNote("");
      setSaved(true);
    });

  return (
    <Drawer open large onClose={onDone} title={current.full_name}>
      <div className="profile-section flex flex-col gap-6 pb-6">
        <p className="text-sm text-ink-soft">{[current.number, current.job_title, current.department_name].filter(Boolean).join(" · ")}</p>
        <div className="flex items-baseline justify-between rounded-xl bg-panel px-5 py-4 text-panel-ink">
          <span className="text-sm text-panel-ink-soft">{t("Monthly salary now")}</span>
          <span className="text-2xl font-bold tabular-nums">{money(current.monthly_pay)}</span>
        </div>

        {editable ? (
          <form onSubmit={onSubmit(save)} className="flex flex-col gap-4 rounded-xl border border-line p-4">
            <h3 className="text-base font-bold">{t("Set a new salary")}</h3>
            <ErrorBanner error={action.error} hideFields />
            <div className="grid gap-3 sm:grid-cols-2">
              {PARTS.map(([key, label]) => (
                <TextField
                  key={key}
                  label={`${t(label)} (${company.currency})`}
                  inputMode="decimal"
                  value={values[key]}
                  onChange={(e) => { setValues({ ...values, [key]: e.target.value }); setSaved(false); }}
                  onFocus={(e) => e.target.select()}
                  error={action.field(key)}
                />
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label={t("Starts from")} type="date" required value={from} onChange={(e) => setFrom(e.target.value)} error={action.field("effective_from")} />
              <TextField label={t("Reason")} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("e.g. yearly raise")} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                {t("New monthly salary")}: <span className="font-bold tabular-nums">{money(fromMinor(total, decimals))}</span>
              </p>
              <Button type="submit" pending={action.pending} disabled={!changed}>{saved && !changed ? t("Saved") : t("Save salary")}</Button>
            </div>
            <p className="text-xs text-ink-faint">{t("The next payroll uses the new amounts. Earlier payslips don't change.")}</p>
          </form>
        ) : null}

        <section className="flex flex-col gap-2">
          <h3 className="text-base font-bold">{t("Salary history")}</h3>
          {current.history.length === 0 ? (
            <p className="text-sm text-ink-soft">{t("No salary set yet.")}</p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {current.history.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{t("From")} {formatDate(item.effective_from, locale)}{item.note ? <span className="font-normal text-ink-soft"> · {item.note}</span> : null}</p>
                    <p className="mt-0.5 text-xs text-ink-soft tabular-nums">
                      {PARTS.map(([key, label]) => `${t(label)} ${formatAmount(item[key], decimals)}`).join(" · ")}
                    </p>
                    {item.created_by_name ? <p className="mt-0.5 text-xs text-ink-faint">{item.created_by_name}</p> : null}
                  </div>
                  <span className="font-semibold tabular-nums">{money(item.monthly_pay)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Drawer>
  );
}

export default function SalariesPage() {
  const { company, locale, t } = useWorkspace();
  const decimals = decimalsOf(company.currency);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<SalaryRow | null>(null);
  const list = useResource<Page<SalaryRow>>(withQuery("/hr/salaries", { company: company.id, is_active: "true", search: search.trim(), page_size: 500 }));
  const rows = list.data?.results ?? [];
  const sum = (key: Part | "monthly_pay") => fromMinor(rows.reduce((total, row) => total + toMinor(row[key], decimals), 0n), decimals);
  const allowances = fromMinor(toMinor(sum("monthly_pay"), decimals) - toMinor(sum("basic_salary"), decimals), decimals);
  const money = (value: string) => formatMoney(value, company.currency, locale);
  const amount = (value: string) => formatAmount(value, decimals);

  return (
    <>
      <PageHeader
        title={t("Salaries")}
        description={t("Everyone's monthly pay. Each month the payroll takes these amounts, deducts unpaid leave, and books the total as salary expense.")}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [t("Employees"), String(rows.length)],
          [t("Basic salaries"), money(sum("basic_salary"))],
          [t("Allowances"), money(allowances)],
          [t("Monthly salary cost"), money(sum("monthly_pay"))],
        ].map(([label, value], index) => (
          <div key={label} className={`rounded-xl border border-line p-4 ${index === 3 ? "bg-surface-muted/40" : "bg-surface"}`}>
            <p className="text-xs text-ink-soft">{label}</p>
            <p className={`mt-1 tabular-nums ${index === 3 ? "text-xl font-bold" : "text-lg font-semibold"}`}>{value}</p>
          </div>
        ))}
      </div>
      <div className="mb-4 max-w-sm"><SearchField label={t("Search")} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Name, number or job")} /></div>
      <ErrorBanner error={list.error} />
      {!list.data ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState title={t("No employees yet.")} description={t("Add employees under HR → Employees, then set their salary here.")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t("Employee")}</th>
                {PARTS.map(([key, label]) => <th key={key} className="px-3 py-3 text-end font-medium">{t(label)}</th>)}
                <th className="px-3 py-3 text-end font-medium">{t("Monthly")} · {company.currency}</th>
                <th className="px-4 py-3 text-start font-medium">{t("Since")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id} onClick={() => setOpen(row)} className="cursor-pointer hover:bg-surface-muted/50">
                  <td className="px-4 py-3"><span className="block font-medium">{row.full_name}</span><span className="block text-xs text-ink-soft">{row.job_title || row.number}</span></td>
                  {PARTS.map(([key]) => <td key={key} className="px-3 py-3 text-end tabular-nums">{Number(row[key]) ? amount(row[key]) : <span className="text-ink-faint">—</span>}</td>)}
                  <td className="px-3 py-3 text-end font-semibold tabular-nums">{Number(row.monthly_pay) ? amount(row.monthly_pay) : <span className="font-normal text-warning">{t("Not set")}</span>}</td>
                  <td className="px-4 py-3 tabular-nums text-ink-soft">{row.changed_on ? formatDate(row.changed_on, locale) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open ? <SalaryDrawer key={open.id} row={open} onDone={() => { setOpen(null); list.mutate(); }} /> : null}
    </>
  );
}
