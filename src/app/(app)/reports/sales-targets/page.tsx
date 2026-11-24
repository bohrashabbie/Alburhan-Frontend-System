"use client";

import { useState } from "react";

import { EmptyState, ErrorBanner, Loading, PageHeader, TextField } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { decimalsOf, formatAmount } from "@/lib/money";
import type { SalesTargets } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

/** "Daily sale objective" in the previous system: what each salesperson sold against their target. */
export default function SalesTargetsPage() {
  const { company, t } = useWorkspace();
  const [period, setPeriod] = useState(new Date().toLocaleDateString("en-CA").slice(0, 7));
  const [year, month] = period.split("-").map(Number);
  const report = useResource<SalesTargets>(year && month ? withQuery("/reports/sales-targets", { company: company.id, year, month }) : null);
  const decimals = decimalsOf(company.currency);
  const r = report.data;
  return (
    <>
      <PageHeader title={t("Sales target report")} description={`${t("What each salesperson invoiced in the month against their monthly target. Set a person's target under User → User list.")} ${company.currency}.`} />
      <div className="mb-4 max-w-xs"><TextField label={t("Month")} type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></div>
      <ErrorBanner error={report.error} />
      {!r ? (report.error ? null : <Loading label={t("Loading…")} />) : r.rows.length === 0 ? (
        <EmptyState title={t("No salespeople to show")} description={Number(r.unassigned) ? `${t("Sales with no salesperson")}: ${formatAmount(r.unassigned, decimals)}` : t("Give people a monthly target, or put a salesperson on invoices.")} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
                <tr><th className="px-4 py-2.5 text-start font-medium">{t("Salesperson")}</th><th className="px-4 py-2.5 text-end font-medium">{t("Invoices")}</th><th className="px-4 py-2.5 text-end font-medium">{t("Sold")}</th><th className="px-4 py-2.5 text-end font-medium">{t("Target")}</th><th className="w-[30%] px-4 py-2.5 text-start font-medium">{t("Reached")}</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {r.rows.map((row) => {
                  const percent = row.percent === null ? null : Number(row.percent);
                  return (
                    <tr key={row.user}>
                      <td className="px-4 py-3 font-medium">{row.name}</td>
                      <td className="px-4 py-3 text-end tabular-nums">{row.invoices}</td>
                      <td className="px-4 py-3 text-end font-semibold tabular-nums">{formatAmount(row.sold, decimals)}</td>
                      <td className="px-4 py-3 text-end tabular-nums">{Number(row.target) ? formatAmount(row.target, decimals) : <span className="text-ink-faint">—</span>}</td>
                      <td className="px-4 py-3">
                        {percent === null ? <span className="text-xs text-ink-faint">{t("No target set")}</span> : (
                          <span className="flex items-center gap-3">
                            <span className="h-2 flex-1 rounded-full bg-surface-muted"><span className="block h-2 rounded-full" style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: percent >= 100 ? "#2e7d32" : "#6950f3" }} /></span>
                            <span className="w-14 text-end text-xs font-medium tabular-nums">{percent}%</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {Number(r.unassigned) ? <p className="mt-3 text-sm text-ink-soft">{t("Sales with no salesperson")}: <span className="font-medium text-ink tabular-nums">{formatAmount(r.unassigned, decimals)}</span></p> : null}
        </>
      )}
    </>
  );
}
