"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { DocumentList, Facts } from "@/components/document-list";
import { SupplierPicker } from "@/components/supplier-picker";
import { Button, Drawer, ErrorBanner, Loading, SelectField, TextAreaField, TextField } from "@/components/ui";
import { api, idOrNull, withQuery } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import { LINE_INPUT } from "@/lib/inventory";
import { decimalsOf, formatAmount, toMinor } from "@/lib/money";
import { PAYMENT_METHODS, PurchaseStatus } from "@/lib/purchasing";
import { today, useMoneyJournals } from "@/lib/sales";
import type { Page, Supplier, SupplierBill, SupplierPayment } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function Editor({ doc, presetBill, onDone }: { doc?: SupplierPayment; presetBill?: SupplierBill | null; onDone: () => void }) {
  const { company, can, name, t } = useWorkspace();
  const journals = useMoneyJournals();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [supplierId, setSupplierId] = useState<number | null>(doc?.supplier ?? presetBill?.supplier ?? null);
  const supplierName = doc?.supplier_name ?? presetBill?.supplier_name ?? "";
  const [date, setDate] = useState(doc?.date ?? today());
  const [method, setMethod] = useState(doc?.method ?? "bank_transfer");
  const [journal, setJournal] = useState(doc ? String(doc.journal) : "");
  const [reference, setReference] = useState(doc?.reference ?? "");
  const [currency, setCurrency] = useState(doc?.currency ?? presetBill?.currency ?? company.currency);
  const [amount, setAmount] = useState(doc?.amount ? String(Number(doc.amount)) : presetBill ? String(Number(presetBill.amount_due)) : "");
  const [notes, setNotes] = useState(doc?.notes ?? "");
  const decimals = decimalsOf(currency);
  const openBills = useResource<Page<SupplierBill>>(supplierId ? withQuery("/purchasing/bills", { company: company.id, supplier: supplierId, open: "true", page_size: 100 }) : null);
  const [allocations, setAllocations] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const item of doc?.allocations ?? []) initial[item.invoice] = String(Number(item.amount));
    if (presetBill) initial[presetBill.id] = String(Number(presetBill.amount_due));
    return initial;
  });
  const save = useAction();
  const remove = useAction();
  const journalValue = journal || (journals.find((item) => (method === "cash" ? item.journal_type === "cash" : item.journal_type === "bank"))?.id ?? journals[0]?.id ?? "").toString();
  const allocated = Object.values(allocations).reduce((sum, value) => sum + toMinor(value || "0", decimals), 0n);
  const paid = toMinor(amount || "0", decimals);
  const unallocated = paid - allocated;

  const pickSupplier = (picked: Supplier | null) => { setSupplier(picked); setSupplierId(picked?.id ?? null); setAllocations({}); if (picked) setCurrency(picked.currency); };
  const payload = () => ({
    company: company.id, supplier: supplierId, date, method, journal: idOrNull(journalValue), reference, currency, amount: amount || "0", notes,
    allocations: Object.entries(allocations).filter(([, value]) => Number(value) > 0).map(([invoice, value]) => ({ invoice: Number(invoice), amount: value })),
  });
  const persist = async () => (doc ? api.patch<SupplierPayment>(`/purchasing/payments/${doc.id}`, payload()) : api.post<SupplierPayment>("/purchasing/payments", payload()));
  const saveDraft = () => save.run(async () => { await persist(); onDone(); });
  const saveAndPost = () => save.run(async () => { const saved = await persist(); await api.post(`/purchasing/payments/${saved.id}/post`); onDone(); });
  const destroy = () => remove.run(async () => { if (!doc || !window.confirm("Delete this draft payment?")) return; await api.delete(`/purchasing/payments/${doc.id}`); onDone(); });
  const fillRemaining = (bill: SupplierBill) => {
    const others = Object.entries(allocations).filter(([id]) => Number(id) !== bill.id).reduce((sum, [, value]) => sum + toMinor(value || "0", decimals), 0n);
    const room = paid - others;
    const due = toMinor(bill.amount_due, decimals);
    const value = room < due ? room : due;
    setAllocations({ ...allocations, [bill.id]: value > 0n ? formatAmount(value, decimals).replace(/,/g, "") : "" });
  };

  const formId = "payment-form";
  return (
    <Drawer open large wide onClose={onDone} title={doc ? t("Draft supplier payment") : t("New supplier payment")}
      footer={
        <div className="flex items-center gap-2">
          {doc && can("purchasing.payment.delete") ? <Button variant="danger" pending={remove.pending} onClick={destroy}>{t("Delete")}</Button> : null}
          <span className="flex-1" />
          <Button variant="secondary" onClick={onDone}>{t("Cancel")}</Button>
          <Button variant="secondary" type="submit" form={formId} pending={save.pending}>{t("Save draft")}</Button>
          {can("purchasing.payment.post") ? <Button pending={save.pending} onClick={saveAndPost} disabled={unallocated < 0n || paid <= 0n}>{t("Post")}</Button> : null}
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit(saveDraft)} className="profile-section flex flex-col gap-5 pb-6">
        <ErrorBanner error={save.error ?? remove.error} />
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {supplierId && !supplier ? (
              <div className="flex items-end gap-2"><div className="flex-1"><TextField label={t("Supplier")} value={supplierName || String(supplierId)} disabled /></div>{!doc ? <Button variant="secondary" onClick={() => { setSupplierId(null); setAllocations({}); }}>{t("Change")}</Button> : null}</div>
            ) : (
              <SupplierPicker label={t("Supplier")} value={supplier} error={save.field("supplier")} onChange={pickSupplier} />
            )}
          </div>
          <TextField label={`${t("Amount")} (${currency})`} inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} error={save.field("amount")} />
          <TextField label={t("Date")} type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={save.field("date")} />
          <SelectField label={t("Method")} value={method} onChange={(e) => { setMethod(e.target.value as SupplierPayment["method"]); setJournal(""); }}>
            {PAYMENT_METHODS.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
          </SelectField>
          <SelectField label={t("From")} value={journalValue} onChange={(e) => setJournal(e.target.value)} error={save.field("journal")} hint="Bank account or cash drawer.">
            {journals.map((item) => <option key={item.id} value={item.id}>{item.code} · {name(item)}</option>)}
          </SelectField>
          <TextField label={t("Reference")} value={reference} onChange={(e) => setReference(e.target.value)} hint="Transfer, cheque or LC number" />
          <TextField label={t("Currency")} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
          <div className="sm:col-span-2"><TextAreaField label={t("Notes")} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-base font-bold">{t("Allocate to bills")}</h3>
            <span className={`text-sm tabular-nums ${unallocated < 0n ? "font-medium text-danger" : "text-ink-soft"}`}>{unallocated < 0n ? `${t("Over-allocated by")} ${formatAmount(-unallocated, decimals)}` : `${t("Unallocated")}: ${formatAmount(unallocated, decimals)} ${currency}`}</span>
          </div>
          {!supplierId ? <p className="rounded-xl border border-dashed border-line-strong px-4 py-5 text-center text-sm text-ink-soft">{t("Choose a supplier to see their open bills.")}</p> : !openBills.data ? <Loading /> : openBills.data.results.length === 0 ? <p className="rounded-xl border border-dashed border-line-strong px-4 py-5 text-center text-sm text-ink-soft">{t("No open bills. The whole amount will be held as an advance.")}</p> : (
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full table-fixed text-sm">
                <colgroup><col className="w-[22%]" /><col /><col className="w-[18%]" /><col className="w-[18%]" /><col className="w-[22%]" /></colgroup>
                <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
                  <tr><th scope="col" className="px-3 py-2.5 text-start font-medium">{t("Bill")}</th><th scope="col" className="px-3 py-2.5 text-start font-medium">{t("Due date")}</th><th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Total")}</th><th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Due")}</th><th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Allocate")}</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {openBills.data.results.filter((bill) => bill.currency === currency).map((bill) => (
                    <tr key={bill.id}>
                      <td className="px-3 py-2.5"><span className="font-mono text-xs">{bill.number}</span>{bill.supplier_number ? <span className="block text-xs text-ink-soft">{bill.supplier_number}</span> : null}</td>
                      <td className="px-3 py-2.5 tabular-nums">{formatDate(bill.due_date, "en")}</td>
                      <td className="px-3 py-2.5 text-end tabular-nums">{formatAmount(bill.total, decimals)}</td>
                      <td className="px-3 py-2.5 text-end font-medium tabular-nums"><button type="button" className="hover:underline" title={t("Allocate the remaining amount")} onClick={() => fillRemaining(bill)}>{formatAmount(bill.amount_due, decimals)}</button></td>
                      <td className="px-2 py-2"><input aria-label={`${t("Allocate")} ${bill.number}`} inputMode="decimal" value={allocations[bill.id] ?? ""} onChange={(e) => setAllocations({ ...allocations, [bill.id]: e.target.value })} className={`${LINE_INPUT} text-end tabular-nums`} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {save.field("allocations") ? <p className="text-sm text-danger">{save.field("allocations")}</p> : null}
        </section>
      </form>
    </Drawer>
  );
}

