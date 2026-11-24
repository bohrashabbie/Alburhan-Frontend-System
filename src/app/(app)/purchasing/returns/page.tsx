"use client";

import { useState } from "react";

import { DocumentList, Facts } from "@/components/document-list";
import { type LineDraft, SalesLinesEditor, SalesLinesView, newLine } from "@/components/sales-lines";
import { SupplierPicker } from "@/components/supplier-picker";
import { Button, Drawer, ErrorBanner, SelectField, TextAreaField, TextField } from "@/components/ui";
import { api, withQuery } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import { decimalsOf, formatAmount } from "@/lib/money";
import { PurchaseStatus, asSalesLines, fromPurchaseLines, toPurchasePayload } from "@/lib/purchasing";
import { today } from "@/lib/sales";
import type { Page, PurchaseReturn, Supplier, SupplierBill, Warehouse } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function Editor({ doc, onDone }: { doc?: PurchaseReturn; onDone: () => void }) {
  const { company, can, name, t } = useWorkspace();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [supplierId, setSupplierId] = useState<number | null>(doc?.supplier ?? null);
  const warehouses = useResource<Page<Warehouse>>(withQuery("/organization/warehouses", { company: company.id, is_active: "true", page_size: 100 }));
  const bills = useResource<Page<SupplierBill>>(supplierId ? withQuery("/purchasing/bills", { company: company.id, supplier: supplierId, page_size: 50 }) : null);
  const [warehouse, setWarehouse] = useState(doc ? String(doc.warehouse) : "");
  const [bill, setBill] = useState(doc?.invoice ? String(doc.invoice) : "");
  const [date, setDate] = useState(doc?.date ?? today());
  const [currency, setCurrency] = useState(doc?.currency ?? company.currency);
  const [reference, setReference] = useState(doc?.reference ?? "");
  const [notes, setNotes] = useState(doc?.notes ?? "");
  const [lines, setLines] = useState<LineDraft[]>(doc?.lines.length ? fromPurchaseLines(doc.lines) : [newLine("0")]);
  const save = useAction();
  const remove = useAction();
  const openBills = (bills.data?.results ?? []).filter((item) => item.status !== "draft" && item.status !== "cancelled");

  const pickSupplier = (picked: Supplier | null) => { setSupplier(picked); setSupplierId(picked?.id ?? null); setBill(""); if (picked) setCurrency(picked.currency); };
  const pickBill = (value: string) => { setBill(value); const chosen = openBills.find((item) => String(item.id) === value); if (chosen) setCurrency(chosen.currency); };
  const payload = () => ({
    company: company.id, supplier: supplierId, warehouse: warehouse ? Number(warehouse) : null, invoice: bill ? Number(bill) : null,
    date, currency, reference, notes, lines: toPurchasePayload(lines),
  });
  const persist = async () => (doc ? api.patch<PurchaseReturn>(`/purchasing/returns/${doc.id}`, payload()) : api.post<PurchaseReturn>("/purchasing/returns", payload()));
  const saveDraft = () => save.run(async () => { await persist(); onDone(); });
  const saveAndPost = () => save.run(async () => { const saved = await persist(); await api.post(`/purchasing/returns/${saved.id}/post`); onDone(); });
  const destroy = () => remove.run(async () => { if (!doc || !window.confirm("Delete this draft return?")) return; await api.delete(`/purchasing/returns/${doc.id}`); onDone(); });

  const formId = "purchase-return-form";
  return (
    <Drawer open large wide onClose={onDone} title={doc ? t("Draft purchase return") : t("New purchase return")}
      footer={
        <div className="flex items-center gap-2">
          {doc && can("purchasing.return.delete") ? <Button variant="danger" pending={remove.pending} onClick={destroy}>{t("Delete")}</Button> : null}
          <span className="flex-1" />
          <Button variant="secondary" onClick={onDone}>{t("Cancel")}</Button>
          <Button variant="secondary" type="submit" form={formId} pending={save.pending}>{t("Save draft")}</Button>
          {can("purchasing.return.post") ? <Button pending={save.pending} onClick={saveAndPost}>{t("Post")}</Button> : null}
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit(saveDraft)} className="profile-section flex flex-col gap-5 pb-6">
        <ErrorBanner error={save.error ?? remove.error} />
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {supplierId && !supplier ? (
              <div className="flex items-end gap-2"><div className="flex-1"><TextField label={t("Supplier")} value={doc?.supplier_name ?? String(supplierId)} disabled /></div>{!doc ? <Button variant="secondary" onClick={() => setSupplierId(null)}>{t("Change")}</Button> : null}</div>
            ) : (
              <SupplierPicker label={t("Supplier")} value={supplier} error={save.field("supplier")} onChange={pickSupplier} />
            )}
          </div>
          <SelectField label={t("Return from warehouse")} required value={warehouse} onChange={(e) => setWarehouse(e.target.value)} error={save.field("warehouse")}>
            <option value="">—</option>
            {(warehouses.data?.results ?? []).map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
          </SelectField>
          <SelectField label={t("Supplier bill")} value={bill} onChange={(e) => pickBill(e.target.value)} error={save.field("invoice")} hint="If chosen and still unpaid, the return reduces what is due on it.">
            <option value="">—</option>
            {openBills.map((item) => <option key={item.id} value={item.id}>{item.number}{item.supplier_number ? ` · ${item.supplier_number}` : ""}</option>)}
          </SelectField>
          <TextField label={t("Date")} type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={save.field("date")} />
          <TextField label={t("Reference")} value={reference} onChange={(e) => setReference(e.target.value)} />
          <div className="sm:col-span-2"><TextAreaField label={t("Notes")} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <SalesLinesEditor lines={lines} onChange={setLines} currency={currency} priceListId={null} defaultTax="0" priceLabel="Unit cost" error={save.field("lines")} />
        <p className="text-sm text-ink-soft">{t("Posting takes the goods out of the warehouse and reduces what you owe the supplier.")}</p>
      </form>
    </Drawer>
  );
}

function Viewer({ doc, onDone }: { doc: PurchaseReturn; onDone: () => void }) {
  const { locale, t } = useWorkspace();
  const decimals = decimalsOf(doc.currency);
  return (
    <Drawer open large wide onClose={onDone} title={doc.number} action={<PurchaseStatus status={doc.status} />}>
      <div className="profile-section flex flex-col gap-6 pb-6">
        <Facts items={[[t("Supplier"), doc.supplier_name], [t("Date"), formatDate(doc.date, locale)], [t("Warehouse"), doc.warehouse_name], [t("Supplier bill"), doc.invoice_number ?? "—"]]} />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-soft">
          {doc.journal_number ? <span>{t("Journal entry")}: <span className="font-mono text-ink">{doc.journal_number}</span></span> : null}
          {doc.reference ? <span>{t("Reference")}: <span className="text-ink">{doc.reference}</span></span> : null}
        </div>
        {doc.notes ? <p className="text-[15px]">{doc.notes}</p> : null}
        <SalesLinesView lines={asSalesLines(doc.lines)} currency={doc.currency} priceLabel="Unit cost" />
        <p className="text-end text-lg font-semibold tabular-nums">{t("Grand total")}: {formatAmount(doc.total, decimals)} {doc.currency}</p>
      </div>
    </Drawer>
  );
}

export default function PurchaseReturnsPage() {
  const { locale } = useWorkspace();
  return (
    <DocumentList<PurchaseReturn>
      title="Purchase return"
      description="Goods sent back to a supplier. Posting takes them out of stock and reduces what you owe."
      endpoint="/purchasing/returns"
      createPermission="purchasing.return.create"
      newLabel="New purchase return"
      statuses={[["draft", "Draft"], ["posted", "Posted"]]}
      columns={[
        { label: "Date", render: (row) => <span className="tabular-nums">{formatDate(row.date, locale)}</span> },
        { label: "Number", render: (row) => <span className="font-mono text-xs">{row.number || "—"}</span> },
        { label: "Supplier bill", render: (row) => <span className="font-mono text-xs">{row.invoice_number ?? "—"}</span> },
        { label: "Warehouse", render: (row) => row.warehouse_name },
        { label: "Supplier", render: (row) => <span className="font-medium">{row.supplier_name}</span> },
        { label: "Total", render: (row) => `${formatAmount(row.total, decimalsOf(row.currency))} ${row.currency}`, align: "end" },
        { label: "Status", render: (row) => <PurchaseStatus status={row.status} /> },
      ]}
      renderOpen={(open, close) => (open === "new" ? <Editor onDone={close} /> : open.status === "draft" ? <Editor key={open.id} doc={open} onDone={close} /> : <Viewer key={open.id} doc={open} onDone={close} />)}
    />
  );
}
