"use client";

import { BarList } from "@/components/charts";
import { EmptyState, ErrorBanner, Loading, PageHeader } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { decimalsOf, formatAmount } from "@/lib/money";
import type { WarehouseStock } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export default function WarehouseStockPage() {
  const { company, t } = useWorkspace();
  const report = useResource<WarehouseStock>(withQuery("/reports/warehouse-stock", { company: company.id }));
  const decimals = decimalsOf(company.currency);
  const r = report.data;
  return (
    <>
      <PageHeader title={t("Warehouse stock chart")} description={`${t("How much each warehouse holds now: pieces, different products and value at average cost.")} ${company.currency}.`} />
      <ErrorBanner error={report.error} />
      {!r ? (report.error ? null : <Loading label={t("Loading…")} />) : r.rows.length === 0 ? (
        <EmptyState title={t("No stock yet")} description={t("Stock appears here after the first receipt or opening balance.")} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-baseline justify-between gap-3"><h2 className="text-base font-bold">{t("Stock value")}</h2><span className="text-sm text-ink-soft">{t("Total")}: <span className="font-semibold text-ink tabular-nums">{formatAmount(r.total_value, decimals)}</span></span></div>
            <BarList points={r.rows.map((row) => ({ label: row.name, value: Number(row.value) }))} format={(value) => formatAmount(String(value), decimals)} />
          </section>
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[28rem] text-sm">
              <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
                <tr><th className="px-4 py-2.5 text-start font-medium">{t("Warehouse")}</th><th className="px-4 py-2.5 text-end font-medium">{t("Products")}</th><th className="px-4 py-2.5 text-end font-medium">{t("Quantity")}</th><th className="px-4 py-2.5 text-end font-medium">{t("Stock value")}</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {r.rows.map((row) => (
                  <tr key={row.warehouse}><td className="px-4 py-2.5 font-medium">{row.name}</td><td className="px-4 py-2.5 text-end tabular-nums">{row.products}</td><td className="px-4 py-2.5 text-end tabular-nums">{row.quantity}</td><td className="px-4 py-2.5 text-end font-semibold tabular-nums">{formatAmount(row.value, decimals)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