function Viewer({ doc, onDone }: { doc: SupplierPayment; onDone: () => void }) {
  const { locale, t } = useWorkspace();
  const decimals = decimalsOf(doc.currency);
  const methodName = Object.fromEntries(PAYMENT_METHODS);
  return (
    <Drawer open large wide onClose={onDone} title={doc.number} action={<PurchaseStatus status={doc.status} posted="Posted" />}>
      <div className="profile-section flex flex-col gap-6 pb-6">
        <Facts items={[[t("Supplier"), doc.supplier_name], [t("Date"), formatDate(doc.date, locale)], [t("Method"), t(methodName[doc.method])], [t("From"), doc.journal_name]]} />
        <div className="grid grid-cols-3 gap-3">
          {[[t("Amount"), doc.amount], [t("Allocated"), doc.allocated_amount], [t("Advance"), doc.unallocated_amount]].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line p-3"><p className="text-xs text-ink-soft">{label}</p><p className="mt-0.5 font-semibold tabular-nums">{formatAmount(value, decimals)} {doc.currency}</p></div>
          ))}
        </div>
        {doc.allocations.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase"><tr><th scope="col" className="px-4 py-2.5 text-start font-medium">{t("Bill")}</th><th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Allocated")}</th></tr></thead>
              <tbody className="divide-y divide-line">
                {doc.allocations.map((item) => <tr key={item.id}><td className="px-4 py-2.5 font-mono text-xs">{item.invoice_number}{item.supplier_number ? <span className="ms-2 font-sans text-ink-soft">{item.supplier_number}</span> : null}</td><td className="px-4 py-2.5 text-end font-medium tabular-nums">{formatAmount(item.amount, decimals)}</td></tr>)}
              </tbody>
            </table>
          </div>
        ) : null}
        <p className="text-sm text-ink-soft">{doc.reference ? <>{t("Reference")}: <span className="text-ink">{doc.reference}</span> · </> : null}{doc.journal_number ? <>{t("Journal entry")}: <span className="font-mono text-ink">{doc.journal_number}</span></> : null}</p>
      </div>
    </Drawer>
  );
}

