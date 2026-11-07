"use client";

import { Banknote, BookCheck, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";

import { DocumentList, Facts } from "@/components/document-list";
import { Badge, Button, Drawer, ErrorBanner, Modal, SelectField, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { decimalsOf, formatAmount } from "@/lib/money";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import { days } from "@/lib/hr";
import { PrintButton } from "@/lib/pos";
import type { Journal, Page, PayrollRun, Payslip } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const STATUSES: [string, string][] = [
  ["draft", "Draft"],
  ["posted", "Posted"],
  ["paid", "Paid"],
];
const TONES = { draft: "neutral", posted: "warning", paid: "success" } as const;

function monthName(year: number, month: number, locale: "en" | "ar") {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-KW" : "en-GB", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function StatusBadge({ status }: { status: PayrollRun["status"] }) {
  const { t } = useWorkspace();
  return <Badge tone={TONES[status]}>{t(STATUSES.find(([value]) => value === status)?.[1] ?? status)}</Badge>;
}

/** One payslip row; additions and deductions are typed in place while the run is a draft. */
function SlipRow({ slip, draft, amount, onSave }: { slip: Payslip; draft: boolean; amount: (v: string) => string; onSave: (slip: Payslip, patch: Partial<Payslip>) => Promise<void> }) {
  const [additions, setAdditions] = useState(String(Number(slip.additions)));
  const [deductions, setDeductions] = useState(String(Number(slip.deductions)));
  const save = () => {
    if (Number(additions) === Number(slip.additions) && Number(deductions) === Number(slip.deductions)) return;
    void onSave(slip, { additions: additions || "0", deductions: deductions || "0" });
  };
  const { t } = useWorkspace();
  const input = "h-9 w-20 rounded-lg border border-line-strong bg-surface px-2 text-end text-sm tabular-nums";
  return (
    <tr className="align-middle">
      <td className="px-3 py-2.5"><span className="block truncate font-medium">{slip.employee_name}</span><span className="block truncate text-xs text-ink-soft">{slip.job_title || slip.employee_number}</span></td>
      <td className="px-2 py-2.5 text-end tabular-nums">{amount(slip.gross)}</td>
      <td className="px-2 py-2.5 text-end tabular-nums">
        {Number(slip.unpaid_leave_deduction) > 0 ? <span className="block text-warning">−{amount(slip.unpaid_leave_deduction)}</span> : <span className="block text-ink-faint">—</span>}
        <span className="block text-xs text-ink-faint">{Number(slip.unpaid_leave_days) > 0 ? `${days(slip.unpaid_leave_days)} ${t("unpaid")}` : ""}{Number(slip.paid_leave_days) > 0 ? `${Number(slip.unpaid_leave_days) > 0 ? " · " : ""}${days(slip.paid_leave_days)} ${t("paid")}` : ""}</span>
      </td>
      <td className="px-1.5 py-2 text-end">{draft ? <input aria-label={`Additions ${slip.employee_name}`} inputMode="decimal" className={input} value={additions} onChange={(e) => setAdditions(e.target.value)} onBlur={save} /> : <span className="tabular-nums">{amount(slip.additions)}</span>}</td>
      <td className="px-1.5 py-2 text-end">{draft ? <input aria-label={`Deductions ${slip.employee_name}`} inputMode="decimal" className={input} value={deductions} onChange={(e) => setDeductions(e.target.value)} onBlur={save} /> : <span className="tabular-nums">{amount(slip.deductions)}</span>}</td>
      <td className="px-3 py-2.5 text-end font-semibold tabular-nums">{amount(slip.net)}</td>
    </tr>
  );
}

function Viewer({ id, onDone }: { id: number; onDone: () => void }) {
  const { company, can, locale, t } = useWorkspace();
  const live = useResource<PayrollRun>(`/hr/payroll/${id}`);
  const journals = useResource<Page<Journal>>(`/accounting/journals?company=${company.id}&page_size=100`);
  const action = useAction();
  const [paying, setPaying] = useState(false);
  const [journal, setJournal] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const run = live.data;
  const money = (value: string) => formatMoney(value, company.currency, locale);
  if (!run) return <Drawer open large wide onClose={onDone} title="…"><ErrorBanner error={live.error} /></Drawer>;
  const draft = run.status === "draft";
  const banks = (journals.data?.results ?? []).filter((item) => item.journal_type === "bank" || item.journal_type === "cash");
  const go = (path: string, body?: unknown) => action.run(async () => { await api.post(`/hr/payroll/${run.id}/${path}`, body); await live.mutate(); });

  return (
    <Drawer open large wide onClose={onDone} title={`${run.number} · ${monthName(run.year, run.month, locale)}`} action={<StatusBadge status={run.status} />}>
      <div className="profile-section flex flex-col gap-6 pb-6">
        <ErrorBanner error={action.error} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[[t("Gross pay"), money(run.total_gross)], [t("Deductions"), money(run.total_deductions)], [t("Additions"), money(run.total_additions)], [t("Net to pay"), money(run.total_net)]].map(([label, value], index) => (
            <div key={label} className={`rounded-xl border border-line p-3 ${index === 3 ? "bg-surface-muted/40" : ""}`}><p className="text-xs text-ink-soft">{label}</p><p className={`mt-0.5 tabular-nums ${index === 3 ? "text-lg font-bold" : "font-semibold"}`}>{value}</p></div>
          ))}
        </div>
        <Facts
          items={[
            [t("Employees"), String(run.employee_count)],
            [t("Journal entry"), run.journal_entry_number ?? "—"],
            [t("Payment"), run.payment_entry_number ?? "—"],
            [t("Paid on"), run.paid_at ? formatDate(run.paid_at, locale) : "—"],
          ]}
        />
        <div className="print-area overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[620px] table-fixed text-sm">
            <colgroup><col /><col className="w-[16%]" /><col className="w-[17%]" /><col className="w-[13%]" /><col className="w-[13%]" /><col className="w-[16%]" /></colgroup>
            <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
              <tr>
                <th className="px-3 py-2.5 text-start font-medium">{t("Employee")}</th>
                <th className="px-2 py-2.5 text-end font-medium">{t("Gross")}</th>
                <th className="px-2 py-2.5 text-end font-medium">{t("Leave deduction")}</th>
                <th className="px-1.5 py-2.5 text-end font-medium">{t("Additions")}</th>
                <th className="px-1.5 py-2.5 text-end font-medium">{t("Deductions")}</th>
                <th className="px-3 py-2.5 text-end font-medium">{t("Net")} · {company.currency}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {run.payslips.map((slip) => (
                <SlipRow
                  key={`${slip.id}-${slip.net}`}
                  slip={slip}
                  draft={draft && can("hr.payroll.update")}
                  amount={(value) => formatAmount(value, decimalsOf(company.currency))}
                  onSave={async (item, patch) => { await action.run(async () => { await api.post(`/hr/payroll/${run.id}/payslips/${item.id}`, { additions: patch.additions, deductions: patch.deductions, notes: item.notes }); await live.mutate(); }); }}
                />
              ))}
            </tbody>
          </table>
        </div>
        {draft ? <p className="text-xs text-ink-faint">{t("Unpaid days come from approved unpaid leave. A day's pay = monthly pay ÷ the pay days in HR settings. Type overtime or bonuses in Additions, advances being repaid in Deductions.")}</p> : null}
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-5">
          {draft && can("hr.payroll.delete") ? <Button variant="ghost" pending={action.pending} onClick={() => action.run(async () => { if (!window.confirm(t("Delete this draft payroll?"))) return; await api.delete(`/hr/payroll/${run.id}`); onDone(); })}><Trash2 aria-hidden className="size-4" />{t("Delete")}</Button> : null}
          <span className="flex-1" />
          <PrintButton />
          {draft && can("hr.payroll.update") ? <Button variant="secondary" pending={action.pending} onClick={() => go("recalculate")}><RefreshCw aria-hidden className="size-4" />{t("Recalculate")}</Button> : null}
          {draft && can("hr.payroll.post") ? <Button pending={action.pending} onClick={() => { if (window.confirm(t("Post this payroll to the books? Payslips can't change afterwards."))) go("post"); }}><BookCheck aria-hidden className="size-4" />{t("Post")}</Button> : null}
          {run.status === "posted" && can("hr.payroll.pay") ? <Button onClick={() => setPaying(true)}><Banknote aria-hidden className="size-4" />{t("Pay salaries")}</Button> : null}
        </div>
      </div>
      {paying ? (
        <Modal open onClose={() => setPaying(false)} title={t("Pay salaries")}>
          <form onSubmit={onSubmit(() => action.run(async () => { await api.post(`/hr/payroll/${run.id}/pay`, { journal: Number(journal), date }); setPaying(false); await live.mutate(); }))} className="flex flex-col gap-4">
            <ErrorBanner error={action.error} />
            <p className="text-sm text-ink-soft">{t("Records the bank transfer of")} <span className="font-semibold text-ink">{money(run.total_net)}</span> {t("to staff and clears what is owed to them.")}</p>
            <SelectField label={t("Paid from")} value={journal} onChange={(e) => setJournal(e.target.value)} required>
              <option value="">—</option>
              {banks.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
            </SelectField>
            <TextField label={t("Date")} type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={action.field("date")} />
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setPaying(false)}>{t("Cancel")}</Button><Button type="submit" pending={action.pending} disabled={!journal}>{t("Record payment")}</Button></div>
          </form>
        </Modal>
      ) : null}
    </Drawer>
  );
}

function NewRun({ onDone }: { onDone: () => void }) {
  const { company, locale, t } = useWorkspace();
  const today = new Date();
  const [month, setMonth] = useState(String(today.getMonth() + 1));
  const [year, setYear] = useState(String(today.getFullYear()));
  const [created, setCreated] = useState<number | null>(null);
  const action = useAction();
  if (created) return <Viewer id={created} onDone={onDone} />;
  return (
    <Modal open onClose={onDone} title={t("New payroll")}>
      <form onSubmit={onSubmit(() => action.run(async () => { const run = await api.post<PayrollRun>("/hr/payroll", { company: company.id, year: Number(year), month: Number(month) }); setCreated(run.id); }))} className="flex flex-col gap-4">
        <ErrorBanner error={action.error} hideFields />
        <p className="text-sm text-ink-soft">{t("Builds a payslip for everyone employed in the month, with approved unpaid leave deducted. You can review and adjust before posting.")}</p>
        <div className="grid grid-cols-2 gap-3">
          <SelectField label={t("Month")} value={month} onChange={(e) => setMonth(e.target.value)} error={action.field("month")}>
            {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Intl.DateTimeFormat(locale === "ar" ? "ar-KW" : "en-GB", { month: "long" }).format(new Date(2026, index, 1))}</option>)}
          </SelectField>
          <TextField label={t("Year")} inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onDone}>{t("Cancel")}</Button><Button type="submit" pending={action.pending}>{t("Build payslips")}</Button></div>
      </form>
    </Modal>
  );
}

