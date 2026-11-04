"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { EmptyState, ErrorBanner, Loading, PageHeader, SelectField, TextField } from "@/components/ui";
import { useAccounts } from "@/lib/accounting";
import { withQuery } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import { decimalsOf, formatAmount, toMinor } from "@/lib/money";
import type { Ledger } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const year = new Date().getFullYear();

function Balance({ value, decimals }: { value: string; decimals: number }) {
  const minor = toMinor(value, decimals);
  return (
    <>
      {formatAmount(minor < 0n ? -minor : minor, decimals)}
      <span className="ms-1 text-xs text-ink-soft">{minor < 0n ? "Cr" : minor > 0n ? "Dr" : ""}</span>
    </>
  );
}

function LedgerReport() {
  const params = useSearchParams();
  const { company, locale, name, t } = useWorkspace();
  const accounts = useAccounts().filter((account) => !account.is_group);
  const [account, setAccount] = useState(params.get("account") ?? "");
  const [from, setFrom] = useState(params.get("from") ?? `${year}-01-01`);
  const [to, setTo] = useState(params.get("to") ?? new Date().toLocaleDateString("en-CA"));
  const report = useResource<Ledger>(
    account ? withQuery("/accounting/reports/general-ledger", { account, date_from: from, date_to: to }) : null,
  );
  const decimals = decimalsOf(report.data?.currency ?? company.currency);
  const cell = "px-4 py-2.5 text-end tabular-nums";

  return (
    <>
      <PageHeader
        title={t("General ledger")}
        description={`Every posted line of one account, with its running balance, in ${company.currency}.`}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_1fr_1fr]">
        <SelectField label={t("Account")} value={account} onChange={(e) => setAccount(e.target.value)}>
          <option value="">—</option>
          {accounts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} · {name(item)}
            </option>
          ))}
        </SelectField>
        <TextField label={t("From")} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField label={t("To")} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <ErrorBanner error={report.error} />
      {!account ? (
        <EmptyState title={t("Choose an account")} description="Pick an account to see its entries." />
      ) : !report.data ? (
        report.error ? null : <Loading label={t("Loading…")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("Date")}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("Number")}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("Description")}</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Debit")}</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Credit")}</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Balance")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <tr className="bg-surface-muted/30 text-ink-soft">
                <td className="px-4 py-2.5" colSpan={5}>{t("Opening")}</td>
                <td className={cell}><Balance value={report.data.opening} decimals={decimals} /></td>
              </tr>
              {report.data.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink-soft">No entries in these dates.</td>
                </tr>
              ) : (
                report.data.rows.map((row, index) => (
                  <tr key={`${row.entry}-${index}`} className="transition-colors hover:bg-surface-muted/50">
                    <td className="px-4 py-2.5 tabular-nums">{formatDate(row.date, locale)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{row.number}</td>
                    <td className="px-4 py-2.5">
                      {row.description || "—"}
                      {row.partner ? <span className="block text-xs text-ink-soft">{row.partner}</span> : null}
                    </td>
                    <td className={cell}>{toMinor(row.debit, decimals) ? formatAmount(row.debit, decimals) : ""}</td>
                    <td className={cell}>{toMinor(row.credit, decimals) ? formatAmount(row.credit, decimals) : ""}</td>
                    <td className={cell}><Balance value={row.balance} decimals={decimals} /></td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-surface-muted/40 font-semibold">
              <tr>
                <td className="px-4 py-3" colSpan={5}>{t("Closing")}</td>
                <td className={cell}><Balance value={report.data.closing} decimals={decimals} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}

export default function LedgerPage() {
  // useSearchParams needs a Suspense boundary.
  return (
    <Suspense fallback={<Loading />}>
      <LedgerReport />
    </Suspense>
  );
}
