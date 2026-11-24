"use client";

import Link from "next/link";
import { useState } from "react";

import { BarList } from "@/components/charts";
import { EmptyState, ErrorBanner, Loading, PageHeader, TextField } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { decimalsOf, formatAmount } from "@/lib/money";
import type { BestSellers } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export default function BestSellersPage() {
  const { company, branch, t } = useWorkspace();
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState(new Date().toLocaleDateString("en-CA"));
  const report = useResource<BestSellers>(withQuery("/reports/best-sellers", { company: company.id, branch: branch?.id, date_from: from, date_to: to }));
  const decimals = decimalsOf(company.currency);
  const r = report.data;
  return (
    <>
      <PageHeader title={t("Best seller")} description={`${t("The products that sold the most in the period, by quantity.")} ${company.currency}.`} />
      <div className="mb-4 grid max-w-xl gap-3 sm:grid-cols-2">
        <TextField label={t("From")} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField label={t("To")} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <ErrorBanner error={report.error} />
      {!r ? (report.error ? null : <Loading label={t("Loading…")} />) : r.rows.length === 0 ? (
        <EmptyState title={t("No sales in this period")} description={t("Choose other dates.")} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-4 text-base font-bold">{t("Top 10 by quantity")}</h2>
            <BarList points={r.rows.slice(0, 10).map((row) => ({ label: row.name, value: Number(row.quantity) }))} format={(value) => String(value)} />
          </section>
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
                <tr><th className="px-4 py-2.5 text-start font-medium">#</th><th className="px-4 py-2.5 text-start font-medium">{t("Product")}</th><th className="px-4 py-2.5 text-start font-medium">{t("Brand")}</th><th className="px-4 py-2.5 text-end font-medium">{t("Quantity")}</th><th className="px-4 py-2.5 text-end font-medium">{t("Sales")}</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {r.rows.map((row, index) => (
                  <tr key={row.product} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-2.5 text-ink-soft tabular-nums">{index + 1}</td>
                    <td className="px-4 py-2.5"><Link href={`/inventory/items/${row.product}`} className="font-medium hover:underline">{row.name}</Link><span className="block font-mono text-xs text-ink-soft">{row.sku}</span></td>
                    <td className="px-4 py-2.5">{row.brand ?? "—"}</td>
                    <td className="px-4 py-2.5 text-end font-semibold tabular-nums">{row.quantity}</td>
                    <td className="px-4 py-2.5 text-end tabular-nums">{formatAmount(row.amount, decimals)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
