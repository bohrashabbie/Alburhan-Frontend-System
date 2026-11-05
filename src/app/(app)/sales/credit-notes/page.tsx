"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { DocumentList, Facts } from "@/components/document-list";
import { InvoicePicker } from "@/components/invoice-picker";
import { SalesLinesView } from "@/components/sales-lines";
import { Button, Drawer, ErrorBanner, Loading, SelectField, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import { LINE_INPUT, qty, useWarehouses } from "@/lib/inventory";
import { decimalsOf, formatAmount, toMinor } from "@/lib/money";
import { SalesStatus, today } from "@/lib/sales";
import type { CreditNote, Invoice } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

type Row = { invoice_line: number; product: number; sku: string; name: string; uom: string; type: string; invoiced: string; delivered: string; returned: string; unit_price: string; discount: string; tax: string; quantity: string; restock: boolean };

function rowsFromInvoice(invoice: Invoice): Row[] {
  return invoice.lines.map((line) => ({
    invoice_line: line.id!, product: line.product, sku: line.sku ?? "", name: line.product_name ?? "", uom: line.uom ?? "", type: line.product_type ?? "stock",
    invoiced: line.quantity, delivered: line.delivered_quantity ?? "0", returned: line.returned_quantity ?? "0",
    unit_price: line.unit_price, discount: line.discount_percent, tax: line.tax_rate, quantity: "", restock: line.product_type === "stock",
  }));
}

function Editor({ doc, presetInvoice, onDone }: { doc?: CreditNote; presetInvoice?: Invoice | null; onDone: () => void }) {
  const { company, can, name, t } = useWorkspace();
  const warehouses = useWarehouses();
  const [invoice, setInvoice] = useState<Invoice | null>(presetInvoice ?? null);
  const [warehouse, setWarehouse] = useState(doc?.warehouse ? String(doc.warehouse) : presetInvoice?.warehouse ? String(presetInvoice.warehouse) : "");
  const [date, setDate] = useState(doc?.date ?? today());
  const [reason, setReason] = useState(doc?.reason ?? "");
  const [rows, setRows] = useState<Row[]>(
    doc ? doc.lines.map((line) => ({ invoice_line: line.invoice_line, product: line.product, sku: line.sku ?? "", name: line.product_name ?? "", uom: line.uom ?? "", type: line.product_type ?? "stock", invoiced: "", delivered: "", returned: "", unit_price: line.unit_price, discount: line.discount_percent, tax: line.tax_rate, quantity: qty(line.quantity), restock: line.restock }))
      : presetInvoice ? rowsFromInvoice(presetInvoice) : [],
  );
  const save = useAction();
  const remove = useAction();
  const currency = invoice?.currency ?? doc?.currency ?? company.currency;
  const decimals = decimalsOf(currency);
  const total = rows.reduce((sum, row) => {
    if (!Number(row.quantity)) return sum;
    const gross = (toMinor(row.quantity, 4) * toMinor(row.unit_price, decimals)) / 10000n;
    const net = (gross * (10000n - toMinor(row.discount, 2))) / 10000n;
    return sum + net + (net * toMinor(row.tax, 2)) / 10000n;
  }, 0n);

  const payload = () => ({
    company: company.id, date, invoice: invoice?.id ?? doc?.invoice, branch: invoice?.branch ?? doc?.branch, customer: invoice?.customer ?? doc?.customer, currency, warehouse: warehouse ? Number(warehouse) : null, reason,
    lines: rows.filter((row) => Number(row.quantity) > 0).map((row) => ({ invoice_line: row.invoice_line, product: row.product, quantity: row.quantity, unit_price: row.unit_price, discount_percent: row.discount, tax_rate: row.tax, restock: row.restock })),
  });
  const persist = async () => (doc ? api.patch<CreditNote>(`/sales/credit-notes/${doc.id}`, payload()) : api.post<CreditNote>("/sales/credit-notes", payload()));
  const saveDraft = () => save.run(async () => { await persist(); onDone(); });
  const saveAndPost = () => save.run(async () => { const saved = await persist(); await api.post(`/sales/credit-notes/${saved.id}/post`); onDone(); });
  const destroy = () => remove.run(async () => { if (!doc || !window.confirm("Delete this draft credit note?")) return; await api.delete(`/sales/credit-notes/${doc.id}`); onDone(); });

  const formId = "credit-note-form";
  return (
    <Drawer
      open
      large
      wide
      onClose={onDone}
      title={doc ? t("Draft credit note") : t("New credit note")}
      footer={
        <div className="flex items-center gap-2">
          {doc && can("sales.credit_note.delete") ? <Button variant="danger" pending={remove.pending} onClick={destroy}>{t("Delete")}</Button> : null}
          <span className="flex-1" />
          <Button variant="secondary" onClick={onDone}>{t("Cancel")}</Button>
          <Button variant="secondary" type="submit" form={formId} pending={save.pending}>{t("Save draft")}</Button>
          {can("sales.credit_note.post") ? <Button pending={save.pending} onClick={saveAndPost} disabled={total <= 0n}>{t("Post")}</Button> : null}
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit(saveDraft)} className="profile-section flex flex-col gap-5 pb-6">
        <ErrorBanner error={save.error ?? remove.error} />
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {doc ? <TextField label={t("Invoice")} value={`${doc.invoice_number} · ${doc.customer_name}`} disabled /> : <InvoicePicker label={t("Invoice")} value={invoice} onChange={(picked) => { setInvoice(picked); setRows(picked ? rowsFromInvoice(picked) : []); if (picked?.warehouse) setWarehouse(String(picked.warehouse)); }} error={save.field("invoice")} />}
          </div>
          <TextField label={t("Date")} type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={save.field("date")} />
          <SelectField label={t("Returned goods go to")} value={warehouse} onChange={(e) => setWarehouse(e.target.value)} error={save.field("warehouse")} hint="They land in Returned status for inspection.">
            <option value="">—</option>
            {warehouses.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
          </SelectField>
          <div className="sm:col-span-2"><TextField label={t("Reason")} value={reason} onChange={(e) => setReason(e.target.value)} hint="e.g. wrong colour, damaged in transit, price correction" /></div>
        </div>
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-base font-bold">{t("Lines to credit")}</h3>
            <span className="text-sm font-semibold tabular-nums">{t("Total")}: {formatAmount(total, decimals)} {currency}</span>
          </div>
          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line-strong px-4 py-5 text-center text-sm text-ink-soft">{t("Choose an invoice to list its lines.")}</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full table-fixed text-sm">
                <colgroup><col className="w-[40%]" /><col /><col /><col className="w-[16%]" /><col className="w-[16%]" /></colgroup>
                <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">{t("Product")}</th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Invoiced")}</th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Delivered")}</th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Credit")}</th>
                    <th scope="col" className="px-3 py-2.5 text-center font-medium">{t("Return to stock")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((row, index) => (
                    <tr key={row.invoice_line}>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs text-ink-soft">{row.sku}</span> <span className="font-medium">{row.name}</span>
                        <span className="block text-xs text-ink-soft tabular-nums">{formatAmount(row.unit_price, decimals)} {Number(row.discount) ? `− ${qty(row.discount)}%` : ""} {Number(row.tax) ? `+ ${qty(row.tax)}% VAT` : ""}</span>
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums">{row.invoiced ? qty(row.invoiced) : "—"}</td>
                      <td className="px-3 py-2.5 text-end text-ink-soft tabular-nums">{row.delivered ? qty(row.delivered) : "—"}</td>
                      <td className="px-2 py-2"><input aria-label={`${t("Credit")} ${row.sku}`} inputMode="decimal" value={row.quantity} onChange={(e) => setRows(rows.map((r, i) => (i === index ? { ...r, quantity: e.target.value } : r)))} className={`${LINE_INPUT} text-end tabular-nums`} /></td>
                      <td className="px-3 py-2.5 text-center">
                        {row.type === "stock" ? <input type="checkbox" aria-label={`${t("Return to stock")} ${row.sku}`} className="size-4 accent-[var(--accent)]" checked={row.restock} onChange={(e) => setRows(rows.map((r, i) => (i === index ? { ...r, restock: e.target.checked } : r)))} /> : <span className="text-ink-faint">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {save.field("lines") ? <p className="text-sm text-danger">{save.field("lines")}</p> : null}
        </section>
      </form>
    </Drawer>
  );
}

function Viewer({ doc, onDone }: { doc: CreditNote; onDone: () => void }) {
  const { locale, t } = useWorkspace();
  return (
    <Drawer open large wide onClose={onDone} title={doc.number} action={<SalesStatus status={doc.status} posted="Posted" />}>
      <div className="profile-section flex flex-col gap-6 pb-6">
        <Facts items={[[t("Invoice"), doc.invoice_number], [t("Customer"), doc.customer_name], [t("Date"), formatDate(doc.date, locale)], [t("Journal entry"), doc.journal_number ?? "—"]]} />
        {doc.reason ? <p className="text-[15px]">{doc.reason}</p> : null}
        <SalesLinesView lines={doc.lines} currency={doc.currency} />
        <p className="text-end text-lg font-semibold tabular-nums">{t("Total")}: {formatAmount(doc.total, decimalsOf(doc.currency))} {doc.currency}</p>
      </div>
    </Drawer>
  );
}

function CreditNotesList() {
  const { locale } = useWorkspace();
  const params = useSearchParams();
  const invoiceId = params.get("invoice");
  const preset = useResource<Invoice>(invoiceId ? `/sales/invoices/${invoiceId}` : null);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const starter = preset.data && preset.data.id !== dismissed ? preset.data : null;

  return (
    <>
      <DocumentList<CreditNote>
        title="Credit notes"
        description="Returns and price corrections against a posted invoice. Posting reduces what the customer owes and can put goods back into stock."
        endpoint="/sales/credit-notes"
        createPermission="sales.credit_note.create"
        newLabel="New credit note"
        statuses={[["draft", "Draft"], ["posted", "Posted"]]}
        columns={[
          { label: "Date", render: (row) => <span className="tabular-nums">{formatDate(row.date, locale)}</span> },
          { label: "Number", render: (row) => <span className="font-mono text-xs">{row.number || "—"}</span> },
          { label: "Invoice", render: (row) => <span className="font-mono text-xs">{row.invoice_number}</span> },
          { label: "Customer", render: (row) => <span className="font-medium">{row.customer_name}</span> },
          { label: "Total", render: (row) => `${formatAmount(row.total, decimalsOf(row.currency))} ${row.currency}`, align: "end" },
          { label: "Status", render: (row) => <SalesStatus status={row.status} posted="Posted" /> },
        ]}
        renderOpen={(open, close) => (open === "new" ? <Editor onDone={close} /> : open.status === "draft" ? <Editor key={open.id} doc={open} onDone={close} /> : <Viewer key={open.id} doc={open} onDone={close} />)}
      />
      {starter ? <Editor key={`from-${starter.id}`} presetInvoice={starter} onDone={() => { setDismissed(starter.id); window.history.replaceState(null, "", "/sales/credit-notes"); }} /> : null}
    </>
  );
}

export default function CreditNotesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CreditNotesList />
    </Suspense>
  );
}
