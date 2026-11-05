"use client";

import { FileCheck, Send, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CustomerPicker } from "@/components/customer-picker";
import { DocumentList, Facts } from "@/components/document-list";
import { type LineDraft, SalesLinesEditor, SalesLinesView, fromSalesLines, newLine, toPayload, useSalesDefaults } from "@/components/sales-lines";
import { Button, Drawer, ErrorBanner, SelectField, TextAreaField, TextField } from "@/components/ui";
import { api, idOrNull } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import { decimalsOf, formatAmount } from "@/lib/money";
import { SalesStatus, today } from "@/lib/sales";
import type { Currency, Customer, Page, Quotation } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function Editor({ doc, onDone }: { doc?: Quotation; onDone: () => void }) {
  const { company, branch, branches, can, name, t } = useWorkspace();
  const currencies = useResource<Page<Currency>>("/organization/currencies?page_size=500&is_active=true");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(doc?.customer ?? null);
  const [branchId, setBranchId] = useState(doc ? String(doc.branch) : branch ? String(branch.id) : branches[0] ? String(branches[0].id) : "");
  const [date, setDate] = useState(doc?.date ?? today());
  const [validUntil, setValidUntil] = useState(doc?.valid_until ?? "");
  const [currency, setCurrency] = useState(doc?.currency ?? company.currency);
  const [reference, setReference] = useState(doc?.reference ?? "");
  const [notes, setNotes] = useState(doc?.notes ?? "");
  const { settings, priceList } = useSalesDefaults(customer?.price_list);
  const defaultTax = settings ? String(Number(settings.default_tax_rate)) : "0";
  const [lines, setLines] = useState<LineDraft[]>(doc?.lines.length ? fromSalesLines(doc.lines) : [newLine(defaultTax)]);
  const save = useAction();
  const remove = useAction();

  const payload = () => ({
    company: company.id, branch: idOrNull(branchId), customer: customerId, date, valid_until: validUntil || null,
    currency, reference, notes, price_list: priceList?.id ?? null, lines: toPayload(lines),
  });
  const persist = async () => (doc ? api.patch<Quotation>(`/sales/quotations/${doc.id}`, payload()) : api.post<Quotation>("/sales/quotations", payload()));
  const saveDraft = () => save.run(async () => { await persist(); onDone(); });
  const saveAndSend = () =>
    save.run(async () => {
      const saved = await persist();
      await api.post(`/sales/quotations/${saved.id}/send`);
      onDone();
    });
  const destroy = () =>
    remove.run(async () => {
      if (!doc || !window.confirm("Delete this draft quotation?")) return;
      await api.delete(`/sales/quotations/${doc.id}`);
      onDone();
    });

  const formId = "quotation-form";
  return (
    <Drawer
      open
      large
      wide
      onClose={onDone}
      title={doc ? t("Draft quotation") : t("New quotation")}
      footer={
        <div className="flex items-center gap-2">
          {doc && can("sales.quotation.delete") ? <Button variant="danger" pending={remove.pending} onClick={destroy}>{t("Delete")}</Button> : null}
          <span className="flex-1" />
          <Button variant="secondary" onClick={onDone}>{t("Cancel")}</Button>
          <Button variant="secondary" type="submit" form={formId} pending={save.pending}>{t("Save draft")}</Button>
          <Button pending={save.pending} onClick={saveAndSend}>
            <Send aria-hidden className="size-4" />
            {t("Send")}
          </Button>
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
          </div>
          <SelectField label={t("Branch")} value={branchId} onChange={(e) => setBranchId(e.target.value)} error={save.field("branch")}>
            {branches.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
          </SelectField>
          <TextField label={t("Date")} type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={save.field("date")} />
          <TextField label={t("Valid until")} type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} hint={`Empty = ${settings?.quotation_valid_days ?? 30} days from the date.`} />
          <SelectField label={t("Currency")} value={currency} onChange={(e) => setCurrency(e.target.value)} error={save.field("exchange_rate")}>
            {(currencies.data?.results ?? []).map((item) => <option key={item.code} value={item.code}>{item.code} · {name(item)}</option>)}
          </SelectField>
          <TextField label={t("Reference")} value={reference} onChange={(e) => setReference(e.target.value)} hint="Customer enquiry or site name" />
          <TextField label={t("Price list")} value={priceList ? name(priceList) : "—"} disabled hint="From the customer, or the company default." />
          <div className="sm:col-span-2"><TextAreaField label={t("Notes")} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <SalesLinesEditor lines={lines} onChange={setLines} currency={currency} priceListId={priceList?.id ?? null} defaultTax={defaultTax} error={save.field("lines")} />
      </form>
    </Drawer>
  );
}

function Viewer({ doc, onDone }: { doc: Quotation; onDone: () => void }) {
  const { can, locale, t } = useWorkspace();
  const router = useRouter();
  const action = useAction();
  const decimals = decimalsOf(doc.currency);
  const convertible = ["draft", "sent", "accepted"].includes(doc.status) && !doc.invoice;

  const convert = () =>
    action.run(async () => {
      const invoice = await api.post<{ id: number }>(`/sales/quotations/${doc.id}/convert`);
      onDone();
      router.push(`/sales/invoices?open=${invoice.id}`);
    });
  const cancel = () =>
    action.run(async () => {
      if (!window.confirm("Cancel this quotation?")) return;
      await api.post(`/sales/quotations/${doc.id}/cancel`);
      onDone();
    });

  return (
    <Drawer open large wide onClose={onDone} title={doc.number} action={<SalesStatus status={doc.status} />}>
      <div className="profile-section flex flex-col gap-6 pb-6">
        <Facts items={[[t("Customer"), doc.customer_name], [t("Date"), formatDate(doc.date, locale)], [t("Valid until"), formatDate(doc.valid_until, locale)], [t("Branch"), doc.branch_name]]} />
        {doc.invoice_number ? <p className="text-sm text-ink-soft">{t("Invoice")}: <span className="font-mono text-ink">{doc.invoice_number}</span></p> : null}
        {doc.notes ? <p className="text-[15px]">{doc.notes}</p> : null}
        <SalesLinesView lines={doc.lines} currency={doc.currency} />
        <p className="text-end text-lg font-semibold tabular-nums">{t("Grand total")}: {formatAmount(doc.total, decimals)} {doc.currency}</p>
        <ErrorBanner error={action.error} />
        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-5">
          {["draft", "sent", "accepted"].includes(doc.status) && can("sales.quotation.update") ? (
            <Button variant="ghost" pending={action.pending} onClick={cancel}>
              <XCircle aria-hidden className="size-4" />
              {t("Cancel quotation")}
            </Button>
          ) : null}
          {convertible && can("sales.invoice.create") ? (
            <Button pending={action.pending} onClick={convert}>
              <FileCheck aria-hidden className="size-4" />
              {t("Convert to invoice")}
            </Button>
          ) : null}
        </div>
      </div>
    </Drawer>
  );
}

export default function QuotationsPage() {
  const { locale } = useWorkspace();
  return (
    <DocumentList<Quotation>
      title="Quotations"
      description="Prepare a quotation for a customer, send it, and turn it into an invoice with one click."
      endpoint="/sales/quotations"
      createPermission="sales.quotation.create"
      newLabel="New quotation"
      statuses={[["draft", "Draft"], ["sent", "Sent"], ["accepted", "Accepted"], ["invoiced", "Invoiced"], ["cancelled", "Cancelled"]]}
      columns={[
        { label: "Date", render: (row) => <span className="tabular-nums">{formatDate(row.date, locale)}</span> },
        { label: "Number", render: (row) => <span className="font-mono text-xs">{row.number || "—"}</span> },
        { label: "Customer", render: (row) => <span className="font-medium">{row.customer_name}</span> },
        { label: "Branch", render: (row) => row.branch_name },
        { label: "Total", render: (row) => `${formatAmount(row.total, decimalsOf(row.currency))} ${row.currency}`, align: "end" },
        { label: "Status", render: (row) => <SalesStatus status={row.status} /> },
      ]}
      renderOpen={(open, close) =>
        open === "new" ? <Editor onDone={close} /> : open.status === "draft" ? <Editor key={open.id} doc={open} onDone={close} /> : <Viewer key={open.id} doc={open} onDone={close} />
      }
    />
  );
}
