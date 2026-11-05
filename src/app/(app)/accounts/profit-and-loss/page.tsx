"use client";

import { useState } from "react";

import { StatementSection, TotalRow } from "@/components/statement";
import { ErrorBanner, Loading, PageHeader, TextField } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { decimalsOf } from "@/lib/money";
import type { ProfitAndLoss } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const year = new Date().getFullYear();

export default function ProfitAndLossPage() {
  const { company, name, t } = useWorkspace();
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(new Date().toLocaleDateString("en-CA"));
  const report = useResource<ProfitAndLoss>(withQuery("/reports/profit-and-loss", { company: company.id, date_from: from, date_to: to }));
  const decimals = decimalsOf(company.currency);
  const r = report.data;
  return (
    <>
      <PageHeader title={t("Profit & loss")} description={`Income, cost of sales and expenses for ${name(company)}, in ${company.currency}. Click an account for its entries.`} />
      <div className="mb-4 grid max-w-xl gap-3 sm:grid-cols-2">
        <TextField label={t("From")} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField label={t("To")} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <ErrorBanner error={report.error} />
      {!r ? (report.error ? null : <Loading label={t("Loading…")} />) : (
        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[32rem] text-sm">
              <StatementSection title={t("Income")} groups={r.income} total={r.totals.income} decimals={decimals} from={from} to={to} />
              <StatementSection title={t("Cost of sales")} groups={r.cost_of_sales} total={r.totals.cost_of_sales} decimals={decimals} from={from} to={to} />
              <tbody className="border-b border-line"><TotalRow label={t("Gross profit")} value={r.totals.gross_profit} decimals={decimals} tone="strong" /></tbody>
              <StatementSection title={t("Operating expenses")} groups={r.expenses} total={r.totals.expenses} decimals={decimals} from={from} to={to} />
              <tbody><TotalRow label={t("Net profit")} value={r.totals.net_profit} decimals={decimals} tone="strong" /></tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 self-start">
            {[[t("Income"), r.totals.income], [t("Gross profit"), r.totals.gross_profit], [t("Gross margin"), r.totals.gross_margin_percent ? `${r.totals.gross_margin_percent}%` : "—"], [t("Net profit"), r.totals.net_profit]].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line bg-surface p-4"><p className="text-xs tracking-wide text-ink-soft uppercase">{label}</p><p className={`mt-1 text-xl font-semibold tabular-nums ${String(value).startsWith("-") ? "text-danger" : ""}`}>{String(value).endsWith("%") || value === "—" ? value : `${Number(value).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${company.currency}`}</p></div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
