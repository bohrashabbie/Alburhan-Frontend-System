"use client";

import { Banknote, PackagePlus, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { DocumentList, Facts } from "@/components/document-list";
import { type LineDraft, SalesLinesEditor, SalesLinesView, newLine } from "@/components/sales-lines";
import { SupplierPicker } from "@/components/supplier-picker";
import { Button, Drawer, ErrorBanner, Loading, SelectField, TextAreaField, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import { qty } from "@/lib/inventory";
import { decimalsOf, formatAmount } from "@/lib/money";
import { OrderPicker, PurchaseStatus, asSalesLines, fromPurchaseLines, toPurchasePayload } from "@/lib/purchasing";
import { today } from "@/lib/sales";
import type { BillableRow, Currency, Page, PurchaseOrder, Supplier, SupplierBalance, SupplierBill } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function billableToLines(rows: BillableRow[]): LineDraft[] {
  return rows.map((row) => ({
    product: null, productId: row.product, label: `${row.receipt_number} · ${row.sku} · ${row.product_name}`, description: "",
    quantity: qty(row.quantity), unit_price: row.unit_cost, discount_percent: qty(row.discount_percent), tax_rate: qty(row.tax_rate), receipt_line: row.receipt_line,
  }));
}

function Editor({ doc, presetOrder, onDone }: { doc?: SupplierBill; presetOrder?: PurchaseOrder | null; onDone: () => void }) {
  const { company, can, name, t } = useWorkspace();
  const currencies = useResource<Page<Currency>>("/organization/currencies?page_size=500&is_active=true");
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [supplierId, setSupplierId] = useState<number | null>(doc?.supplier ?? presetOrder?.supplier ?? null);
  const supplierName = doc?.supplier_name ?? presetOrder?.supplier_name ?? "";
  const balance = useResource<SupplierBalance>(supplierId ? `/purchasing/suppliers/${supplierId}/balance` : null);
  const [order, setOrder] = useState<PurchaseOrder | null>(presetOrder ?? null);
  const [supplierNumber, setSupplierNumber] = useState(doc?.supplier_number ?? "");
  const [date, setDate] = useState(doc?.date ?? today());
  const [dueDate, setDueDate] = useState(doc?.due_date ?? "");
  const [currency, setCurrency] = useState(doc?.currency ?? presetOrder?.currency ?? company.currency);
  const [reference, setReference] = useState(doc?.reference ?? "");
  const [notes, setNotes] = useState(doc?.notes ?? "");
  const [lines, setLines] = useState<LineDraft[]>(doc?.lines.length ? fromPurchaseLines(doc.lines) : [newLine("0")]);
  const [loadedOrder, setLoadedOrder] = useState<number | null>(null);
  const save = useAction();
  const remove = useAction();
  const load = useAction();
  const decimals = decimalsOf(currency);

  const addReceived = (target: PurchaseOrder) =>
    load.run(async () => {
      const rows = await api.get<BillableRow[]>(`/purchasing/orders/${target.id}/billable`);
      const fresh = billableToLines(rows);
      setLines((current) => [...current.filter((line) => line.productId), ...fresh]);
      setLoadedOrder(target.id);
      if (!supplierId) setSupplierId(target.supplier);
      setCurrency(target.currency);
    });
  const pickSupplier = (picked: Supplier | null) => { setSupplier(picked); setSupplierId(picked?.id ?? null); if (picked) setCurrency(picked.currency); };
  const payload = () => ({
    company: company.id, supplier: supplierId, order: order?.id ?? doc?.order ?? null, supplier_number: supplierNumber, date, due_date: dueDate || null,
    currency, reference, notes, lines: toPurchasePayload(lines),
  });
  const persist = async () => (doc ? api.patch<SupplierBill>(`/purchasing/bills/${doc.id}`, payload()) : api.post<SupplierBill>("/purchasing/bills", payload()));
  const saveDraft = () => save.run(async () => { await persist(); onDone(); });
  const saveAndPost = () => save.run(async () => { const saved = await persist(); await api.post(`/purchasing/bills/${saved.id}/post`); onDone(); });
  const destroy = () => remove.run(async () => { if (!doc || !window.confirm("Delete this draft bill?")) return; await api.delete(`/purchasing/bills/${doc.id}`); onDone(); });

  const formId = "bill-form";
  return (
    <Drawer open large wide onClose={onDone} title={doc ? t("Draft supplier bill") : t("New supplier bill")}
      footer={
        <div className="flex items-center gap-2">
          {doc && can("purchasing.invoice.delete") ? <Button variant="danger" pending={remove.pending} onClick={destroy}>{t("Delete")}</Button> : null}
          <span className="flex-1" />
          <Button variant="secondary" onClick={onDone}>{t("Cancel")}</Button>
          <Button variant="secondary" type="submit" form={formId} pending={save.pending}>{t("Save draft")}</Button>
          {can("purchasing.invoice.post") ? <Button pending={save.pending} onClick={saveAndPost}>{t("Post")}</Button> : null}
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit(saveDraft)} className="profile-section flex flex-col gap-5 pb-6">
        <ErrorBanner error={save.error ?? remove.error ?? load.error} />
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {supplierId && !supplier ? (
              <div className="flex items-end gap-2"><div className="flex-1"><TextField label={t("Supplier")} value={supplierName || String(supplierId)} disabled /></div>{!doc ? <Button variant="secondary" onClick={() => setSupplierId(null)}>{t("Change")}</Button> : null}</div>
            ) : (
              <SupplierPicker label={t("Supplier")} value={supplier} error={save.field("supplier")} onChange={pickSupplier} />
            )}
            {balance.data ? <p className="mt-1.5 text-sm text-ink-soft tabular-nums">{t("Amount due")}: <span className={Number(balance.data.amount_due) > 0 ? "font-medium text-warning" : "text-ink"}>{formatAmount(balance.data.amount_due, decimalsOf(balance.data.currency))} {balance.data.currency}</span>{Number(balance.data.advances) > 0 ? <> · {t("Advance")}: <span className="text-ink">{formatAmount(balance.data.advances, decimalsOf(balance.data.currency))}</span></> : null}</p> : null}
          </div>
          <div className="sm:col-span-2 flex items-end gap-2">
            <div className="flex-1">{doc && !order ? <TextField label={t("Purchase order")} value={doc.order_number ?? "—"} disabled /> : <OrderPicker label={t("Purchase order")} value={order} onChange={setOrder} filter="all" />}</div>
            {order && !doc ? <Button variant="secondary" pending={load.pending} onClick={() => addReceived(order)} disabled={loadedOrder === order.id}><PackagePlus aria-hidden className="size-4" />{t("Add received goods")}</Button> : null}
          </div>
          <TextField label={t("Supplier invoice no.")} value={supplierNumber} onChange={(e) => setSupplierNumber(e.target.value)} error={save.field("supplier_number")} />
          <TextField label={t("Date")} type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={save.field("date")} />
          <TextField label={t("Due date")} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} hint="Empty = from the supplier's payment terms." />
          <SelectField label={t("Currency")} value={currency} onChange={(e) => setCurrency(e.target.value)} error={save.field("exchange_rate")}>
            {(currencies.data?.results ?? []).map((item) => <option key={item.code} value={item.code}>{item.code} · {name(item)}</option>)}
          </SelectField>
          <TextField label={t("Reference")} value={reference} onChange={(e) => setReference(e.target.value)} />
          <div className="sm:col-span-2"><TextAreaField label={t("Notes")} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <SalesLinesEditor lines={lines} onChange={setLines} currency={currency} priceListId={null} defaultTax="0" priceLabel="Unit cost" error={save.field("lines")} />
        <p className="text-sm text-ink-soft">{t("Stock items must come from a goods receipt (Add received goods). Services and expenses go to the product's expense account.")}{decimals ? "" : ""}</p>
      </form>
    </Drawer>
  );
}

function Viewer({ doc, onDone }: { doc: SupplierBill; onDone: () => void }) {
  const { can, locale, t } = useWorkspace();
  const router = useRouter();
  const [cancelDate, setCancelDate] = useState(today());
  const action = useAction();
  const decimals = decimalsOf(doc.currency);
  const money = (value: string) => `${formatAmount(value, decimals)} ${doc.currency}`;
  const open = doc.status === "posted" || doc.status === "partially_paid";
  const cancel = () => action.run(async () => { if (!window.confirm("Cancel this bill? Its accounting entry will be reversed.")) return; await api.post(`/purchasing/bills/${doc.id}/cancel`, { date: cancelDate }); onDone(); });
  return (
    <Drawer open large wide onClose={onDone} title={doc.number} action={<PurchaseStatus status={doc.status} posted="Unpaid" />}>
      <div className="profile-section flex flex-col gap-6 pb-6">
        <Facts items={[[t("Supplier"), doc.supplier_name], [t("Supplier invoice no."), doc.supplier_number || "—"], [t("Date"), formatDate(doc.date, locale)], [t("Due date"), formatDate(doc.due_date, locale)]]} />
        <div className="grid grid-cols-3 gap-3">
          {[[t("Total"), money(doc.total)], [t("Paid"), money(doc.amount_paid)], [t("Amount due"), money(doc.amount_due)]].map(([label, value], index) => (
            <div key={label} className={`rounded-xl border border-line p-3 ${index === 2 ? "bg-surface-muted/40" : ""}`}><p className="text-xs text-ink-soft">{label}</p><p className={`mt-0.5 font-semibold tabular-nums ${index === 2 && Number(doc.amount_due) > 0 ? "text-warning" : ""}`}>{value}</p></div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-soft">
          {doc.order_number ? <span>{t("Purchase order")}: <span className="font-mono text-ink">{doc.order_number}</span></span> : null}
          {doc.journal_number ? <span>{t("Journal entry")}: <span className="font-mono text-ink">{doc.journal_number}</span></span> : null}
          {doc.reference ? <span>{t("Reference")}: <span className="text-ink">{doc.reference}</span></span> : null}
        </div>
        <SalesLinesView lines={asSalesLines(doc.lines)} currency={doc.currency} priceLabel="Unit cost" extraLabel="Receipt" extra={(line) => (line as unknown as { receipt_number: string | null }).receipt_number ?? "—"} />
        <ErrorBanner error={action.error} />
        {open ? (
          <div className="flex flex-wrap items-end justify-end gap-2 border-t border-line pt-5">
            {can("purchasing.invoice.cancel") && doc.status === "posted" ? (
              <>
                <div className="w-40"><TextField label={t("Cancel on")} type="date" value={cancelDate} onChange={(e) => setCancelDate(e.target.value)} /></div>
                <Button variant="ghost" pending={action.pending} onClick={cancel}><XCircle aria-hidden className="size-4" />{t("Cancel bill")}</Button>
                <span className="flex-1" />
              </>
            ) : null}
            {can("purchasing.payment.create") && Number(doc.amount_due) > 0 ? <Button onClick={() => { onDone(); router.push(`/purchasing/payments?bill=${doc.id}`); }}><Banknote aria-hidden className="size-4" />{t("Pay")}</Button> : null}
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}

function BillsList() {
  const { locale } = useWorkspace();
  const params = useSearchParams();
  const orderId = params.get("order");
  const preset = useResource<PurchaseOrder>(orderId ? `/purchasing/orders/${orderId}` : null);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const starter = preset.data && preset.data.id !== dismissed ? preset.data : null;
  return (
    <>
      <DocumentList<SupplierBill>
        title="Supplier bills"
        description="Invoices received from suppliers. Posting books the payable; bills for received goods clear 'Goods received not invoiced'."
        endpoint="/purchasing/bills"
        createPermission="purchasing.invoice.create"
        newLabel="New bill"
        statuses={[["draft", "Draft"], ["posted", "Unpaid"], ["partially_paid", "Partly paid"], ["paid", "Paid"], ["cancelled", "Cancelled"]]}
        columns={[
          { label: "Date", render: (row) => <span className="tabular-nums">{formatDate(row.date, locale)}</span> },
          { label: "Number", render: (row) => <span className="font-mono text-xs">{row.number || "—"}</span> },
          { label: "Supplier", render: (row) => <span><span className="block font-medium">{row.supplier_name}</span>{row.supplier_number ? <span className="block text-xs text-ink-soft">{row.supplier_number}</span> : null}</span> },
          { label: "Due date", render: (row) => <span className="tabular-nums">{formatDate(row.due_date, locale)}</span> },
          { label: "Total", render: (row) => `${formatAmount(row.total, decimalsOf(row.currency))} ${row.currency}`, align: "end" },
          { label: "Amount due", render: (row) => <span className={Number(row.amount_due) > 0 && row.status !== "draft" ? "font-medium text-warning" : ""}>{formatAmount(row.amount_due, decimalsOf(row.currency))}</span>, align: "end" },
          { label: "Status", render: (row) => <PurchaseStatus status={row.status} posted="Unpaid" /> },
        ]}
        renderOpen={(open, close) => (open === "new" ? <Editor onDone={close} /> : open.status === "draft" ? <Editor key={open.id} doc={open} onDone={close} /> : <Viewer key={open.id} doc={open} onDone={close} />)}
      />
      {starter ? <Editor key={`from-${starter.id}`} presetOrder={starter} onDone={() => { setDismissed(starter.id); window.history.replaceState(null, "", "/purchasing/bills"); }} /> : null}
    </>
  );
}

export default function BillsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <BillsList />
    </Suspense>
  );
}
