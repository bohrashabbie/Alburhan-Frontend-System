"use client";

import { ListPlus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { DocumentList, Facts } from "@/components/document-list";
import { ProductPicker } from "@/components/product-picker";
import { Button, Drawer, ErrorBanner, IconButton, SelectField, TextAreaField, TextField } from "@/components/ui";
import { api, idOrNull } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { onSubmit, useAction } from "@/lib/hooks";
import { DocStatus, LINE_INPUT, qty, useWarehouses } from "@/lib/inventory";
import type { Product, StockCount } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const today = () => new Date().toLocaleDateString("en-CA");
type LineDraft = { product: Product | null; productId: number | null; label: string; expected: string; counted: string };

function Editor({ doc, onDone }: { doc?: StockCount; onDone: () => void }) {
  const { company, can, name, t } = useWorkspace();
  const warehouses = useWarehouses();
  const [warehouse, setWarehouse] = useState(doc ? String(doc.warehouse) : "");
  const [date, setDate] = useState(doc?.date ?? today());
  const [note, setNote] = useState(doc?.note ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    (doc?.lines ?? []).map((line) => ({ product: null, productId: line.product, label: `${line.sku} · ${line.product_name}`, expected: line.expected_quantity ?? "0", counted: qty(line.counted_quantity) })),
  );
  const save = useAction();
  const remove = useAction();
  const warehouseValue = warehouse || (warehouses[0] ? String(warehouses[0].id) : "");
  const setLine = (index: number, patch: Partial<LineDraft>) => setLines(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const payload = () => ({
    company: company.id,
    warehouse: idOrNull(warehouseValue),
    date,
    note,
    lines: lines.filter((line) => line.productId).map((line) => ({ product: line.productId, counted_quantity: line.counted || "0" })),
  });
  const persist = async () => (doc ? api.patch<StockCount>(`/inventory/counts/${doc.id}`, payload()) : api.post<StockCount>("/inventory/counts", payload()));
  const saveDraft = () => save.run(async () => { await persist(); onDone(); });
  const fill = () =>
    save.run(async () => {
      const saved = await persist();
      const filled = await api.post<StockCount>(`/inventory/counts/${saved.id}/fill`);
      setLines(filled.lines.map((line) => ({ product: null, productId: line.product, label: `${line.sku} · ${line.product_name}`, expected: line.expected_quantity ?? "0", counted: qty(line.counted_quantity) })));
      if (!doc) onDone();  // re-open from the list so the draft has an id
    });
  const saveAndPost = () =>
    save.run(async () => {
      const saved = await persist();
      await api.post(`/inventory/counts/${saved.id}/post`);
      onDone();
    });
  const destroy = () =>
    remove.run(async () => {
      if (!doc || !window.confirm("Delete this draft count?")) return;
      await api.delete(`/inventory/counts/${doc.id}`);
      onDone();
    });

  const differences = lines.filter((line) => line.productId && Number(line.counted || 0) !== Number(line.expected)).length;
  const formId = "count-form";
  return (
    <Drawer
      open
      large
      wide
      onClose={onDone}
      title={doc ? t("Draft count") : t("New stock count")}
      footer={
        <div className="flex items-center gap-2">
          {doc && can("inventory.count.delete") ? <Button variant="danger" pending={remove.pending} onClick={destroy}>{t("Delete")}</Button> : null}
          <span className="flex-1" />
          <Button variant="secondary" onClick={onDone}>{t("Cancel")}</Button>
          <Button variant="secondary" type="submit" form={formId} pending={save.pending}>{t("Save draft")}</Button>
          {can("inventory.count.post") ? <Button pending={save.pending} onClick={saveAndPost} disabled={lines.length === 0}>{t("Post")}</Button> : null}
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit(saveDraft)} className="profile-section flex flex-col gap-5 pb-6">
        <ErrorBanner error={save.error ?? remove.error} />
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <SelectField label={t("Warehouse")} value={warehouseValue} disabled={Boolean(doc)} onChange={(e) => setWarehouse(e.target.value)} error={save.field("warehouse")}>
            {warehouses.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
          </SelectField>
          <TextField label={t("Date")} type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={save.field("date")} />
          <div className="sm:col-span-2"><TextAreaField label={t("Note")} value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold">{t("Counted products")}</h3>
              <p className="text-sm text-ink-soft">
                {lines.length ? `${lines.length} products · ${differences} with differences` : "Fill the list from current stock, then type what you actually counted."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" pending={save.pending} onClick={fill}>
                <ListPlus aria-hidden className="size-4" />
                {t("Fill from stock")}
              </Button>
              <Button variant="secondary" onClick={() => setLines([...lines, { product: null, productId: null, label: "", expected: "0", counted: "" }])}>
                <Plus aria-hidden className="size-4" />
                {t("Add line")}
              </Button>
            </div>
          </div>
          {lines.length > 0 ? (
            <div className="overflow-visible rounded-xl border border-line">
              <table className="w-full table-fixed text-sm">
                <colgroup><col className="w-[50%]" /><col /><col /><col /><col className="w-12" /></colgroup>
                <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">{t("Product")}</th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Expected")}</th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Counted")}</th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Difference")}</th>
                    <th scope="col" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {lines.map((line, index) => {
                    const diff = Number(line.counted || 0) - Number(line.expected);
                    return (
                      <tr key={index}>
                        <td className="px-2 py-2">
                          {line.productId && !line.product ? (
                            <span className="block truncate px-1 text-sm">{line.label}</span>
                          ) : (
                            <ProductPicker label="" value={line.product} onChange={(product) => setLine(index, { product, productId: product?.id ?? null, label: product ? `${product.sku} · ${product.name}` : "" })} />
                          )}
                        </td>
                        <td className="px-3 py-2 text-end text-ink-soft tabular-nums">{qty(line.expected)}</td>
                        <td className="px-2 py-2">
                          <input aria-label={`${t("Counted")} ${index + 1}`} inputMode="decimal" value={line.counted} onChange={(e) => setLine(index, { counted: e.target.value })} className={`${LINE_INPUT} text-end tabular-nums`} />
                        </td>
                        <td className={`px-3 py-2 text-end font-semibold tabular-nums ${diff < 0 ? "text-danger" : diff > 0 ? "text-warning" : "text-ink-faint"}`}>
                          {diff === 0 ? "—" : `${diff > 0 ? "+" : "−"}${qty(String(Math.abs(diff)))}`}
                        </td>
                        <td className="px-1 py-2 text-center">
                          <IconButton label={t("Remove line")} onClick={() => setLines(lines.filter((_, i) => i !== index))}>
                            <Trash2 aria-hidden className="size-4" />
                          </IconButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
          {save.field("lines") ? <p className="text-sm text-danger">{save.field("lines")}</p> : null}
        </section>
      </form>
    </Drawer>
  );
}

function Viewer({ doc, onDone }: { doc: StockCount; onDone: () => void }) {
  const { locale, t } = useWorkspace();
  return (
    <Drawer open large wide onClose={onDone} title={doc.number} action={<DocStatus status={doc.status} />}>
      <div className="profile-section flex flex-col gap-6 pb-6">
        <Facts items={[[t("Date"), formatDate(doc.date, locale)], [t("Warehouse"), doc.warehouse_name], [t("Products"), doc.lines.length], [t("Journal entry"), doc.journal_number ?? "—"]]} />
        {doc.note ? <p className="text-[15px]">{doc.note}</p> : null}
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("Product")}</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Expected")}</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Counted")}</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Difference")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {doc.lines.map((line) => {
                const diff = Number(line.counted_quantity) - Number(line.expected_quantity ?? 0);
                return (
                  <tr key={line.id}>
                    <td className="px-4 py-2.5"><span className="font-mono text-xs text-ink-soft">{line.sku}</span> <span className="font-medium">{line.product_name}</span></td>
                    <td className="px-4 py-2.5 text-end tabular-nums">{qty(line.expected_quantity)}</td>
                    <td className="px-4 py-2.5 text-end tabular-nums">{qty(line.counted_quantity)} {line.uom}</td>
                    <td className={`px-4 py-2.5 text-end font-semibold tabular-nums ${diff < 0 ? "text-danger" : diff > 0 ? "text-warning" : "text-ink-faint"}`}>{diff === 0 ? "—" : `${diff > 0 ? "+" : "−"}${qty(String(Math.abs(diff)))}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Drawer>
  );
}

export default function CountsPage() {
  const { locale } = useWorkspace();
  return (
    <DocumentList<StockCount>
      title="Stock counts"
      description="Count a warehouse and post the differences. Expected quantities are taken at posting time, so counts stay correct even if stock moves meanwhile."
      endpoint="/inventory/counts"
      createPermission="inventory.count.create"
      newLabel="New stock count"
      statuses={[["draft", "Draft"], ["posted", "Posted"]]}
      columns={[
        { label: "Date", render: (row) => <span className="tabular-nums">{formatDate(row.date, locale)}</span> },
        { label: "Number", render: (row) => <span className="font-mono text-xs">{row.number || "—"}</span> },
        { label: "Warehouse", render: (row) => row.warehouse_name },
        { label: "Products", render: (row) => row.lines.length, align: "end" },
        { label: "Status", render: (row) => <DocStatus status={row.status} /> },
      ]}
      renderOpen={(open, close) =>
        open === "new" ? <Editor onDone={close} /> : open.status === "draft" ? <Editor key={open.id} doc={open} onDone={close} /> : <Viewer key={open.id} doc={open} onDone={close} />
      }
    />
  );
}
