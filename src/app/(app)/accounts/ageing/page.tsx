"use client";

import { useState } from "react";

import { EmptyState, ErrorBanner, Loading, PageHeader, SelectField, TextField } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { decimalsOf, formatAmount } from "@/lib/money";
import type { Ageing } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const BUCKETS: [keyof Ageing["totals"], string][] = [["current", "Not due"], ["1_30", "1–30 days"], ["31_60", "31–60"], ["61_90", "61–90"], ["over_90", "Over 90"]];

export default function AgeingPage() {
  const { company, t } = useWorkspace();
  const [kind, setKind] = useState<"receivable" | "payable">("receivable");
  const [to, setTo] = useState(new Date().toLocaleDateString("en-CA"));
  const report = useResource<Ageing>(withQuery("/reports/ageing", { company: company.id, kind, date_to: to }));
  const decimals = decimalsOf(company.currency);
  const r = report.data;
  const cell = "px-3 py-2.5 text-end tabular-nums";
  const amount = (value: string) => (Number(value) ? formatAmount(value, decimals) : <span className="text-ink-faint">—</span>);
  return (
    <>
      <PageHeader title={t("Receivables & payables ageing")} description={`Who owes you, and whom you owe, by how long it has been overdue. In ${company.currency}.`} />
      <div className="mb-4 grid max-w-xl gap-3 sm:grid-cols-2">
        <SelectField label={t("Show")} value={kind} onChange={(e) => setKind(e.target.value as "receivable" | "payable")}><option value="receivable">{t("Customers owe us (receivables)")}</option><option value="payable">{t("We owe suppliers (payables)")}</option></SelectField>
        <TextField label={t("As of")} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <ErrorBanner error={report.error} />
      {!r ? (report.error ? null : <Loading label={t("Loading…")} />) : r.rows.length === 0 ? <EmptyState title={t("Nothing outstanding")} description="No open documents on this date." /> : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[...BUCKETS, ["total", "Total"] as [keyof Ageing["totals"], string]].map(([key, label], index) => (
              <div key={key} className={`rounded-xl border border-line bg-surface p-3 ${index === 5 ? "bg-surface-muted/40" : ""}`}><p className="text-xs text-ink-soft">{t(label)}</p><p className={`mt-0.5 font-semibold tabular-nums ${index >= 3 && index < 5 && Number(r.totals[key]) > 0 ? "text-danger" : ""}`}>{formatAmount(r.totals[key], decimals)}</p></div>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[48rem] text-sm">
              <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
                <tr><th className="px-4 py-2.5 text-start font-medium">{kind === "receivable" ? t("Customer") : t("Supplier")}</th><th className="px-3 py-2.5 text-end font-medium">{t("Docs")}</th>{BUCKETS.map(([key, label]) => <th key={key} className="px-3 py-2.5 text-end font-medium">{t(label)}</th>)}<th className="px-4 py-2.5 text-end font-medium">{t("Total")}</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {r.rows.map((row) => (
                  <tr key={row.partner} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-2.5"><span className="font-medium">{row.name}</span> <span className="ms-2 font-mono text-xs text-ink-soft">{row.code}</span></td>
                    <td className={cell}>{row.count}</td>
                    {BUCKETS.map(([key]) => <td key={key} className={`${cell} ${(key === "61_90" || key === "over_90") && Number(row[key]) > 0 ? "text-danger" : ""}`}>{amount(row[key])}</td>)}
                    <td className={`${cell} px-4 font-semibold`}>{formatAmount(row.total, decimals)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-muted/40 font-semibold tabular-nums"><tr><td className="px-4 py-3">{t("Total")}</td><td className={cell}>{r.rows.reduce((n, row) => n + row.count, 0)}</td>{BUCKETS.map(([key]) => <td key={key} className={cell}>{formatAmount(r.totals[key], decimals)}</td>)}<td className={`${cell} px-4`}>{formatAmount(r.totals.total, decimals)}</td></tr></tfoot>
            </table>
          </div>
        </>
      )}
    </>
  );
}
