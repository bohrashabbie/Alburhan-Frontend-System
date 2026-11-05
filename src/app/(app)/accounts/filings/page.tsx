"use client";

import { Download, FileJson } from "lucide-react";
import { useState } from "react";

import { InvoicePicker } from "@/components/invoice-picker";
import { Button, ErrorBanner, PageHeader, TextField } from "@/components/ui";
import { ApiError, withQuery } from "@/lib/api";
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

export default function FilingsPage() {
  const { company, t } = useWorkspace();
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(new Date().toLocaleDateString("en-CA"));
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const xbrl = useAction();
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
          <Button className="mt-3" pending={xbrl.pending} onClick={() => xbrl.run(() => download(withQuery("/reports/compliance/xbrl", { company: company.id, date_from: from, date_to: to }), `${company.code}-${to.slice(0, 4)}-xbrl.xml`))}><Download aria-hidden className="size-4" />{t("Download XBRL")}</Button>
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
