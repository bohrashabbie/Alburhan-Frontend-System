"use client";

import { useState } from "react";

import { EmptyState, ErrorBanner, Loading, PageHeader, SelectField, Table } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import { qty } from "@/lib/inventory";
import { decimalsOf, formatAmount, toMinor } from "@/lib/money";
import type { SlowMovingRow } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export default function SlowMovingPage() {
  const { company, locale, name, t } = useWorkspace();
  const [days, setDays] = useState("90");
  const report = useResource<{ currency: string; rows: SlowMovingRow[] }>(withQuery("/inventory/reports/slow-moving", { company: company.id, days }));
  const decimals = decimalsOf(company.currency);
  const rows = report.data?.rows ?? [];
  const total = rows.reduce((sum, row) => sum + toMinor(row.value, decimals), 0n);

  return (
    <>
      <PageHeader title={t("Slow-moving stock")} description={`Products ${name(company)} holds that haven't gone out for a while, with the money tied up in them.`} />
      <div className="mb-4 max-w-xs">
        <SelectField label={t("No movement for")} value={days} onChange={(e) => setDays(e.target.value)}>
          {[["30", "30 days"], ["60", "60 days"], ["90", "90 days"], ["180", "6 months"], ["365", "1 year"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </SelectField>
      </div>
      <ErrorBanner error={report.error} />
      {!report.data ? (
        report.error ? null : <Loading label={t("Loading…")} />
      ) : rows.length === 0 ? (
        <EmptyState title={t("Nothing here yet")} description="Everything in stock has moved within this period." />
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-soft">
            {rows.length} products · <span className="font-semibold text-ink tabular-nums">{formatAmount(total, decimals)} {company.currency}</span> tied up
          </p>
          <Table head={[t("Product"), t("Quantity"), t("Value"), t("Last out"), t("Days idle")]}>
            {rows.map((row) => (
              <tr key={row.product}>
                <td className="px-4 py-3"><span className="block font-medium">{row.product_name}</span><span className="block font-mono text-xs text-ink-soft">{row.sku}</span></td>
                <td className="px-4 py-3 text-end tabular-nums">{qty(row.quantity)}</td>
                <td className="px-4 py-3 text-end tabular-nums">{formatAmount(row.value, decimals)}</td>
                <td className="px-4 py-3 tabular-nums">{row.last_out ? formatDate(row.last_out, locale) : <span className="text-ink-soft">Never</span>}</td>
                <td className={`px-4 py-3 text-end font-semibold tabular-nums ${row.days_idle >= 180 ? "text-danger" : row.days_idle >= 90 ? "text-warning" : ""}`}>{row.days_idle}</td>
              </tr>
            ))}
          </Table>
        </>
      )}
    </>
  );
}
