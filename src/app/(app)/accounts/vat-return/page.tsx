"use client";

import { useState } from "react";

import { ErrorBanner, Loading, PageHeader, TextField } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { decimalsOf, formatAmount } from "@/lib/money";
import type { VatReturn } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function firstOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("en-CA");
}

export default function VatReturnPage() {
  const { company, name, t } = useWorkspace();
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(new Date().toLocaleDateString("en-CA"));
  const report = useResource<VatReturn>(withQuery("/reports/compliance/vat-return", { company: company.id, date_from: from, date_to: to }));
  const decimals = decimalsOf(company.currency);
  const r = report.data;
  const fmt = (value: string) => formatAmount(value, decimals);
  const countryNote: Record<string, string> = {
    AE: "Boxes follow the FTA VAT 201 return: standard-rated supplies by emirate (branch), zero-rated supplies, recoverable input tax.",
    EG: "Figures for the monthly Egyptian VAT return (Form 10); line detail goes through e-invoicing under Filings.",
    KW: "Kuwait has no VAT yet; this page is ready for when it starts.",
  };
  return (
    <>
      <PageHeader title={t("VAT return")} description={countryNote[company.country] ?? `VAT collected and paid by ${name(company)} in the period.`} />
      <div className="mb-4 grid max-w-xl gap-3 sm:grid-cols-2">
        <TextField label={t("From")} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField label={t("To")} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <ErrorBanner error={report.error} />
      {!r ? (report.error ? null : <Loading label={t("Loading…")} />) : (
        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase"><tr><th className="px-4 py-2.5 text-start font-medium">{t("Box")}</th><th className="px-4 py-2.5 text-end font-medium">{t("Amount")} ({company.currency})</th><th className="px-4 py-2.5 text-end font-medium">{t("VAT")}</th></tr></thead>
              <tbody className="divide-y divide-line">
                <tr className="bg-surface-muted/30"><td colSpan={3} className="px-4 py-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">{t("Sales (output VAT)")}</td></tr>
                {r.sales.by_branch.map((b) => <tr key={b.branch}><td className="ps-8 pe-4 py-2">{t("Standard-rated supplies")} · {b.name}</td><td className="px-4 py-2 text-end tabular-nums">{fmt(b.net)}</td><td className="px-4 py-2 text-end tabular-nums">{fmt(b.tax)}</td></tr>)}
                <tr><td className="ps-8 pe-4 py-2">{t("Credit notes")}</td><td className="px-4 py-2 text-end tabular-nums">{Number(r.sales.credit_notes_net) ? `−${fmt(r.sales.credit_notes_net)}` : fmt("0")}</td><td className="px-4 py-2 text-end tabular-nums">{Number(r.sales.credit_notes_tax) ? `−${fmt(r.sales.credit_notes_tax)}` : fmt("0")}</td></tr>
                <tr><td className="ps-8 pe-4 py-2">{t("Zero-rated / exempt supplies")}</td><td className="px-4 py-2 text-end tabular-nums">{fmt(r.sales.zero_rated_net)}</td><td className="px-4 py-2 text-end text-ink-faint">—</td></tr>
                <tr className="font-semibold"><td className="px-4 py-2.5">{t("Total output VAT")}</td><td className="px-4 py-2.5 text-end tabular-nums">{fmt(r.sales.standard_rated_net)}</td><td className="px-4 py-2.5 text-end tabular-nums">{fmt(r.totals.output_tax)}</td></tr>
                <tr className="bg-surface-muted/30"><td colSpan={3} className="px-4 py-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">{t("Purchases (input VAT)")}</td></tr>
                <tr><td className="ps-8 pe-4 py-2">{t("Taxable purchases")}</td><td className="px-4 py-2 text-end tabular-nums">{fmt(r.purchases.taxable_net)}</td><td className="px-4 py-2 text-end tabular-nums">{fmt(r.purchases.input_tax)}</td></tr>
                <tr><td className="ps-8 pe-4 py-2">{t("Purchases without VAT")}</td><td className="px-4 py-2 text-end tabular-nums">{fmt(r.purchases.untaxed_net)}</td><td className="px-4 py-2 text-end text-ink-faint">—</td></tr>
                <tr className="font-semibold"><td className="px-4 py-2.5">{t("Total input VAT")}</td><td /><td className="px-4 py-2.5 text-end tabular-nums">{fmt(r.totals.input_tax)}</td></tr>
              </tbody>
              <tfoot className="bg-surface-muted/40 text-base font-bold"><tr><td className="px-4 py-3" colSpan={2}>{Number(r.totals.net_payable) >= 0 ? t("Net VAT payable") : t("Net VAT refundable")}</td><td className="px-4 py-3 text-end tabular-nums">{fmt(r.totals.net_payable.replace("-", ""))}</td></tr></tfoot>
            </table>
          </div>
          <div className="flex flex-col gap-3 self-start">
            <div className="rounded-xl border border-line bg-surface p-4 text-sm"><p className="text-xs tracking-wide text-ink-soft uppercase">{t("Tax registration")}</p><p className="mt-1 font-mono">{r.tax_registration_number || "—"}</p><p className="mt-2 text-ink-soft">{t("Set it under Settings → Companies.")}</p></div>
            {[[t("Output VAT"), r.totals.output_tax], [t("Input VAT"), r.totals.input_tax], [t("Net payable"), r.totals.net_payable]].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line bg-surface p-4"><p className="text-xs tracking-wide text-ink-soft uppercase">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{fmt(value)} {company.currency}</p></div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
