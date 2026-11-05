"use client";

import { Banknote, Truck, Undo2, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { CustomerPicker } from "@/components/customer-picker";
import { DocumentList, Facts } from "@/components/document-list";
import { type LineDraft, SalesLinesEditor, SalesLinesView, fromSalesLines, newLine, toPayload, useSalesDefaults } from "@/components/sales-lines";
import { Button, Drawer, ErrorBanner, Loading, SelectField, TextAreaField, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import { qty, useWarehouses } from "@/lib/inventory";
import { decimalsOf, formatAmount } from "@/lib/money";
import { DeliveryStatus, SalesStatus, today } from "@/lib/sales";
import type { Currency, Customer, CustomerBalance, Invoice, Page } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function Editor({ doc, onDone }: { doc?: Invoice; onDone: () => void }) {
  const { company, branch, branches, can, name, t } = useWorkspace();
  const warehouses = useWarehouses();
  const currencies = useResource<Page<Currency>>("/organization/currencies?page_size=500&is_active=true");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(doc?.customer ?? null);
  const balance = useResource<CustomerBalance>(customerId ? `/sales/customers/${customerId}/balance` : null);
  const [branchId, setBranchId] = useState(doc ? String(doc.branch) : branch ? String(branch.id) : branches[0] ? String(branches[0].id) : "");
  const [warehouse, setWarehouse] = useState(doc?.warehouse ? String(doc.warehouse) : "");
  const [date, setDate] = useState(doc?.date ?? today());
  const [dueDate, setDueDate] = useState(doc?.due_date ?? "");
  const [currency, setCurrency] = useState(doc?.currency ?? company.currency);
  const [reference, setReference] = useState(doc?.reference ?? "");
  const [notes, setNotes] = useState(doc?.notes ?? "");
  const { settings, priceList } = useSalesDefaults(customer?.price_list);
  const defaultTax = settings ? String(Number(settings.default_tax_rate)) : "0";
  const [lines, setLines] = useState<LineDraft[]>(doc?.lines.length ? fromSalesLines(doc.lines) : [newLine(defaultTax)]);
  const save = useAction();
  const remove = useAction();
  const decimals = decimalsOf(company.currency);

  const payload = () => ({
    company: company.id, branch: Number(branchId), customer: customerId, date, due_date: dueDate || null, warehouse: warehouse ? Number(warehouse) : null,
    currency, reference, notes, lines: toPayload(lines),
  });
  const persist = async () => (doc ? api.patch<Invoice>(`/sales/invoices/${doc.id}`, payload()) : api.post<Invoice>("/sales/invoices", payload()));
  const saveDraft = () => save.run(async () => { await persist(); onDone(); });
  const saveAndPost = () =>
    save.run(async () => {
      const saved = await persist();
      await api.post(`/sales/invoices/${saved.id}/post`);
      onDone();
    });
  const destroy = () =>
    remove.run(async () => {
      if (!doc || !window.confirm("Delete this draft invoice?")) return;
      await api.delete(`/sales/invoices/${doc.id}`);
      onDone();
    });

  const formId = "invoice-form";
  return (
    <Drawer
      open
      large
      wide
      onClose={onDone}
      title={doc ? t("Draft invoice") : t("New invoice")}
      footer={
        <div className="flex items-center gap-2">
          {doc && can("sales.invoice.delete") ? <Button variant="danger" pending={remove.pending} onClick={destroy}>{t("Delete")}</Button> : null}
          <span className="flex-1" />
          <Button variant="secondary" onClick={onDone}>{t("Cancel")}</Button>
          <Button variant="secondary" type="submit" form={formId} pending={save.pending}>{t("Save draft")}</Button>
          {can("sales.invoice.post") ? <Button pending={save.pending} onClick={saveAndPost}>{t("Post")}</Button> : null}
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit(saveDraft)} className="profile-section flex flex-col gap-5 pb-6">
        <ErrorBanner error={save.error ?? remove.error} />
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {doc && !customer ? (
              <TextField label={t("Customer")} value={doc.customer_name} disabled />
            ) : (
              <CustomerPicker label={t("Customer")} value={customer} error={save.field("customer")} onChange={(picked) => { setCustomer(picked); setCustomerId(picked?.id ?? null); }} />
            )}
            {balance.data ? (
              <p className="mt-1.5 text-sm text-ink-soft tabular-nums">
                {t("Amount due")}: <span className={Number(balance.data.amount_due) > 0 ? "font-medium text-warning" : "text-ink"}>{formatAmount(balance.data.amount_due, decimals)} {company.currency}</span>
                {Number(balance.data.advances) > 0 ? <> · {t("Advance")}: <span className="text-ink">{formatAmount(balance.data.advances, decimals)}</span></> : null}
                {Number(balance.data.credit_limit) > 0 ? <> · {t("Credit limit")}: {formatAmount(balance.data.credit_limit, decimals)}</> : null}
              </p>
            ) : null}
          </div>
          <SelectField label={t("Branch")} value={branchId} onChange={(e) => setBranchId(e.target.value)} error={save.field("branch")}>
            {branches.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
          </SelectField>
          <SelectField label={t("Deliver from")} value={warehouse} onChange={(e) => setWarehouse(e.target.value)} hint="Default warehouse for delivery notes.">
            <option value="">—</option>
            {warehouses.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
          </SelectField>
          <TextField label={t("Date")} type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={save.field("date")} />
          <TextField label={t("Due date")} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} hint="Empty = from the customer's payment terms." />
          <SelectField label={t("Currency")} value={currency} onChange={(e) => setCurrency(e.target.value)} error={save.field("exchange_rate")}>
            {(currencies.data?.results ?? []).map((item) => <option key={item.code} value={item.code}>{item.code} · {name(item)}</option>)}
          </SelectField>
          <TextField label={t("Reference")} value={reference} onChange={(e) => setReference(e.target.value)} hint="Customer PO / LPO" />
          <div className="sm:col-span-2"><TextAreaField label={t("Notes")} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <SalesLinesEditor lines={lines} onChange={setLines} currency={currency} priceListId={priceList?.id ?? null} defaultTax={defaultTax} error={save.field("lines")} />
      </form>
    </Drawer>
  );
}

function Viewer({ doc, onDone }: { doc: Invoice; onDone: () => void }) {
  const { can, locale, t } = useWorkspace();
  const router = useRouter();
  const [cancelDate, setCancelDate] = useState(today());
  const action = useAction();
  const decimals = decimalsOf(doc.currency);
  const open = doc.status === "posted" || doc.status === "partially_paid";
  const money = (value: string) => `${formatAmount(value, decimals)} ${doc.currency}`;

  const cancel = () =>
    action.run(async () => {
      if (!window.confirm("Cancel this invoice? Its accounting entry will be reversed.")) return;
      await api.post(`/sales/invoices/${doc.id}/cancel`, { date: cancelDate });
      onDone();
    });

  return (
    <Drawer open large wide onClose={onDone} title={doc.number} action={<SalesStatus status={doc.status} posted="Unpaid" />}>
      <div className="profile-section flex flex-col gap-6 pb-6">
        <Facts items={[[t("Customer"), doc.customer_name], [t("Date"), formatDate(doc.date, locale)], [t("Due date"), formatDate(doc.due_date, locale)], [t("Branch"), doc.branch_name]]} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[[t("Total"), money(doc.total)], [t("Paid"), money(doc.amount_paid)], [t("Credited"), money(doc.amount_credited)], [t("Amount due"), money(doc.amount_due)]].map(([label, value], index) => (
            <div key={label} className={`rounded-xl border border-line p-3 ${index === 3 ? "bg-surface-muted/40" : ""}`}>
              <p className="text-xs text-ink-soft">{label}</p>
              <p className={`mt-0.5 font-semibold tabular-nums ${index === 3 && Number(doc.amount_due) > 0 ? "text-warning" : ""}`}>{value}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-soft">
          <span>{t("Delivery")}: <DeliveryStatus status={doc.delivery_status} /></span>
          {doc.quotation_number ? <span>{t("Quotation")}: <span className="font-mono text-ink">{doc.quotation_number}</span></span> : null}
          {doc.journal_number ? <span>{t("Journal entry")}: <span className="font-mono text-ink">{doc.journal_number}</span></span> : null}
          {doc.reference ? <span>{t("Reference")}: <span className="text-ink">{doc.reference}</span></span> : null}
        </div>
        {doc.notes ? <p className="text-[15px]">{doc.notes}</p> : null}
        <SalesLinesView
          lines={doc.lines}
          currency={doc.currency}
          extra={(line) => {
            const invoiceLine = line as Invoice["lines"][number];
            return invoiceLine.product_type === "stock" ? `${qty(invoiceLine.delivered_quantity ?? "0")} / ${qty(line.quantity)}` : "—";
          }}
        />
        <ErrorBanner error={action.error} />
        {open ? (
          <div className="flex flex-wrap items-end justify-end gap-2 border-t border-line pt-5">
            {can("sales.invoice.cancel") && doc.status === "posted" && doc.delivery_status !== "delivered" && doc.delivery_status !== "partial" ? (
              <>
                <div className="w-40"><TextField label={t("Cancel on")} type="date" value={cancelDate} onChange={(e) => setCancelDate(e.target.value)} /></div>
                <Button variant="ghost" pending={action.pending} onClick={cancel}>
                  <XCircle aria-hidden className="size-4" />
                  {t("Cancel invoice")}
                </Button>
                <span className="flex-1" />
              </>
            ) : null}
            {can("sales.credit_note.create") ? (
              <Button variant="secondary" onClick={() => { onDone(); router.push(`/sales/credit-notes?invoice=${doc.id}`); }}>
                <Undo2 aria-hidden className="size-4" />
                {t("Credit note")}
              </Button>
            ) : null}
            {can("sales.delivery.create") && (doc.delivery_status === "pending" || doc.delivery_status === "partial") ? (
              <Button variant="secondary" onClick={() => { onDone(); router.push(`/sales/deliveries?invoice=${doc.id}`); }}>
                <Truck aria-hidden className="size-4" />
                {t("Deliver")}
              </Button>
            ) : null}
            {can("sales.receipt.create") && Number(doc.amount_due) > 0 ? (
              <Button onClick={() => { onDone(); router.push(`/sales/receipts?invoice=${doc.id}`); }}>
                <Banknote aria-hidden className="size-4" />
                {t("Record payment")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}

function InvoicesList() {
  const { locale } = useWorkspace();
  const params = useSearchParams();
  const openId = params.get("open");
  const requested = useResource<Invoice>(openId ? `/sales/invoices/${openId}` : null);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const initial = requested.data && requested.data.id !== dismissed ? requested.data : null;

  return (
    <>
      <DocumentList<Invoice>
        title="Invoices"
        description="Post an invoice to book the sale; then deliver the goods and record the payment from the invoice itself."
        endpoint="/sales/invoices"
        createPermission="sales.invoice.create"
        newLabel="New invoice"
        statuses={[["draft", "Draft"], ["posted", "Unpaid"], ["partially_paid", "Partly paid"], ["paid", "Paid"], ["cancelled", "Cancelled"]]}
        columns={[
          { label: "Date", render: (row) => <span className="tabular-nums">{formatDate(row.date, locale)}</span> },
          { label: "Number", render: (row) => <span className="font-mono text-xs">{row.number || "—"}</span> },
          { label: "Customer", render: (row) => <span className="font-medium">{row.customer_name}</span> },
          { label: "Total", render: (row) => `${formatAmount(row.total, decimalsOf(row.currency))} ${row.currency}`, align: "end" },
          { label: "Amount due", render: (row) => <span className={Number(row.amount_due) > 0 && row.status !== "draft" ? "font-medium text-warning" : ""}>{formatAmount(row.amount_due, decimalsOf(row.currency))}</span>, align: "end" },
          { label: "Delivery", render: (row) => <DeliveryStatus status={row.delivery_status} /> },
          { label: "Status", render: (row) => <SalesStatus status={row.status} posted="Unpaid" /> },
        ]}
        renderOpen={(open, close) =>
          open === "new" ? <Editor onDone={close} /> : open.status === "draft" ? <Editor key={open.id} doc={open} onDone={close} /> : <Viewer key={open.id} doc={open} onDone={close} />
        }
      />
      {initial ? (
        initial.status === "draft" ? <Editor key={`q-${initial.id}`} doc={initial} onDone={() => { setDismissed(initial.id); window.history.replaceState(null, "", "/sales/invoices"); }} /> : <Viewer key={`q-${initial.id}`} doc={initial} onDone={() => { setDismissed(initial.id); window.history.replaceState(null, "", "/sales/invoices"); }} />
      ) : null}
    </>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <InvoicesList />
    </Suspense>
  );
}
