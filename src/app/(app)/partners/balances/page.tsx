"use client";

import Link from "next/link";
import { useState } from "react";

import { EmptyState, ErrorBanner, Loading, PageHeader, SearchField, TextField } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { decimalsOf, formatAmount } from "@/lib/money";
import type { CustomerBalances } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

/** "Customer balance sheet" in the previous system: one line per customer. */
export default function CustomerBalancesPage() {
  const { company, t } = useWorkspace();
  const [to, setTo] = useState(new Date().toLocaleDateString("en-CA"));
  const [search, setSearch] = useState("");
  const report = useResource<CustomerBalances>(withQuery("/reports/customer-balances", { company: company.id, date_to: to }));
  const decimals = decimalsOf(company.currency);
  const r = report.data;
  const needle = search.trim().toLowerCase();
  const rows = (r?.rows ?? []).filter((row) => !needle || `${row.name} ${row.code} ${row.phone}`.toLowerCase().includes(needle));
  const cell = "px-4 py-2.5 text-end tabular-nums";
  const amount = (value: string) => (Number(value) ? formatAmount(value, decimals) : <span className="text-ink-faint">—</span>);

  return (
    <>
      <PageHeader title={t("Customer balance sheet")} description={`${t("What each customer was charged, returned and paid, and what is left. A minus balance is money the customer has on deposit.")} ${company.currency}.`} />
      <div className="mb-4 grid max-w-2xl gap-3 sm:grid-cols-2">
        <SearchField label={t("Search")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <TextField label={t("As of")} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <ErrorBanner error={report.error} />
      {!r ? (report.error ? null : <Loading label={t("Loading…")} />) : r.rows.length === 0 ? (
        <EmptyState title={t("No customer activity yet")} description={t("Customers appear here once they have an invoice or a payment.")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
              <tr>
                <th className="px-4 py-2.5 text-start font-medium">{t("Customer")}</th>
                <th className="px-4 py-2.5 text-end font-medium">{t("Charged")}</th>
                <th className="px-4 py-2.5 text-end font-medium">{t("Returned")}</th>
                <th className="px-4 py-2.5 text-end font-medium">{t("Paid")}</th>
                <th className="px-4 py-2.5 text-end font-medium">{t("Balance")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.customer} className="hover:bg-surface-muted/50">
                  <td className="px-4 py-2.5">
                    <Link href={`/partners/statement?customer=${row.customer}`} className="font-medium hover:underline">{row.name}</Link>
                    <span className="ms-2 font-mono text-xs text-ink-soft">{row.code}</span>
                  </td>
                  <td className={cell}>{amount(row.invoiced)}</td>
                  <td className={cell}>{amount(row.returned)}</td>
                  <td className={cell}>{amount(row.paid)}</td>
                  <td className={`${cell} font-semibold ${Number(row.balance) > 0 ? "text-warning" : ""}`}>{formatAmount(row.balance, decimals)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-surface-muted/40 font-semibold">
              <tr><td className="px-4 py-3">{t("Total")}</td><td className={cell}>{formatAmount(r.totals.invoiced, decimals)}</td><td className={cell}>{formatAmount(r.totals.returned, decimals)}</td><td className={cell}>{formatAmount(r.totals.paid, decimals)}</td><td className={cell}>{formatAmount(r.totals.balance, decimals)}</td></tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}