function PaymentsList() {
  const { locale, t } = useWorkspace();
  const params = useSearchParams();
  const billId = params.get("bill");
  const preset = useResource<SupplierBill>(billId ? `/purchasing/bills/${billId}` : null);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const starter = preset.data && preset.data.id !== dismissed ? preset.data : null;
  const methodName = Object.fromEntries(PAYMENT_METHODS);
  return (
    <>
      <DocumentList<SupplierPayment>
        title="Supplier payments"
        description="Money paid to suppliers by transfer, cheque, cash or letter of credit, allocated to their bills. Unallocated money is held as an advance."
        endpoint="/purchasing/payments"
        createPermission="purchasing.payment.create"
        newLabel="New payment"
        statuses={[["draft", "Draft"], ["posted", "Posted"]]}
        columns={[
          { label: "Date", render: (row) => <span className="tabular-nums">{formatDate(row.date, locale)}</span> },
          { label: "Number", render: (row) => <span className="font-mono text-xs">{row.number || "—"}</span> },
          { label: "Supplier", render: (row) => <span className="font-medium">{row.supplier_name}</span> },
          { label: "Method", render: (row) => t(methodName[row.method]) },
          { label: "Amount", render: (row) => `${formatAmount(row.amount, decimalsOf(row.currency))} ${row.currency}`, align: "end" },
          { label: "Status", render: (row) => <PurchaseStatus status={row.status} posted="Posted" /> },
        ]}
        renderOpen={(open, close) => (open === "new" ? <Editor onDone={close} /> : open.status === "draft" ? <Editor key={open.id} doc={open} onDone={close} /> : <Viewer key={open.id} doc={open} onDone={close} />)}
      />
      {starter ? <Editor key={`from-${starter.id}`} presetBill={starter} onDone={() => { setDismissed(starter.id); window.history.replaceState(null, "", "/purchasing/payments"); }} /> : null}
    </>
  );
}

export default function SupplierPaymentsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PaymentsList />
    </Suspense>
  );
}
