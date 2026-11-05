"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { CustomerPicker } from "@/components/customer-picker";
import { DocumentList, Facts } from "@/components/document-list";
import { Button, Drawer, ErrorBanner, Loading, SelectField, TextAreaField, TextField } from "@/components/ui";
import { api, idOrNull, withQuery } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import { LINE_INPUT } from "@/lib/inventory";
import { decimalsOf, formatAmount, toMinor } from "@/lib/money";
import { METHODS, SalesStatus, today, useMoneyJournals } from "@/lib/sales";
import type { Customer, Invoice, Page, Receipt } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function Editor({ doc, presetInvoice, onDone }: { doc?: Receipt; presetInvoice?: Invoice | null; onDone: () => void }) {
  const { company, branch, branches, can, name, t } = useWorkspace();
  const journals = useMoneyJournals();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(doc?.customer ?? presetInvoice?.customer ?? null);
  const customerName = doc?.customer_name ?? presetInvoice?.customer_name ?? "";
  const [branchId, setBranchId] = useState(doc ? String(doc.branch) : presetInvoice ? String(presetInvoice.branch) : branch ? String(branch.id) : branches[0] ? String(branches[0].id) : "");
  const [date, setDate] = useState(doc?.date ?? today());
  const [method, setMethod] = useState(doc?.method ?? "cash");
  const [journal, setJournal] = useState(doc ? String(doc.journal) : "");
  const [reference, setReference] = useState(doc?.reference ?? "");
  const [amount, setAmount] = useState(doc?.amount ? String(Number(doc.amount)) : presetInvoice ? String(Number(presetInvoice.amount_due)) : "");
  const [notes, setNotes] = useState(doc?.notes ?? "");
  const currency = doc?.currency ?? presetInvoice?.currency ?? company.currency;
  const decimals = decimalsOf(currency);
  const openInvoices = useResource<Page<Invoice>>(customerId ? withQuery("/sales/invoices", { company: company.id, customer: customerId, open: "true", page_size: 100 }) : null);
  const [allocations, setAllocations] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const item of doc?.allocations ?? []) initial[item.invoice] = String(Number(item.amount));
    if (presetInvoice) initial[presetInvoice.id] = String(Number(presetInvoice.amount_due));
    return initial;
  });
  const save = useAction();
  const remove = useAction();

  // Cash methods default to the cash journal, the rest to the bank journal.
  const journalValue = journal || (journals.find((item) => (method === "cash" ? item.journal_type === "cash" : item.journal_type === "bank"))?.id ?? journals[0]?.id ?? "").toString();
  const allocated = Object.values(allocations).reduce((sum, value) => sum + toMinor(value || "0", decimals), 0n);
  const received = toMinor(amount || "0", decimals);
  const unallocated = received - allocated;

  const payload = () => ({
    company: company.id, branch: idOrNull(branchId), customer: customerId, date, method, journal: idOrNull(journalValue), reference, currency, amount: amount || "0", notes,
    allocations: Object.entries(allocations).filter(([, value]) => Number(value) > 0).map(([invoice, value]) => ({ invoice: Number(invoice), amount: value })),
  });
  const persist = async () => (doc ? api.patch<Receipt>(`/sales/receipts/${doc.id}`, payload()) : api.post<Receipt>("/sales/receipts", payload()));
  const saveDraft = () => save.run(async () => { await persist(); onDone(); });
  const saveAndPost = () => save.run(async () => { const saved = await persist(); await api.post(`/sales/receipts/${saved.id}/post`); onDone(); });
  const destroy = () => remove.run(async () => { if (!doc || !window.confirm("Delete this draft receipt?")) return; await api.delete(`/sales/receipts/${doc.id}`); onDone(); });
  const fillRemaining = (invoice: Invoice) => {
    const others = Object.entries(allocations).filter(([id]) => Number(id) !== invoice.id).reduce((sum, [, value]) => sum + toMinor(value || "0", decimals), 0n);
    const room = received - others;
    const due = toMinor(invoice.amount_due, decimals);
    const value = room < due ? room : due;
    setAllocations({ ...allocations, [invoice.id]: value > 0n ? formatAmount(value, decimals).replace(/,/g, "") : "" });
  };

  const formId = "receipt-form";
  return (
    <Drawer
      open
      large
      wide
      onClose={onDone}
      title={doc ? t("Draft receipt") : t("New receipt")}
      footer={
        <div className="flex items-center gap-2">
          {doc && can("sales.receipt.delete") ? <Button variant="danger" pending={remove.pending} onClick={destroy}>{t("Delete")}</Button> : null}
          <span className="flex-1" />
          <Button variant="secondary" onClick={onDone}>{t("Cancel")}</Button>
          <Button variant="secondary" type="submit" form={formId} pending={save.pending}>{t("Save draft")}</Button>
          {can("sales.receipt.post") ? <Button pending={save.pending} onClick={saveAndPost} disabled={unallocated < 0n || received <= 0n}>{t("Post")}</Button> : null}
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit(saveDraft)} className="profile-section flex flex-col gap-5 pb-6">
        <ErrorBanner error={save.error ?? remove.error} />
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {customerId && !customer ? (
              <div className="flex items-end gap-2">
                <div className="flex-1"><TextField label={t("Customer")} value={customerName} disabled /></div>
                {!doc ? <Button variant="secondary" onClick={() => { setCustomerId(null); setAllocations({}); }}>{t("Change")}</Button> : null}
              </div>
            ) : (
              <CustomerPicker label={t("Customer")} value={customer} error={save.field("customer")} onChange={(picked) => { setCustomer(picked); setCustomerId(picked?.id ?? null); setAllocations({}); }} />
            )}
          </div>
          <TextField label={`${t("Amount")} (${currency})`} inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} error={save.field("amount")} />
          <TextField label={t("Date")} type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={save.field("date")} />
          <SelectField label={t("Method")} value={method} onChange={(e) => { setMethod(e.target.value as Receipt["method"]); setJournal(""); }}>
            {METHODS.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
          </SelectField>
          <SelectField label={t("Into")} value={journalValue} onChange={(e) => setJournal(e.target.value)} error={save.field("journal")} hint="Cash drawer or bank account.">
            {journals.map((item) => <option key={item.id} value={item.id}>{item.code} · {name(item)}</option>)}
          </SelectField>
          <SelectField label={t("Branch")} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {branches.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
          </SelectField>
          <TextField label={t("Reference")} value={reference} onChange={(e) => setReference(e.target.value)} hint="Cheque or transaction number" />
          <div className="sm:col-span-2"><TextAreaField label={t("Notes")} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-base font-bold">{t("Allocate to invoices")}</h3>
            <span className={`text-sm tabular-nums ${unallocated < 0n ? "font-medium text-danger" : "text-ink-soft"}`}>
              {unallocated < 0n ? `${t("Over-allocated by")} ${formatAmount(-unallocated, decimals)}` : `${t("Unallocated")}: ${formatAmount(unallocated, decimals)} ${currency}`}
            </span>
          </div>
          {!customerId ? (
            <p className="rounded-xl border border-dashed border-line-strong px-4 py-5 text-center text-sm text-ink-soft">{t("Choose a customer to see their open invoices.")}</p>
          ) : !openInvoices.data ? (
            <Loading />
          ) : openInvoices.data.results.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line-strong px-4 py-5 text-center text-sm text-ink-soft">{t("No open invoices. The whole amount will be held as an advance.")}</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full table-fixed text-sm">
                <colgroup><col className="w-[22%]" /><col /><col className="w-[18%]" /><col className="w-[18%]" /><col className="w-[22%]" /></colgroup>
                <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">{t("Invoice")}</th>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">{t("Date")}</th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Total")}</th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Due")}</th>
                    <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Allocate")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {openInvoices.data.results.filter((inv) => inv.currency === currency).map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-3 py-2.5 font-mono text-xs">{invoice.number}</td>
                      <td className="px-3 py-2.5 tabular-nums">{formatDate(invoice.date, "en")}</td>
                      <td className="px-3 py-2.5 text-end tabular-nums">{formatAmount(invoice.total, decimals)}</td>
                      <td className="px-3 py-2.5 text-end font-medium tabular-nums">
                        <button type="button" className="hover:underline" title={t("Allocate the remaining amount")} onClick={() => fillRemaining(invoice)}>{formatAmount(invoice.amount_due, decimals)}</button>
                      </td>
                      <td className="px-2 py-2">
                        <input aria-label={`${t("Allocate")} ${invoice.number}`} inputMode="decimal" value={allocations[invoice.id] ?? ""} onChange={(e) => setAllocations({ ...allocations, [invoice.id]: e.target.value })} className={`${LINE_INPUT} text-end tabular-nums`} />
                      </td>
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

function Viewer({ doc, onDone }: { doc: Receipt; onDone: () => void }) {
  const { locale, t } = useWorkspace();
  const decimals = decimalsOf(doc.currency);
  const methodName = Object.fromEntries(METHODS);
  return (
    <Drawer open large wide onClose={onDone} title={doc.number} action={<SalesStatus status={doc.status} posted="Posted" />}>
      <div className="profile-section flex flex-col gap-6 pb-6">
        <Facts items={[[t("Customer"), doc.customer_name], [t("Date"), formatDate(doc.date, locale)], [t("Method"), t(methodName[doc.method])], [t("Into"), doc.journal_code]]} />
        <div className="grid grid-cols-3 gap-3">
          {[[t("Amount"), doc.amount], [t("Allocated"), doc.allocated_amount], [t("Advance"), doc.unallocated_amount]].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line p-3"><p className="text-xs text-ink-soft">{label}</p><p className="mt-0.5 font-semibold tabular-nums">{formatAmount(value, decimals)} {doc.currency}</p></div>
          ))}
        </div>
        {doc.allocations.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
                <tr><th scope="col" className="px-4 py-2.5 text-start font-medium">{t("Invoice")}</th><th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Allocated")}</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {doc.allocations.map((item) => (
                  <tr key={item.id}><td className="px-4 py-2.5 font-mono text-xs">{item.invoice_number}</td><td className="px-4 py-2.5 text-end font-medium tabular-nums">{formatAmount(item.amount, decimals)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <p className="text-sm text-ink-soft">
          {doc.reference ? <>{t("Reference")}: <span className="text-ink">{doc.reference}</span> · </> : null}
          {doc.journal_number ? <>{t("Journal entry")}: <span className="font-mono text-ink">{doc.journal_number}</span></> : null}
        </p>
      </div>
    </Drawer>
  );
}

function ReceiptsList() {
  const { locale, t } = useWorkspace();
  const params = useSearchParams();
  const invoiceId = params.get("invoice");
  const preset = useResource<Invoice>(invoiceId ? `/sales/invoices/${invoiceId}` : null);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const starter = preset.data && preset.data.id !== dismissed ? preset.data : null;
  const methodName = Object.fromEntries(METHODS);

  return (
    <>
      <DocumentList<Receipt>
        title="Receipts"
        description="Money received from customers by cash, KNET, card, transfer or cheque, allocated to their invoices. Unallocated money is held as an advance."
        endpoint="/sales/receipts"
        createPermission="sales.receipt.create"
        newLabel="New receipt"
        statuses={[["draft", "Draft"], ["posted", "Posted"]]}
        columns={[
          { label: "Date", render: (row) => <span className="tabular-nums">{formatDate(row.date, locale)}</span> },
          { label: "Number", render: (row) => <span className="font-mono text-xs">{row.number || "—"}</span> },
          { label: "Customer", render: (row) => <span className="font-medium">{row.customer_name}</span> },
          { label: "Method", render: (row) => t(methodName[row.method]) },
          { label: "Amount", render: (row) => `${formatAmount(row.amount, decimalsOf(row.currency))} ${row.currency}`, align: "end" },
          { label: "Status", render: (row) => <SalesStatus status={row.status} posted="Posted" /> },
        ]}
        renderOpen={(open, close) => (open === "new" ? <Editor onDone={close} /> : open.status === "draft" ? <Editor key={open.id} doc={open} onDone={close} /> : <Viewer key={open.id} doc={open} onDone={close} />)}
      />
      {starter ? <Editor key={`from-${starter.id}`} presetInvoice={starter} onDone={() => { setDismissed(starter.id); window.history.replaceState(null, "", "/sales/receipts"); }} /> : null}
    </>
  );
}

export default function ReceiptsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ReceiptsList />
    </Suspense>
  );
}
