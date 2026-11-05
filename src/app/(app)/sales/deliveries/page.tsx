"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { DocumentList, Facts } from "@/components/document-list";
import { InvoicePicker } from "@/components/invoice-picker";
import { Button, Drawer, ErrorBanner, Loading, SelectField, TextAreaField, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import { LINE_INPUT, qty, useWarehouses } from "@/lib/inventory";
import { SalesStatus, today } from "@/lib/sales";
import type { DeliveryNote, Invoice } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

type Row = { invoice_line: number; sku: string; name: string; uom: string; ordered: string; before: string; quantity: string };

function rowsFromInvoice(invoice: Invoice): Row[] {
  return invoice.lines
    .filter((line) => line.product_type === "stock")
    .map((line) => {
      const remaining = Number(line.quantity) - Number(line.delivered_quantity ?? 0);
      return { invoice_line: line.id!, sku: line.sku ?? "", name: line.product_name ?? "", uom: line.uom ?? "", ordered: line.quantity, before: line.delivered_quantity ?? "0", quantity: remaining > 0 ? qty(String(remaining)) : "0" };
    });
}

function Editor({ doc, presetInvoice, onDone }: { doc?: DeliveryNote; presetInvoice?: Invoice | null; onDone: () => void }) {
  const { company, can, name, t } = useWorkspace();
  const warehouses = useWarehouses();
  const [invoice, setInvoice] = useState<Invoice | null>(presetInvoice ?? null);
  const [warehouse, setWarehouse] = useState(doc?.warehouse ? String(doc.warehouse) : presetInvoice?.warehouse ? String(presetInvoice.warehouse) : "");
  const [date, setDate] = useState(doc?.date ?? today());
  const [deliveredTo, setDeliveredTo] = useState(doc?.delivered_to ?? "");
  const [address, setAddress] = useState(doc?.address ?? "");
  const [driver, setDriver] = useState(doc?.driver ?? "");
  const [notes, setNotes] = useState(doc?.notes ?? "");
  const [rows, setRows] = useState<Row[]>(
    doc ? doc.lines.map((line) => ({ invoice_line: line.invoice_line, sku: line.sku ?? "", name: line.product_name ?? "", uom: line.uom ?? "", ordered: line.ordered_quantity ?? "0", before: line.delivered_before ?? "0", quantity: qty(line.quantity) }))
      : presetInvoice ? rowsFromInvoice(presetInvoice) : [],
  );
  const save = useAction();
  const remove = useAction();
  const warehouseValue = warehouse || (warehouses[0] ? String(warehouses[0].id) : "");

  const chooseInvoice = (picked: Invoice | null) => {
    setInvoice(picked);
    setRows(picked ? rowsFromInvoice(picked) : []);
    if (picked?.warehouse) setWarehouse(String(picked.warehouse));
  };
  const payload = () => ({
    company: company.id, date, invoice: invoice?.id ?? doc?.invoice, warehouse: Number(warehouseValue), delivered_to: deliveredTo, address, driver, notes,
    lines: rows.filter((row) => Number(row.quantity) > 0).map((row) => ({ invoice_line: row.invoice_line, quantity: row.quantity })),
  });
  const persist = async () => (doc ? api.patch<DeliveryNote>(`/sales/deliveries/${doc.id}`, payload()) : api.post<DeliveryNote>("/sales/deliveries", payload()));
  const saveDraft = () => save.run(async () => { await persist(); onDone(); });
  const saveAndPost = () => save.run(async () => { const saved = await persist(); await api.post(`/sales/deliveries/${saved.id}/post`); onDone(); });
  const destroy = () => remove.run(async () => { if (!doc || !window.confirm("Delete this draft delivery note?")) return; await api.delete(`/sales/deliveries/${doc.id}`); onDone(); });

  const formId = "delivery-form";
  return (
    <Drawer
      open
      large
      wide
      onClose={onDone}
      title={doc ? t("Draft delivery note") : t("New delivery note")}
      footer={
        <div className="flex items-center gap-2">
          {doc && can("sales.delivery.delete") ? <Button variant="danger" pending={remove.pending} onClick={destroy}>{t("Delete")}</Button> : null}
          <span className="flex-1" />
          <Button variant="secondary" onClick={onDone}>{t("Cancel")}</Button>
          <Button variant="secondary" type="submit" form={formId} pending={save.pending}>{t("Save draft")}</Button>
          {can("sales.delivery.post") ? <Button pending={save.pending} onClick={saveAndPost} disabled={rows.length === 0}>{t("Deliver")}</Button> : null}
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit(saveDraft)} className="profile-section flex flex-col gap-5 pb-6">
        <ErrorBanner error={save.error ?? remove.error} />
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {doc ? <TextField label={t("Invoice")} value={`${doc.invoice_number} · ${doc.customer_name}`} disabled /> : <InvoicePicker label={t("Invoice")} value={invoice} onChange={chooseInvoice} error={save.field("invoice")} />}
          </div>
          <SelectField label={t("Warehouse")} value={warehouseValue} onChange={(e) => setWarehouse(e.target.value)} error={save.field("warehouse")}>
            {warehouses.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
          </SelectField>
          <TextField label={t("Date")} type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={save.field("date")} />
          <TextField label={t("Received by")} value={deliveredTo} onChange={(e) => setDeliveredTo(e.target.value)} hint="Name of the person signing for the goods." />
          <TextField label={t("Driver")} value={driver} onChange={(e) => setDriver(e.target.value)} />
          <div className="sm:col-span-2"><TextAreaField label={t("Delivery address")} value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          <div className="sm:col-span-2"><TextAreaField label={t("Notes")} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <section className="flex flex-col gap-3">
          <h3 className="text-base font-bold">{t("Goods to deliver")}</h3>
          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line-strong px-4 py-5 text-center text-sm text-ink-soft">{t("Choose an invoice to list its goods.")}</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full table-fixed text-sm">
                <colgroup><col className="w-[52%]" /><col /><col /><col className="w-[18%]" /></colgroup>
                <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">{t("Product")}</th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Ordered")}</th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Delivered")}</th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Deliver now")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((row, index) => (
                    <tr key={row.invoice_line}>
                      <td className="px-3 py-2.5"><span className="font-mono text-xs text-ink-soft">{row.sku}</span> <span className="font-medium">{row.name}</span></td>
                      <td className="px-3 py-2.5 text-end tabular-nums">{qty(row.ordered)} {row.uom}</td>
                      <td className="px-3 py-2.5 text-end text-ink-soft tabular-nums">{qty(row.before)}</td>
                      <td className="px-2 py-2">
                        <input aria-label={`${t("Deliver now")} ${row.sku}`} inputMode="decimal" value={row.quantity} onChange={(e) => setRows(rows.map((r, i) => (i === index ? { ...r, quantity: e.target.value } : r)))} className={`${LINE_INPUT} text-end tabular-nums`} />
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

function Viewer({ doc, onDone }: { doc: DeliveryNote; onDone: () => void }) {
  const { locale, t } = useWorkspace();
  return (
    <Drawer open large wide onClose={onDone} title={doc.number} action={<SalesStatus status={doc.status} posted="Delivered" />}>
      <div className="profile-section flex flex-col gap-6 pb-6">
        <Facts items={[[t("Invoice"), doc.invoice_number], [t("Customer"), doc.customer_name], [t("Date"), formatDate(doc.date, locale)], [t("Warehouse"), doc.warehouse_name]]} />
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-soft">
          {doc.delivered_to ? <span>{t("Received by")}: <span className="text-ink">{doc.delivered_to}</span></span> : null}
          {doc.driver ? <span>{t("Driver")}: <span className="text-ink">{doc.driver}</span></span> : null}
          {doc.journal_number ? <span>{t("Journal entry")}: <span className="font-mono text-ink">{doc.journal_number}</span></span> : null}
        </div>
        {doc.address ? <p className="text-sm whitespace-pre-line">{doc.address}</p> : null}
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
              <tr><th scope="col" className="px-4 py-2.5 text-start font-medium">{t("Product")}</th><th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Quantity")}</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {doc.lines.map((line) => (
                <tr key={line.id}><td className="px-4 py-2.5"><span className="font-mono text-xs text-ink-soft">{line.sku}</span> <span className="font-medium">{line.product_name}</span></td><td className="px-4 py-2.5 text-end font-semibold tabular-nums">{qty(line.quantity)} {line.uom}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Drawer>
  );
}

function DeliveriesList() {
  const { locale } = useWorkspace();
  const params = useSearchParams();
  const invoiceId = params.get("invoice");
  const preset = useResource<Invoice>(invoiceId ? `/sales/invoices/${invoiceId}` : null);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const starter = preset.data && preset.data.id !== dismissed ? preset.data : null;

  return (
    <>
      <DocumentList<DeliveryNote>
        title="Delivery notes"
        description="Hand goods over against a posted invoice, in full or in parts. Posting takes the stock out and books the cost of sale."
        endpoint="/sales/deliveries"
        createPermission="sales.delivery.create"
        newLabel="New delivery note"
        statuses={[["draft", "Draft"], ["posted", "Delivered"]]}
        columns={[
          { label: "Date", render: (row) => <span className="tabular-nums">{formatDate(row.date, locale)}</span> },
          { label: "Number", render: (row) => <span className="font-mono text-xs">{row.number || "—"}</span> },
          { label: "Invoice", render: (row) => <span className="font-mono text-xs">{row.invoice_number}</span> },
          { label: "Customer", render: (row) => <span className="font-medium">{row.customer_name}</span> },
          { label: "Warehouse", render: (row) => row.warehouse_name },
          { label: "Status", render: (row) => <SalesStatus status={row.status} posted="Delivered" /> },
        ]}
        renderOpen={(open, close) => (open === "new" ? <Editor onDone={close} /> : open.status === "draft" ? <Editor key={open.id} doc={open} onDone={close} /> : <Viewer key={open.id} doc={open} onDone={close} />)}
      />
      {starter ? <Editor key={`from-${starter.id}`} presetInvoice={starter} onDone={() => { setDismissed(starter.id); window.history.replaceState(null, "", "/sales/deliveries"); }} /> : null}
    </>
  );
}

export default function DeliveriesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DeliveriesList />
    </Suspense>
  );
}