export default function PayrollPage() {
  const { company, locale } = useWorkspace();
  const money = (value: string) => formatMoney(value, company.currency, locale);
  return (
    <DocumentList<PayrollRun>
      title="Payroll"
      description="One payroll a month: payslips from salaries and approved leave, posted to the books, then paid."
      endpoint="/hr/payroll"
      createPermission="hr.payroll.create"
      newLabel="New payroll"
      statuses={STATUSES}
      columns={[
        { label: "Number", render: (row) => <span className="font-mono text-xs">{row.number}</span> },
        { label: "Month", render: (row) => <span className="font-medium">{monthName(row.year, row.month, locale)}</span> },
        { label: "Employees", render: (row) => <span className="tabular-nums">{row.employee_count}</span>, align: "end" },
        { label: "Gross pay", render: (row) => <span className="tabular-nums">{money(row.total_gross)}</span>, align: "end" },
        { label: "Net to pay", render: (row) => <span className="font-semibold tabular-nums">{money(row.total_net)}</span>, align: "end" },
        { label: "Status", render: (row) => <StatusBadge status={row.status} /> },
      ]}
      renderOpen={(open, close) => (open === "new" ? <NewRun onDone={close} /> : <Viewer key={open.id} id={open.id} onDone={close} />)}
    />
  );
}
