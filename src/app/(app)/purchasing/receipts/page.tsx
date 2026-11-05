"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { DocumentList, Facts } from "@/components/document-list";
import { Button, Drawer, ErrorBanner, Loading, SelectField, TextAreaField, TextField } from "@/components/ui";
import { api, idOrNull } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import { LINE_INPUT, qty, useWarehouses } from "@/lib/inventory";
import { decimalsOf, formatAmount } from "@/lib/money";
import { OrderPicker, PurchaseStatus } from "@/lib/purchasing";
import { today } from "@/lib/sales";
import type { GoodsReceipt, PurchaseOrder, ReceivableRow } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

type Row = { order_line: number; sku: string; name: string; uom: string; ordered: string; before: string; quantity: string };

function Editor({ doc, presetOrder, onDone }: { doc?: GoodsReceipt; presetOrder?: PurchaseOrder | null; onDone: () => void }) {
  const { company, can, name, t } = useWorkspace();
  const warehouses = useWarehouses();
  const [order, setOrder] = useState<PurchaseOrder | null>(presetOrder ?? null);
  const [warehouse, setWarehouse] = useState(doc?.warehouse ? String(doc.warehouse) : presetOrder ? String(presetOrder.warehouse) : "");
  const [date, setDate] = useState(doc?.date ?? today());
  const [supplierRef, setSupplierRef] = useState(doc?.supplier_reference ?? "");
  const [freight, setFreight] = useState(doc ? String(Number(doc.freight_cost)) : "0");
  const [customs, setCustoms] = useState(doc ? String(Number(doc.customs_cost)) : "0");
  const [notes, setNotes] = useState(doc?.notes ?? "");
  const [rows, setRows] = useState<Row[]>(doc ? doc.lines.map((line) => ({ order_line: line.order_line, sku: line.sku ?? "", name: line.product_name ?? "", uom: line.uom ?? "", ordered: line.ordered_quantity ?? "0", before: line.received_before ?? "0", quantity: qty(line.quantity) })) : []);
  const receivable = useResource<ReceivableRow[]>(!doc && order ? `/purchasing/orders/${order.id}/receivable` : null);
  const save = useAction();
  const remove = useAction();
  const warehouseValue = warehouse || (warehouses[0] ? String(warehouses[0].id) : "");
  // Rows come from the order's open quantities once, then the user edits them.
  const shown = rows.length || !receivable.data ? rows : receivable.data.map((row) => ({ order_line: row.order_line, sku: row.sku, name: row.product_name, uom: row.uom, ordered: row.ordered_quantity, before: row.received_before, quantity: qty(row.quantity) }));
  const setQuantity = (index: number, value: string) => setRows(shown.map((row, i) => (i === index ? { ...row, quantity: value } : row)));

  const payload = () => ({
    company: company.id, date, order: order?.id ?? doc?.order, warehouse: idOrNull(warehouseValue), supplier_reference: supplierRef,
    freight_cost: freight || "0", customs_cost: customs || "0", notes,
    lines: shown.filter((row) => Number(row.quantity) > 0).map((row) => ({ order_line: row.order_line, quantity: row.quantity })),
  });
  const persist = async () => (doc ? api.patch<GoodsReceipt>(`/purchasing/receipts/${doc.id}`, payload()) : api.post<GoodsReceipt>("/purchasing/receipts", payload()));
  const saveDraft = () => save.run(async () => { await persist(); onDone(); });
  const saveAndPost = () => save.run(async () => { const saved = await persist(); await api.post(`/purchasing/receipts/${saved.id}/post`); onDone(); });
  const destroy = () => remove.run(async () => { if (!doc || !window.confirm("Delete this draft receipt?")) return; await api.delete(`/purchasing/receipts/${doc.id}`); onDone(); });

  const formId = "grn-form";
  return (
    <Drawer open large wide onClose={onDone} title={doc ? t("Draft goods receipt") : t("New goods receipt")}
      footer={
        <div className="flex items-center gap-2">
          {doc && can("purchasing.receipt.delete") ? <Button variant="danger" pending={remove.pending} onClick={destroy}>{t("Delete")}</Button> : null}
          <span className="flex-1" />
          <Button variant="secondary" onClick={onDone}>{t("Cancel")}</Button>
          <Button variant="secondary" type="submit" form={formId} pending={save.pending}>{t("Save draft")}</Button>
          {can("purchasing.receipt.post") ? <Button pending={save.pending} onClick={saveAndPost} disabled={shown.length === 0}>{t("Receive")}</Button> : null}
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit(saveDraft)} className="profile-section flex flex-col gap-5 pb-6">
        <ErrorBanner error={save.error ?? remove.error} />
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {doc ? <TextField label={t("Purchase order")} value={`${doc.order_number} · ${doc.supplier_name}`} disabled /> : <OrderPicker label={t("Purchase order")} value={order} onChange={(picked) => { setOrder(picked); setRows([]); if (picked) setWarehouse(String(picked.warehouse)); }} error={save.field("order")} />}
          </div>
          <SelectField label={t("Into warehouse")} value={warehouseValue} onChange={(e) => setWarehouse(e.target.value)} error={save.field("warehouse")}>
            {warehouses.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
          </SelectField>
          <TextField label={t("Date")} type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={save.field("date")} />
          <TextField label={t("Supplier delivery note")} value={supplierRef} onChange={(e) => setSupplierRef(e.target.value)} hint="Packing list or delivery note number." />
          <div className="grid grid-cols-2 gap-3">
            <TextField label={`${t("Freight")} (${company.currency})`} inputMode="decimal" value={freight} onChange={(e) => setFreight(e.target.value)} error={save.field("freight_cost")} />
            <TextField label={`${t("Customs")} (${company.currency})`} inputMode="decimal" value={customs} onChange={(e) => setCustoms(e.target.value)} />
          </div>
          <div className="sm:col-span-2"><TextAreaField label={t("Notes")} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-base font-bold">{t("Goods received")}</h3>
            <span className="text-sm text-ink-soft">{t("Freight and customs are spread over the lines into the stock cost.")}</span>
          </div>
          {shown.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line-strong px-4 py-5 text-center text-sm text-ink-soft">{order && receivable.data?.length === 0 ? t("Everything on this order has been received.") : t("Choose a purchase order to list its goods.")}</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full table-fixed text-sm">
                <colgroup><col className="w-[52%]" /><col /><col /><col className="w-[18%]" /></colgroup>
                <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">{t("Product")}</th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Ordered")}</th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Received")}</th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Receive now")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {shown.map((row, index) => (
                    <tr key={row.order_line}>
                      <td className="px-3 py-2.5"><span className="font-mono text-xs text-ink-soft">{row.sku}</span> <span className="font-medium">{row.name}</span></td>
                      <td className="px-3 py-2.5 text-end tabular-nums">{qty(row.ordered)} {row.uom}</td>
                      <td className="px-3 py-2.5 text-end text-ink-soft tabular-nums">{qty(row.before)}</td>
                      <td className="px-2 py-2"><input aria-label={`${t("Receive now")} ${row.sku}`} inputMode="decimal" value={row.quantity} onChange={(e) => setQuantity(index, e.target.value)} className={`${LINE_INPUT} text-end tabular-nums`} /></td>
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

function Viewer({ doc, onDone }: { doc: GoodsReceipt; onDone: () => void }) {
  const { company, locale, t } = useWorkspace();
  const decimals = decimalsOf(company.currency);
  const landed = Number(doc.freight_cost) + Number(doc.customs_cost);
  return (
    <Drawer open large wide onClose={onDone} title={doc.number} action={<PurchaseStatus status={doc.status} posted="Received" />}>
      <div className="profile-section flex flex-col gap-6 pb-6">
        <Facts items={[[t("Purchase order"), doc.order_number], [t("Supplier"), doc.supplier_name], [t("Date"), formatDate(doc.date, locale)], [t("Into warehouse"), doc.warehouse_name]]} />
        <div className="grid grid-cols-3 gap-3">
          {[[t("Goods value"), doc.goods_value], [t("Landed costs"), String(landed)], [t("Stock value"), String(Number(doc.goods_value) + landed)]].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line p-3"><p className="text-xs text-ink-soft">{label}</p><p className="mt-0.5 font-semibold tabular-nums">{formatAmount(value, decimals)} {company.currency}</p></div>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-soft">
          {doc.supplier_reference ? <span>{t("Supplier delivery note")}: <span className="text-ink">{doc.supplier_reference}</span></span> : null}
          {doc.journal_number ? <span>{t("Journal entry")}: <span className="font-mono text-ink">{doc.journal_number}</span></span> : null}
        </div>
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
              <tr><th scope="col" className="px-4 py-2.5 text-start font-medium">{t("Product")}</th><th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Quantity")}</th><th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Landed unit cost")}</th><th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Billed")}</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {doc.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-2.5"><span className="font-mono text-xs text-ink-soft">{line.sku}</span> <span className="font-medium">{line.product_name}</span></td>
                  <td className="px-3 py-2.5 text-end font-semibold tabular-nums">{qty(line.quantity)} {line.uom}</td>
                  <td className="px-3 py-2.5 text-end tabular-nums">{formatAmount(line.unit_cost ?? "0", decimals)}</td>
                  <td className="px-4 py-2.5 text-end tabular-nums">{qty(line.invoiced_quantity ?? "0")} / {qty(line.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {doc.notes ? <p className="text-sm whitespace-pre-line">{doc.notes}</p> : null}
      </div>
    </Drawer>
  );
}

function ReceiptsList() {
  const { locale } = useWorkspace();
  const params = useSearchParams();
  const orderId = params.get("order");
  const preset = useResource<PurchaseOrder>(orderId ? `/purchasing/orders/${orderId}` : null);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const starter = preset.data && preset.data.id !== dismissed ? preset.data : null;
  return (
    <>
      <DocumentList<GoodsReceipt>
        title="Goods receipts"
        description="Goods arriving against a purchase order go into stock at their landed cost (order price × rate + freight and customs)."
        endpoint="/purchasing/receipts"
        createPermission="purchasing.receipt.create"
        newLabel="New goods receipt"
        statuses={[["draft", "Draft"], ["posted", "Received"]]}
        columns={[
          { label: "Date", render: (row) => <span className="tabular-nums">{formatDate(row.date, locale)}</span> },
          { label: "Number", render: (row) => <span className="font-mono text-xs">{row.number || "—"}</span> },
          { label: "Order", render: (row) => <span className="font-mono text-xs">{row.order_number}</span> },
          { label: "Supplier", render: (row) => <span className="font-medium">{row.supplier_name}</span> },
          { label: "Warehouse", render: (row) => row.warehouse_name },
          { label: "Lines", render: (row) => row.lines.length, align: "end" },
          { label: "Status", render: (row) => <PurchaseStatus status={row.status} posted="Received" /> },
        ]}
        renderOpen={(open, close) => (open === "new" ? <Editor onDone={close} /> : open.status === "draft" ? <Editor key={open.id} doc={open} onDone={close} /> : <Viewer key={open.id} doc={open} onDone={close} />)}
      />
      {starter ? <Editor key={`from-${starter.id}`} presetOrder={starter} onDone={() => { setDismissed(starter.id); window.history.replaceState(null, "", "/purchasing/receipts"); }} /> : null}
    </>
  );
}

export default function GoodsReceiptsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ReceiptsList />
    </Suspense>
  );
}
