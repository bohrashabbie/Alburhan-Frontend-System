"use client";

import { CheckCircle2, CircleAlert, Download, FileJson, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";

import { InvoicePicker } from "@/components/invoice-picker";
import { Button, ErrorBanner, PageHeader, TextField } from "@/components/ui";
import { api, ApiError, withQuery } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import type { Invoice } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const year = new Date().getFullYear();

async function download(path: string, filename: string) {
  const response = await fetch(`/api/v1${path}`, { headers: { "x-app-request": "1" } });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, data?.code ?? "error", data?.message ?? "Download failed.", data?.fields ?? {});
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

type XbrlCheck = {
  checks: { name: string; ok: boolean; level: "ok" | "warning" | "error"; detail: string }[];
  facts: { concept: string; context: string; value: string }[];
};

export default function FilingsPage() {
  const { company, t } = useWorkspace();
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(new Date().toLocaleDateString("en-CA"));
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const xbrl = useAction();
  const checking = useAction();
  const [checked, setChecked] = useState<XbrlCheck | null>(null);
  const eta = useAction();
  return (
    <>
      <PageHeader title={t("Filings & e-invoicing")} description="Country filings produced from the books: Kuwait XBRL financial statements and Egypt ETA e-invoice documents. UAE VAT 201 figures are on the VAT return page." />
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-base font-bold">{t("Kuwait · XBRL financial statements")}</h2>
          <p className="mt-1 text-sm text-ink-soft">An IFRS-taxonomy XBRL instance with revenue, cost of sales, profit, assets, liabilities and equity for the period, for the Ministry of Commerce / CMA portal.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <TextField label={t("From")} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <TextField label={t("To")} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="mt-3"><ErrorBanner error={xbrl.error} /></div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" pending={checking.pending} onClick={() => checking.run(async () => setChecked(await api.get<XbrlCheck>(withQuery("/reports/compliance/xbrl/check", { company: company.id, date_from: from, date_to: to }))))}><ShieldCheck aria-hidden className="size-4" />{t("Check the file")}</Button>
            <Button pending={xbrl.pending} onClick={() => xbrl.run(() => download(withQuery("/reports/compliance/xbrl", { company: company.id, date_from: from, date_to: to }), `${company.code}-${to.slice(0, 4)}-xbrl.xml`))}><Download aria-hidden className="size-4" />{t("Download XBRL")}</Button>
          </div>
          <div className="mt-3"><ErrorBanner error={checking.error} /></div>
          {checked ? (
            <div className="mt-4 flex flex-col gap-3">
              <ul className="divide-y divide-line rounded-xl border border-line">
                {checked.checks.map((item) => (
                  <li key={item.name} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                    {item.level === "ok" ? <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-link" /> : item.level === "warning" ? <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" /> : <XCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />}
                    <span className="min-w-0"><span className="block font-medium">{t(item.name)}</span><span className="block text-ink-soft">{item.detail}</span></span>
                  </li>
                ))}
              </ul>
              <details className="rounded-xl border border-line px-4 py-2.5 text-sm">
                <summary className="cursor-pointer font-medium">{t("Figures in the file")} · {checked.facts.length}</summary>
                <table className="mt-2 w-full tabular-nums">
                  <tbody className="divide-y divide-line">
                    {checked.facts.map((fact) => (
                      <tr key={`${fact.concept}-${fact.context}`}><td className="py-1.5 font-mono text-xs">ifrs-full:{fact.concept}</td><td className="py-1.5 text-xs text-ink-soft">{t(fact.context)}</td><td className="py-1.5 text-end">{fact.value}</td></tr>
                    ))}
                  </tbody>
                </table>
              </details>
              <p className="text-xs text-ink-soft">{t("These checks cover the XBRL structure and that the statements add up. The full taxonomy validation (every figure's type and the filing rules) runs when the file is uploaded to the Ministry of Commerce / CMA portal; it can also be run beforehand with a free XBRL validator such as Arelle.")}</p>
            </div>
          ) : null}
        </section>
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-base font-bold">{t("Egypt · ETA e-invoice")}</h2>
          <p className="mt-1 text-sm text-ink-soft">Builds the Egyptian Tax Authority document (v1.0) for a posted invoice. Sign it with the company&apos;s ETA certificate and submit it through the ETA portal or SDK.</p>
          <div className="mt-4"><InvoicePicker label={t("Invoice")} value={invoice} onChange={(picked) => { setInvoice(picked); setPreview(null); }} /></div>
          <div className="mt-3"><ErrorBanner error={eta.error} /></div>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" disabled={!invoice} pending={eta.pending} onClick={() => invoice && eta.run(async () => { const response = await fetch(`/api/v1/reports/compliance/egypt-einvoice/${invoice.id}`, { headers: { "x-app-request": "1" } }); const data = await response.json(); if (!response.ok) throw new ApiError(response.status, data?.code ?? "error", data?.message ?? "Failed.", data?.fields ?? {}); setPreview(JSON.stringify(data, null, 2)); })}><FileJson aria-hidden className="size-4" />{t("Preview document")}</Button>
            <Button disabled={!invoice} pending={eta.pending} onClick={() => invoice && eta.run(() => download(`/reports/compliance/egypt-einvoice/${invoice.id}`, `${invoice.number}-eta.json`))}><Download aria-hidden className="size-4" />{t("Download JSON")}</Button>
          </div>
          {preview ? <pre className="mt-4 max-h-96 overflow-auto rounded-xl border border-line bg-surface-muted/40 p-4 font-mono text-xs leading-5">{preview}</pre> : null}
        </section>
      </div>
    </>
  );
}
