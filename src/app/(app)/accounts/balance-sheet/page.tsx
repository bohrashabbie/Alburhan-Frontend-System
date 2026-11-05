"use client";

import { useState } from "react";

import { StatementSection, TotalRow } from "@/components/statement";
import { Badge, ErrorBanner, Loading, PageHeader, TextField } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { decimalsOf, formatAmount } from "@/lib/money";
import type { BalanceSheet } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export default function BalanceSheetPage() {
  const { company, name, t } = useWorkspace();
  const [to, setTo] = useState(new Date().toLocaleDateString("en-CA"));
  const report = useResource<BalanceSheet>(withQuery("/reports/balance-sheet", { company: company.id, date_to: to }));
  const decimals = decimalsOf(company.currency);
  const r = report.data;
  return (
    <>
      <PageHeader title={t("Balance sheet")} description={`What ${name(company)} owns and owes on a date, in ${company.currency}.`} actions={r ? <Badge tone={r.totals.balanced ? "success" : "danger"}>{r.totals.balanced ? t("Balanced") : t("Not balanced")}</Badge> : null} />
      <div className="mb-4 max-w-xs"><TextField label={t("As of")} type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      <ErrorBanner error={report.error} />
      {!r ? (report.error ? null : <Loading label={t("Loading…")} />) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <StatementSection title={t("Assets")} groups={r.assets} total={r.totals.assets} decimals={decimals} to={to} strong />
            </table>
          </div>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <StatementSection title={t("Liabilities")} groups={r.liabilities} total={r.totals.liabilities} decimals={decimals} to={to} />
              <StatementSection title={t("Equity")} groups={r.equity} total={r.totals.equity} decimals={decimals} to={to} />
              <tbody className="border-b border-line"><tr><td className="ps-8 pe-4 py-1.5 text-sm text-ink-soft">{t("Current year earnings (not yet closed)")}</td><td className="px-4 py-1.5 text-end text-sm tabular-nums">{formatAmount(r.current_earnings, decimals)}</td></tr></tbody>
              <tbody><TotalRow label={t("Total liabilities and equity")} value={r.totals.liabilities_and_equity} decimals={decimals} tone="strong" /></tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
