"use client";

import { Printer } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { CustomerPicker } from "@/components/customer-picker";
import { Button, EmptyState, ErrorBanner, Loading, PageHeader, TextField } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import { decimalsOf, formatAmount } from "@/lib/money";
import type { Customer, CustomerStatement } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const KIND: Record<CustomerStatement["rows"][number]["kind"], [string, string]> = {
  invoice: ["Invoice", "/sales/invoices"],
  receipt: ["Payment", "/sales/receipts"],
  return: ["Sale return", "/sales/credit-notes"],
};

function Statement() {
  const { company, locale, t } = useWorkspace();
  const params = useSearchParams();
  const preset = params.get("customer");
  const presetCustomer = useResource<Customer>(preset ? `/partners/customers/${preset}` : null);
  const [picked, setPicked] = useState<Customer | null>(null);
  const customer = picked ?? presetCustomer.data ?? null;
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState(new Date().toLocaleDateString("en-CA"));
  const report = useResource<CustomerStatement>(customer ? withQuery("/reports/customer-statement", { company: company.id, customer: customer.id, date_from: from, date_to: to }) : null);
  const decimals = decimalsOf(company.currency);
  const amount = (value: string) => (Number(value) ? formatAmount(value, decimals) : <span className="text-ink-faint">—</span>);
  const r = report.data;
  const cell = "px-4 py-2.5 text-end tabular-nums";

  return (
    <>
      <PageHeader
        title={t("Customer statement")}
        description={`${t("Everything a customer was charged and everything they paid, with the balance after each line.")} ${company.currency}.`}
        actions={r ? <Button variant="secondary" className="print:hidden" onClick={() => window.print()}><Printer aria-hidden className="size-4" />{t("Print / PDF")}</Button> : undefined}
      />
      <div className="mb-4 grid max-w-4xl gap-3 sm:grid-cols-[2fr_1fr_1fr] print:hidden">
        <CustomerPicker label={t("Customer")} value={customer} onChange={setPicked} />
        <TextField label={t("From")} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField label={t("To")} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <ErrorBanner error={report.error} />
      {!customer ? (
        <EmptyState title={t("Choose a customer")} description={t("Their invoices, returns and payments appear here.")} />
      ) : !r ? (report.error ? null : <Loading label={t("Loading…")} />) : (
        <>
          <p className="mb-3 hidden text-lg font-semibold print:block">{r.customer.name} · {formatDate(r.date_from, locale)} – {formatDate(r.date_to, locale)}</p>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[[t("Opening balance"), r.opening], [t("Charged"), r.debit], [t("Paid and returned"), r.credit], [t("Balance due"), r.closing]].map(([label, value], index) => (
              <div key={label} className={`rounded-xl border border-line bg-surface p-3 ${index === 3 ? "bg-surface-muted/40" : ""}`}>
                <p className="text-xs text-ink-soft">{label}</p>
                <p className={`mt-0.5 text-lg font-semibold tabular-nums ${index === 3 && Number(value) > 0 ? "text-warning" : ""}`}>{formatAmount(value, decimals)}</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">{t("Date")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("Type")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("Reference")}</th>
                  <th className="px-4 py-2.5 text-end font-medium">{t("Charged")}</th>
                  <th className="px-4 py-2.5 text-end font-medium">{t("Paid")}</th>
                  <th className="px-4 py-2.5 text-end font-medium">{t("Balance")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <tr className="bg-surface-muted/30"><td className="px-4 py-2.5" colSpan={5}>{t("Opening balance")}</td><td className={`${cell} font-medium`}>{formatAmount(r.opening, decimals)}</td></tr>
                {r.rows.map((row) => (
                  <tr key={`${row.kind}-${row.id}`}>
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(row.date, locale)}</td>
                    <td className="px-4 py-2.5">{t(KIND[row.kind][0])}</td>
                    <td className="px-4 py-2.5"><Link href={`${KIND[row.kind][1]}?open=${row.id}`} className="font-mono text-xs text-link hover:underline">{row.number}</Link></td>
                    <td className={cell}>{amount(row.debit)}</td>
                    <td className={cell}>{amount(row.credit)}</td>
                    <td className={`${cell} font-medium`}>{formatAmount(row.balance, decimals)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-muted/40 font-semibold"><tr><td className="px-4 py-3" colSpan={3}>{t("Total")}</td><td className={cell}>{formatAmount(r.debit, decimals)}</td><td className={cell}>{formatAmount(r.credit, decimals)}</td><td className={cell}>{formatAmount(r.closing, decimals)}</td></tr></tfoot>
            </table>
          </div>
        </>
      )}
    </>
  );
}

export default function CustomerStatementPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Statement />
    </Suspense>
  );
}
