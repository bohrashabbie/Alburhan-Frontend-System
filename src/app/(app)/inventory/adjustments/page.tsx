"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { DocumentList, Facts } from "@/components/document-list";
import { ProductPicker } from "@/components/product-picker";
import { Button, Drawer, ErrorBanner, IconButton, SelectField, TextAreaField, TextField } from "@/components/ui";
import { useAccounts } from "@/lib/accounting";
import { api, idOrNull } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { onSubmit, useAction } from "@/lib/hooks";
import { DocStatus, LINE_INPUT, STOCK_STATUSES, qty, useWarehouses } from "@/lib/inventory";
import type { Adjustment, Product, StockStatus } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const REASONS: [Adjustment["reason"], string][] = [
  ["opening", "Opening stock"],
  ["correction", "Correction"],
  ["damage", "Damage / write-off"],
  ["status", "Status change (e.g. to damaged)"],
];
const today = () => new Date().toLocaleDateString("en-CA");

type LineDraft = { product: Product | null; productId: number | null; label: string; status: StockStatus; quantity: string; unit_cost: string };
const newLine = (): LineDraft => ({ product: null, productId: null, label: "", status: "available", quantity: "", unit_cost: "" });

function Editor({ doc, onDone }: { doc?: Adjustment; onDone: () => void }) {
  const { company, can, name, t } = useWorkspace();
  const warehouses = useWarehouses();
  const accounts = useAccounts().filter((account) => !account.is_group && account.is_active);
  const [warehouse, setWarehouse] = useState(doc ? String(doc.warehouse) : "");
  const [date, setDate] = useState(doc?.date ?? today());
  const [reason, setReason] = useState<Adjustment["reason"]>(doc?.reason ?? "correction");
  const [counter, setCounter] = useState(doc?.counter_account ? String(doc.counter_account) : "");
  const [note, setNote] = useState(doc?.note ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    doc?.lines.length
      ? doc.lines.map((line) => ({
          product: null,
          productId: line.product,
          label: `${line.sku} · ${line.product_name}`,
          status: line.status,
          quantity: line.quantity.replace(/\.?0+$/, ""),
          unit_cost: line.unit_cost ? String(Number(line.unit_cost)) : "",
        }))
      : [newLine()],
  );
  const save = useAction();
  const remove = useAction();
  const warehouseValue = warehouse || (warehouses[0] ? String(warehouses[0].id) : "");
  const setLine = (index: number, patch: Partial<LineDraft>) => setLines(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const payload = () => ({
    company: company.id,
    warehouse: idOrNull(warehouseValue),
    date,
    reason,
    counter_account: counter ? Number(counter) : null,
    note,
    lines: lines
      .filter((line) => line.productId)
      .map((line) => ({ product: line.productId, status: line.status, quantity: line.quantity || "0", unit_cost: line.unit_cost || null })),
  });
  const persist = async () =>
    doc ? api.patch<Adjustment>(`/inventory/adjustments/${doc.id}`, payload()) : api.post<Adjustment>("/inventory/adjustments", payload());
  const saveDraft = () => save.run(async () => { await persist(); onDone(); });
  const saveAndPost = () =>
    save.run(async () => {
      const saved = await persist();
      await api.post(`/inventory/adjustments/${saved.id}/post`);
      onDone();
    });
  const destroy = () =>
    remove.run(async () => {
      if (!doc || !window.confirm("Delete this draft adjustment?")) return;
      await api.delete(`/inventory/adjustments/${doc.id}`);
      onDone();
    });

  const formId = "adjustment-form";
  return (
    <Drawer
      open
      large
      wide
      onClose={onDone}
      title={doc ? t("Draft adjustment") : t("New adjustment")}
      footer={
        <div className="flex items-center gap-2">
          {doc && can("inventory.adjustment.delete") ? <Button variant="danger" pending={remove.pending} onClick={destroy}>{t("Delete")}</Button> : null}
          <span className="flex-1" />
          <Button variant="secondary" onClick={onDone}>{t("Cancel")}</Button>
          <Button variant="secondary" type="submit" form={formId} pending={save.pending}>{t("Save draft")}</Button>
          {can("inventory.adjustment.post") ? <Button pending={save.pending} onClick={saveAndPost}>{t("Post")}</Button> : null}
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit(saveDraft)} className="profile-section flex flex-col gap-5 pb-6">
        <ErrorBanner error={save.error ?? remove.error} />
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <SelectField label={t("Warehouse")} value={warehouseValue} onChange={(e) => setWarehouse(e.target.value)} error={save.field("warehouse")}>
            {warehouses.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
          </SelectField>
          <TextField label={t("Date")} type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={save.field("date")} />
          <SelectField label={t("Reason")} value={reason} onChange={(e) => setReason(e.target.value as Adjustment["reason"])}>
            {REASONS.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
          </SelectField>
          <SelectField
            label={t("Post against account")}
            value={counter}
            onChange={(e) => setCounter(e.target.value)}
            hint={reason === "status" ? "Not needed: a status change doesn't change stock value." : "Empty = the inventory adjustment account."}
            disabled={reason === "status"}
            error={save.field("counter_account")}
          >
            <option value="">—</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {name(account)}</option>)}
          </SelectField>
          <div className="sm:col-span-2">
            <TextAreaField label={t("Note")} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">{t("Lines")}</h3>
              <p className="text-sm text-ink-soft">
                {reason === "status"
                  ? "Remove from one status and add the same quantity to another, e.g. −3 available, +3 damaged."
                  : "Positive quantities add stock (give a unit cost), negative quantities remove it at average cost."}
              </p>
            </div>
            <Button variant="secondary" onClick={() => setLines([...lines, newLine()])}>
              <Plus aria-hidden className="size-4" />
              {t("Add line")}
            </Button>
          </div>
          <div className="overflow-visible rounded-xl border border-line">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[40%]" />
                <col className="w-[20%]" />
                <col className="w-[16%]" />
                <col className="w-[18%]" />
                <col className="w-12" />
              </colgroup>
              <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
                <tr>
                  <th scope="col" className="px-3 py-2.5 text-start font-medium">{t("Product")}</th>
                  <th scope="col" className="px-3 py-2.5 text-start font-medium">{t("Status")}</th>
                  <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Quantity")}</th>
                  <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Unit cost")}</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lines.map((line, index) => (
                  <tr key={index}>
                    <td className="px-2 py-2">
                      {line.productId && !line.product ? (
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-sm">
                          <span className="truncate">{line.label}</span>
                          <button type="button" className="text-xs text-ink-soft hover:text-ink" onClick={() => setLine(index, { productId: null, label: "" })}>{t("Change")}</button>
                        </div>
                      ) : (
                        <ProductPicker label="" value={line.product} onChange={(product) => setLine(index, { product, productId: product?.id ?? null, label: product ? `${product.sku} · ${product.name}` : "" })} />
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <select aria-label={`${t("Status")} ${index + 1}`} value={line.status} onChange={(e) => setLine(index, { status: e.target.value as StockStatus })} className={`${LINE_INPUT} control-select`}>
                        {STOCK_STATUSES.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input aria-label={`${t("Quantity")} ${index + 1}`} inputMode="decimal" placeholder="+10 / −3" value={line.quantity} onChange={(e) => setLine(index, { quantity: e.target.value.replace("−", "-") })} className={`${LINE_INPUT} text-end tabular-nums`} />
                    </td>
                    <td className="px-2 py-2">
                      <input aria-label={`${t("Unit cost")} ${index + 1}`} inputMode="decimal" placeholder={reason === "status" ? "—" : "avg"} disabled={reason === "status" || line.quantity.trim().startsWith("-")} value={line.unit_cost} onChange={(e) => setLine(index, { unit_cost: e.target.value })} className={`${LINE_INPUT} text-end tabular-nums`} />
                    </td>
                    <td className="px-1 py-2 text-center">
                      <IconButton label={t("Remove line")} disabled={lines.length <= 1} onClick={() => setLines(lines.filter((_, i) => i !== index))}>
                        <Trash2 aria-hidden className="size-4" />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {save.field("lines") ? <p className="text-sm text-danger">{save.field("lines")}</p> : null}
        </section>
      </form>
    </Drawer>
  );
}

function Viewer({ doc, onDone }: { doc: Adjustment; onDone: () => void }) {
  const { locale, t } = useWorkspace();
  const statusName = Object.fromEntries(STOCK_STATUSES);
  const reasonName = Object.fromEntries(REASONS);
  return (
    <Drawer open large wide onClose={onDone} title={doc.number} action={<DocStatus status={doc.status} />}>
      <div className="profile-section flex flex-col gap-6 pb-6">
        <Facts items={[[t("Date"), formatDate(doc.date, locale)], [t("Warehouse"), doc.warehouse_name], [t("Reason"), t(reasonName[doc.reason])], [t("Journal entry"), doc.journal_number ?? "—"]]} />
        {doc.note ? <p className="text-[15px]">{doc.note}</p> : null}
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("Product")}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("Status")}</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Quantity")}</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Unit cost")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {doc.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-2.5"><span className="font-mono text-xs text-ink-soft">{line.sku}</span> <span className="font-medium">{line.product_name}</span></td>
                  <td className="px-4 py-2.5">{t(statusName[line.status])}</td>
                  <td className={`px-4 py-2.5 text-end font-semibold tabular-nums ${line.quantity.startsWith("-") ? "text-danger" : ""}`}>{qty(line.quantity)} {line.uom}</td>
                  <td className="px-4 py-2.5 text-end tabular-nums">{line.unit_cost ? Number(line.unit_cost) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Drawer>
  );
}

export default function AdjustmentsPage() {
  const { locale, t } = useWorkspace();
  const reasonName = Object.fromEntries(REASONS);
  return (
    <DocumentList<Adjustment>
      title="Adjustments"
      description="Bring stock in (opening balances, found items), write it off, or move it between statuses. Posting updates stock and the books."
      endpoint="/inventory/adjustments"
      createPermission="inventory.adjustment.create"
      newLabel="New adjustment"
      statuses={[["draft", "Draft"], ["posted", "Posted"]]}
      columns={[
        { label: "Date", render: (row) => <span className="tabular-nums">{formatDate(row.date, locale)}</span> },
        { label: "Number", render: (row) => <span className="font-mono text-xs">{row.number || "—"}</span> },
        { label: "Warehouse", render: (row) => row.warehouse_name },
        { label: "Reason", render: (row) => t(reasonName[row.reason]) },
        { label: "Lines", render: (row) => row.lines.length, align: "end" },
        { label: "Status", render: (row) => <DocStatus status={row.status} /> },
      ]}
      renderOpen={(open, close) =>
        open === "new" ? <Editor onDone={close} /> : open.status === "draft" ? <Editor key={open.id} doc={open} onDone={close} /> : <Viewer key={open.id} doc={open} onDone={close} />
      }
    />
  );
}
