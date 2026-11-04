"use client";

import Link from "next/link";
import { useState } from "react";

import { EmptyState, ErrorBanner, Loading, PageHeader, TextField } from "@/components/ui";
import { ACCOUNT_TYPES } from "@/lib/accounting";
import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { decimalsOf, formatAmount, toMinor } from "@/lib/money";
import type { TrialBalance, TrialBalanceRow } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const year = new Date().getFullYear();

/** Debit-positive balance shown as "1,250.000 Dr" / "300.000 Cr". */
function Side({ value, decimals }: { value: string; decimals: number }) {
  const minor = toMinor(value, decimals);
  if (minor === 0n) return <span className="text-ink-faint">—</span>;
  return (
    <>
      {formatAmount(minor < 0n ? -minor : minor, decimals)}
      <span className="ms-1 text-xs text-ink-soft">{minor < 0n ? "Cr" : "Dr"}</span>
    </>
  );
}

export default function TrialBalancePage() {
  const { company, name, t } = useWorkspace();
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(new Date().toLocaleDateString("en-CA"));
  const report = useResource<TrialBalance>(
    withQuery("/accounting/reports/trial-balance", { company: company.id, date_from: from, date_to: to }),
  );
  const decimals = decimalsOf(report.data?.currency ?? company.currency);
  const typeName = Object.fromEntries(ACCOUNT_TYPES);
  const groups = ACCOUNT_TYPES.map(([type]) => ({
    type,
    rows: (report.data?.rows ?? []).filter((row) => row.account_type === type),
  })).filter((group) => group.rows.length > 0);
  const totals = report.data?.totals;
  const balanced = totals ? toMinor(totals.closing, decimals) === 0n : true;

  const cell = "px-4 py-2.5 text-end tabular-nums";
  const ledgerHref = (row: TrialBalanceRow) =>
    withQuery("/accounts/ledger", { account: row.account, from, to });

  return (
    <>
      <PageHeader
        title={t("Trial balance")}
        description={`Every account's balance for ${name(company)}, in ${company.currency}. Click an account to see its entries.`}
      />
      <div className="mb-4 grid max-w-xl gap-3 sm:grid-cols-2">
        <TextField label={t("From")} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField label={t("To")} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <ErrorBanner error={report.error} />
      {!report.data ? (
        report.error ? null : <Loading label={t("Loading…")} />
      ) : report.data.rows.length === 0 ? (
        <EmptyState title={t("Nothing here yet")} description="No posted entries up to this date." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("Account")}</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Opening")}</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Debit")}</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Credit")}</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Closing")}</th>
              </tr>
            </thead>
            {groups.map((group) => (
              <tbody key={group.type} className="divide-y divide-line border-b border-line">
                <tr className="bg-surface-muted/30">
                  <th scope="rowgroup" colSpan={5} className="px-4 py-2 text-start text-xs font-semibold tracking-wide text-ink-soft uppercase">
                    {t(typeName[group.type])}
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.account} className="transition-colors hover:bg-surface-muted/50">
                    <td className="px-4 py-2.5">
                      <Link href={ledgerHref(row)} className="hover:underline">
                        <span className="me-3 font-mono text-xs text-ink-soft">{row.code}</span>
                        {name(row)}
                      </Link>
                    </td>
                    <td className={cell}><Side value={row.opening} decimals={decimals} /></td>
                    <td className={cell}>{toMinor(row.debit, decimals) ? formatAmount(row.debit, decimals) : <span className="text-ink-faint">—</span>}</td>
                    <td className={cell}>{toMinor(row.credit, decimals) ? formatAmount(row.credit, decimals) : <span className="text-ink-faint">—</span>}</td>
                    <td className={`${cell} font-medium`}><Side value={row.closing} decimals={decimals} /></td>
                  </tr>
                ))}
              </tbody>
            ))}
            <tfoot className="bg-surface-muted/40 font-semibold tabular-nums">
              <tr>
                <td className="px-4 py-3">
                  {t("Total")}
                  {balanced ? null : <span className="ms-2 text-danger">· not balanced</span>}
                </td>
                <td className={cell}><Side value={totals!.opening} decimals={decimals} /></td>
                <td className={cell}>{formatAmount(totals!.debit, decimals)}</td>
                <td className={cell}>{formatAmount(totals!.credit, decimals)}</td>
                <td className={cell}><Side value={totals!.closing} decimals={decimals} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}
