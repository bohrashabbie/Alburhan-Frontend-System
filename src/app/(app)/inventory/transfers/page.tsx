"use client";

import { ArrowRight, PackageCheck, Plus, Send, Trash2 } from "lucide-react";
import { useState } from "react";

import { DocumentList, Facts } from "@/components/document-list";
import { ProductPicker } from "@/components/product-picker";
import { Button, Drawer, ErrorBanner, IconButton, SelectField, TextAreaField, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { onSubmit, useAction } from "@/lib/hooks";
import { DocStatus, LINE_INPUT, qty, useWarehouses } from "@/lib/inventory";
import type { Product, Transfer } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const today = () => new Date().toLocaleDateString("en-CA");
type LineDraft = { product: Product | null; productId: number | null; label: string; quantity: string };
const newLine = (): LineDraft => ({ product: null, productId: null, label: "", quantity: "" });

function Editor({ doc, onDone }: { doc?: Transfer; onDone: () => void }) {
  const { company, can, name, t } = useWorkspace();
  const warehouses = useWarehouses();
  const [source, setSource] = useState(doc ? String(doc.from_warehouse) : "");
  const [target, setTarget] = useState(doc ? String(doc.to_warehouse) : "");
  const [date, setDate] = useState(doc?.date ?? today());
  const [note, setNote] = useState(doc?.note ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    doc?.lines.length
      ? doc.lines.map((line) => ({ product: null, productId: line.product, label: `${line.sku} · ${line.product_name}`, quantity: line.quantity.replace(/\.?0+$/, "") }))
      : [newLine()],
  );
  const save = useAction();
  const remove = useAction();
  const sourceValue = source || (warehouses[0] ? String(warehouses[0].id) : "");
  const setLine = (index: number, patch: Partial<LineDraft>) => setLines(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const payload = () => ({
    company: company.id,
    from_warehouse: Number(sourceValue),
    to_warehouse: Number(target),
    date,
    note,
    lines: lines.filter((line) => line.productId).map((line) => ({ product: line.productId, quantity: line.quantity || "0" })),
  });
  const persist = async () => (doc ? api.patch<Transfer>(`/inventory/transfers/${doc.id}`, payload()) : api.post<Transfer>("/inventory/transfers", payload()));
  const saveDraft = () => save.run(async () => { await persist(); onDone(); });
  const saveAndSend = () =>
    save.run(async () => {
      const saved = await persist();
      await api.post(`/inventory/transfers/${saved.id}/dispatch`);
      onDone();
    });
  const destroy = () =>
    remove.run(async () => {
      if (!doc || !window.confirm("Delete this draft transfer?")) return;
      await api.delete(`/inventory/transfers/${doc.id}`);
      onDone();
    });

  const formId = "transfer-form";
  return (
    <Drawer
      open
      large
      wide
      onClose={onDone}
      title={doc ? t("Draft transfer") : t("New transfer")}
      footer={
        <div className="flex items-center gap-2">
          {doc && can("inventory.transfer.delete") ? <Button variant="danger" pending={remove.pending} onClick={destroy}>{t("Delete")}</Button> : null}
          <span className="flex-1" />
          <Button variant="secondary" onClick={onDone}>{t("Cancel")}</Button>
          <Button variant="secondary" type="submit" form={formId} pending={save.pending}>{t("Save draft")}</Button>
          {can("inventory.transfer.dispatch") ? (
            <Button pending={save.pending} onClick={saveAndSend}>
              <Send aria-hidden className="size-4" />
              {t("Send")}
            </Button>
          ) : null}
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit(saveDraft)} className="profile-section flex flex-col gap-5 pb-6">
        <ErrorBanner error={save.error ?? remove.error} />
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <SelectField label={t("From warehouse")} value={sourceValue} onChange={(e) => setSource(e.target.value)} error={save.field("from_warehouse")}>
            {warehouses.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
          </SelectField>
          <SelectField label={t("To warehouse")} value={target} onChange={(e) => setTarget(e.target.value)} error={save.field("to_warehouse")}>
            <option value="">—</option>
            {warehouses.filter((item) => String(item.id) !== sourceValue && item.warehouse_type !== "transit").map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
          </SelectField>
          <TextField label={t("Date")} type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={save.field("date")} />
          <div className="sm:col-span-2">
            <TextAreaField label={t("Note")} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">{t("Lines")}</h3>
              <p className="text-sm text-ink-soft">Only free stock (available minus reserved) can be sent.</p>
            </div>
            <Button variant="secondary" onClick={() => setLines([...lines, newLine()])}>
              <Plus aria-hidden className="size-4" />
              {t("Add line")}
            </Button>
          </div>
          <div className="overflow-visible rounded-xl border border-line">
            <table className="w-full table-fixed text-sm">
              <colgroup><col className="w-[70%]" /><col /><col className="w-12" /></colgroup>
              <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
                <tr>
                  <th scope="col" className="px-3 py-2.5 text-start font-medium">{t("Product")}</th>
                  <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Quantity")}</th>
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
                      <input aria-label={`${t("Quantity")} ${index + 1}`} inputMode="decimal" value={line.quantity} onChange={(e) => setLine(index, { quantity: e.target.value })} className={`${LINE_INPUT} text-end tabular-nums`} />
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

/** A sent transfer: shows progress and lets the receiving side book quantities in. */
function Viewer({ doc, onDone }: { doc: Transfer; onDone: () => void }) {
  const { can, locale, t } = useWorkspace();
  const receivable = doc.status === "in_transit" || doc.status === "partial";
  const [date, setDate] = useState(today());
  const [received, setReceived] = useState<Record<number, string>>(() =>
    Object.fromEntries(doc.lines.map((line) => [line.id!, receivable ? qty(String(Number(line.quantity) - Number(line.received_quantity ?? 0))) : ""])),
  );
  const action = useAction();
  const receive = () =>
    action.run(async () => {
      await api.post(`/inventory/transfers/${doc.id}/receive`, { date, quantities: received });
      onDone();
    });
  const canReceive = receivable && can("inventory.transfer.receive");

  return (
    <Drawer open large wide onClose={onDone} title={doc.number} action={<DocStatus status={doc.status} />}>
      <div className="profile-section flex flex-col gap-6 pb-6">
        <Facts items={[[t("Date"), formatDate(doc.date, locale)], [t("From"), doc.from_warehouse_name], [t("To"), doc.to_warehouse_name], [t("Received"), doc.received_at ? formatDate(doc.received_at, locale) : "—"]]} />
        {doc.note ? <p className="text-[15px]">{doc.note}</p> : null}
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("Product")}</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Sent")}</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Received")}</th>
                {canReceive ? <th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Receive now")}</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {doc.lines.map((line) => {
                const remaining = Number(line.quantity) - Number(line.received_quantity ?? 0);
                return (
                  <tr key={line.id}>
                    <td className="px-4 py-2.5"><span className="font-mono text-xs text-ink-soft">{line.sku}</span> <span className="font-medium">{line.product_name}</span></td>
                    <td className="px-4 py-2.5 text-end tabular-nums">{qty(line.quantity)} {line.uom}</td>
                    <td className="px-4 py-2.5 text-end tabular-nums">{qty(line.received_quantity ?? "0")}</td>
                    {canReceive ? (
                      <td className="px-4 py-2.5 text-end">
                        <input aria-label={`${t("Receive now")} ${line.sku}`} inputMode="decimal" disabled={remaining <= 0} value={received[line.id!] ?? ""} onChange={(e) => setReceived({ ...received, [line.id!]: e.target.value })} className={`${LINE_INPUT} w-28 text-end tabular-nums`} />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {canReceive ? (
          <section className="border-t border-line pt-6">
            <h3 className="text-base font-bold">{t("Receive")}</h3>
            <p className="mt-1 text-sm text-ink-soft">Enter what arrived. Anything not yet received stays in transit; you can receive the rest later.</p>
            <div className="mt-3"><ErrorBanner error={action.error} /></div>
            <div className="mt-3 flex items-end gap-3">
              <div className="w-48"><TextField label={t("Date")} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <Button pending={action.pending} onClick={receive}>
                <PackageCheck aria-hidden className="size-4" />
                {t("Receive")}
              </Button>
            </div>
          </section>
        ) : null}
      </div>
    </Drawer>
  );
}

export default function TransfersPage() {
  const { locale } = useWorkspace();
  return (
    <DocumentList<Transfer>
      title="Transfers"
      description="Move stock between warehouses: Send takes it out and shows it in transit; Receive books it in at the destination, in full or in parts."
      endpoint="/inventory/transfers"
      createPermission="inventory.transfer.create"
      newLabel="New transfer"
      statuses={[["draft", "Draft"], ["in_transit", "In transit"], ["partial", "Partly received"], ["received", "Received"]]}
      columns={[
        { label: "Date", render: (row) => <span className="tabular-nums">{formatDate(row.date, locale)}</span> },
        { label: "Number", render: (row) => <span className="font-mono text-xs">{row.number || "—"}</span> },
        {
          label: "Route",
          render: (row) => (
            <span className="inline-flex items-center gap-2">
              {row.from_warehouse_name}
              <ArrowRight aria-hidden className="size-4 text-ink-soft rtl:-scale-x-100" />
              {row.to_warehouse_name}
            </span>
          ),
        },
        { label: "Lines", render: (row) => row.lines.length, align: "end" },
        { label: "Status", render: (row) => <DocStatus status={row.status} /> },
      ]}
      renderOpen={(open, close) =>
        open === "new" ? <Editor onDone={close} /> : open.status === "draft" ? <Editor key={open.id} doc={open} onDone={close} /> : <Viewer key={open.id} doc={open} onDone={close} />
      }
    />
  );
}
