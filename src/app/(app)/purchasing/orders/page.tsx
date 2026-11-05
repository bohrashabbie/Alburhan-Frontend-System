"use client";

import { FileText, PackageCheck, Send, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { DocumentList, Facts } from "@/components/document-list";
import { type LineDraft, SalesLinesEditor, SalesLinesView, newLine } from "@/components/sales-lines";
import { SupplierPicker } from "@/components/supplier-picker";
import { Badge, Button, Drawer, ErrorBanner, Loading, SelectField, TextAreaField, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import { qty, useWarehouses } from "@/lib/inventory";
import { decimalsOf, formatAmount } from "@/lib/money";
import { PurchaseStatus, asSalesLines, fromPurchaseLines, toPurchasePayload } from "@/lib/purchasing";
import { today } from "@/lib/sales";
import type { Currency, Page, PurchaseOrder, Supplier } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function Editor({ doc, onDone }: { doc?: PurchaseOrder; onDone: () => void }) {
  const { company, branch, branches, can, name, t } = useWorkspace();
  const warehouses = useWarehouses();
  const currencies = useResource<Page<Currency>>("/organization/currencies?page_size=500&is_active=true");
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [supplierId, setSupplierId] = useState<number | null>(doc?.supplier ?? null);
  const [branchId, setBranchId] = useState(doc?.branch ? String(doc.branch) : branch ? String(branch.id) : "");
  const [warehouse, setWarehouse] = useState(doc?.warehouse ? String(doc.warehouse) : "");
  const [date, setDate] = useState(doc?.date ?? today());
  const [expected, setExpected] = useState(doc?.expected_date ?? "");
  const [currency, setCurrency] = useState(doc?.currency ?? company.currency);
  const [reference, setReference] = useState(doc?.reference ?? "");
  const [notes, setNotes] = useState(doc?.notes ?? "");
  const [lines, setLines] = useState<LineDraft[]>(doc?.lines.length ? fromPurchaseLines(doc.lines) : [newLine("0")]);
  const save = useAction();
  const remove = useAction();
  const warehouseValue = warehouse || (warehouses[0] ? String(warehouses[0].id) : "");

  const pickSupplier = (picked: Supplier | null) => {
    setSupplier(picked);
    setSupplierId(picked?.id ?? null);
    if (picked) setCurrency(picked.currency);
  };
  const payload = () => ({
    company: company.id, branch: branchId ? Number(branchId) : null, supplier: supplierId, warehouse: Number(warehouseValue), date,
    expected_date: expected || null, currency, reference, notes, lines: toPurchasePayload(lines),
  });
  const persist = async () => (doc ? api.patch<PurchaseOrder>(`/purchasing/orders/${doc.id}`, payload()) : api.post<PurchaseOrder>("/purchasing/orders", payload()));
  const saveDraft = () => save.run(async () => { await persist(); onDone(); });
  const saveAndSend = () => save.run(async () => { const saved = await persist(); await api.post(`/purchasing/orders/${saved.id}/send`); onDone(); });
  const destroy = () => remove.run(async () => { if (!doc || !window.confirm("Delete this draft order?")) return; await api.delete(`/purchasing/orders/${doc.id}`); onDone(); });

  const formId = "order-form";
  return (
    <Drawer
      open large wide onClose={onDone}
      title={doc ? t("Draft purchase order") : t("New purchase order")}
      footer={
        <div className="flex items-center gap-2">
          {doc && can("purchasing.order.delete") ? <Button variant="danger" pending={remove.pending} onClick={destroy}>{t("Delete")}</Button> : null}
          <span className="flex-1" />
          <Button variant="secondary" onClick={onDone}>{t("Cancel")}</Button>
          <Button variant="secondary" type="submit" form={formId} pending={save.pending}>{t("Save draft")}</Button>
          {can("purchasing.order.send") ? <Button pending={save.pending} onClick={saveAndSend}><Send aria-hidden className="size-4" />{t("Send to supplier")}</Button> : null}
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit(saveDraft)} className="profile-section flex flex-col gap-5 pb-6">
        <ErrorBanner error={save.error ?? remove.error} />
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {doc && !supplier ? <TextField label={t("Supplier")} value={doc.supplier_name} disabled /> : <SupplierPicker label={t("Supplier")} value={supplier} error={save.field("supplier")} onChange={pickSupplier} />}
            {supplier?.intercompany ? <p className="mt-1.5 text-sm text-ink-soft">{t("Group company: this order is an intercompany purchase.")}</p> : null}
          </div>
          <SelectField label={t("Buying for")} value={branchId} onChange={(e) => setBranchId(e.target.value)} error={save.field("branch")} hint="Empty = the whole company.">
            <option value="">{t("Company")}</option>
            {branches.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
          </SelectField>
          <SelectField label={t("Deliver to")} value={warehouseValue} onChange={(e) => setWarehouse(e.target.value)} error={save.field("warehouse")}>
            {warehouses.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
          </SelectField>
          <TextField label={t("Date")} type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={save.field("date")} />
          <TextField label={t("Expected on")} type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
          <SelectField label={t("Currency")} value={currency} onChange={(e) => setCurrency(e.target.value)} error={save.field("exchange_rate")} hint="Defaults to the supplier's currency.">
            {(currencies.data?.results ?? []).map((item) => <option key={item.code} value={item.code}>{item.code} · {name(item)}</option>)}
          </SelectField>
          <TextField label={t("Reference")} value={reference} onChange={(e) => setReference(e.target.value)} hint="Supplier quotation / proforma" />
          <div className="sm:col-span-2"><TextAreaField label={t("Notes")} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <SalesLinesEditor lines={lines} onChange={setLines} currency={currency} priceListId={null} defaultTax="0" priceLabel="Unit cost" error={save.field("lines")} />
      </form>
    </Drawer>
  );
}

function Viewer({ doc, onDone }: { doc: PurchaseOrder; onDone: () => void }) {
  const { can, locale, t } = useWorkspace();
  const router = useRouter();
  const action = useAction();
  const decimals = decimalsOf(doc.currency);
  const money = (value: string) => `${formatAmount(value, decimals)} ${doc.currency}`;
  const open = doc.status === "sent" || doc.status === "partial";
  const run = (path: string, confirm?: string) => action.run(async () => { if (confirm && !window.confirm(confirm)) return; await api.post(`/purchasing/orders/${doc.id}/${path}`); onDone(); });

  return (
    <Drawer open large wide onClose={onDone} title={doc.number} action={<PurchaseStatus status={doc.status} />}>
      <div className="profile-section flex flex-col gap-6 pb-6">
        <Facts items={[[t("Supplier"), doc.supplier_name], [t("Date"), formatDate(doc.date, locale)], [t("Expected on"), formatDate(doc.expected_date, locale)], [t("Deliver to"), doc.warehouse_name]]} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[[t("Subtotal"), money(doc.subtotal)], [t("VAT"), money(doc.tax_total)], [t("Total"), money(doc.total)], [t("In") + ` ${doc.currency === "KWD" ? "KWD" : t("company currency")}`, doc.currency === "KWD" ? "—" : `× ${qty(doc.exchange_rate)}`]].map(([label, value], index) => (
            <div key={label} className={`rounded-xl border border-line p-3 ${index === 2 ? "bg-surface-muted/40" : ""}`}><p className="text-xs text-ink-soft">{label}</p><p className="mt-0.5 font-semibold tabular-nums">{value}</p></div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-soft">
          <span>{t("Goods")}: <PurchaseStatus status={doc.receipt_status === "pending" ? "sent" : doc.receipt_status} /></span>
          {doc.intercompany ? <Badge tone="warning">{t("Intercompany")}</Badge> : null}
          {doc.branch_name ? <span>{t("Buying for")}: <span className="text-ink">{doc.branch_name}</span></span> : null}
          {doc.reference ? <span>{t("Reference")}: <span className="text-ink">{doc.reference}</span></span> : null}
        </div>
        {doc.notes ? <p className="text-[15px]">{doc.notes}</p> : null}
        <SalesLinesView lines={asSalesLines(doc.lines)} currency={doc.currency} priceLabel="Unit cost" extraLabel="Received" extra={(line) => `${qty((line as unknown as { received_quantity: string }).received_quantity ?? "0")} / ${qty(line.quantity)}`} />
        <ErrorBanner error={action.error} />
        {doc.status !== "cancelled" && doc.status !== "closed" ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-5">
            {can("purchasing.order.update") && (doc.status === "sent" || doc.status === "draft") ? <Button variant="ghost" pending={action.pending} onClick={() => run("cancel", "Cancel this order?")}><XCircle aria-hidden className="size-4" />{t("Cancel order")}</Button> : null}
            {can("purchasing.order.update") && doc.status !== "draft" ? <Button variant="ghost" pending={action.pending} onClick={() => run("close", "Close this order? Nothing more will be received against it.")}>{t("Close order")}</Button> : null}
            <span className="flex-1" />
            {can("purchasing.invoice.create") && doc.receipt_status !== "pending" ? <Button variant="secondary" onClick={() => { onDone(); router.push(`/purchasing/bills?order=${doc.id}`); }}><FileText aria-hidden className="size-4" />{t("Bill")}</Button> : null}
            {can("purchasing.receipt.create") && open ? <Button onClick={() => { onDone(); router.push(`/purchasing/receipts?order=${doc.id}`); }}><PackageCheck aria-hidden className="size-4" />{t("Receive goods")}</Button> : null}
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}

function OrdersList() {
  const { locale, t } = useWorkspace();
  const params = useSearchParams();
  const openId = params.get("open");
  const requested = useResource<PurchaseOrder>(openId ? `/purchasing/orders/${openId}` : null);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const initial = requested.data && requested.data.id !== dismissed ? requested.data : null;
  const dismiss = (id: number) => { setDismissed(id); window.history.replaceState(null, "", "/purchasing/orders"); };

  return (
    <>
      <DocumentList<PurchaseOrder>
        title="Purchase orders"
        description="Order from suppliers and the China factory. Send the order, receive the goods into a warehouse, then bill and pay."
        endpoint="/purchasing/orders"
        createPermission="purchasing.order.create"
        newLabel="New purchase order"
        statuses={[["draft", "Draft"], ["sent", "Sent"], ["partial", "Partly received"], ["received", "Received"], ["closed", "Closed"], ["cancelled", "Cancelled"]]}
        columns={[
          { label: "Date", render: (row) => <span className="tabular-nums">{formatDate(row.date, locale)}</span> },
          { label: "Number", render: (row) => <span className="font-mono text-xs">{row.number || "—"}</span> },
          { label: "Supplier", render: (row) => <span className="font-medium">{row.supplier_name}{row.intercompany ? <Badge tone="warning">{t("Group")}</Badge> : null}</span> },
          { label: "Deliver to", render: (row) => row.warehouse_name },
          { label: "Expected", render: (row) => <span className="tabular-nums">{formatDate(row.expected_date, locale)}</span> },
          { label: "Total", render: (row) => `${formatAmount(row.total, decimalsOf(row.currency))} ${row.currency}`, align: "end" },
          { label: "Status", render: (row) => <PurchaseStatus status={row.status} /> },
        ]}
        renderOpen={(open, close) => (open === "new" ? <Editor onDone={close} /> : open.status === "draft" ? <Editor key={open.id} doc={open} onDone={close} /> : <Viewer key={open.id} doc={open} onDone={close} />)}
      />
      {initial ? (initial.status === "draft" ? <Editor key={`q-${initial.id}`} doc={initial} onDone={() => dismiss(initial.id)} /> : <Viewer key={`q-${initial.id}`} doc={initial} onDone={() => dismiss(initial.id)} />) : null}
    </>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OrdersList />
    </Suspense>
  );
}
