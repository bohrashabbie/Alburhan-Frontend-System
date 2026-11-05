"use client";

import { useState } from "react";

import { Button, Card, ErrorBanner, Loading, PageHeader, TextAreaField, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import type { SalesSettings } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function Form({ settings }: { settings: SalesSettings }) {
  const { company, can, t } = useWorkspace();
  const editable = can("sales.settings.update");
  const [values, setValues] = useState({
    default_tax_rate: String(Number(settings.default_tax_rate)),
    quotation_valid_days: String(settings.quotation_valid_days),
    default_payment_terms_days: String(settings.default_payment_terms_days),
    max_line_discount_percent: String(Number(settings.max_line_discount_percent)),
    invoice_notes: settings.invoice_notes,
  });
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const set = (key: keyof typeof values) => (event: { target: { value: string } }) => {
    setValues({ ...values, [key]: event.target.value });
    setSaved(false);
  };
  const save = () => action.run(async () => { await api.patch(`/sales/settings/${company.id}`, values); setSaved(true); });

  return (
    <form onSubmit={onSubmit(save)} className="flex max-w-3xl flex-col gap-4">
      <ErrorBanner error={action.error} hideFields />
      <Card title={t("Tax and terms")}>
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <TextField label={t("Default VAT %")} inputMode="decimal" disabled={!editable} value={values.default_tax_rate} onChange={set("default_tax_rate")} error={action.field("default_tax_rate")} hint="0 in Kuwait, 5 in the UAE, 14 in Egypt. Applied to new lines; each line can differ." />
          <TextField label={t("Payment terms (days)")} inputMode="numeric" disabled={!editable} value={values.default_payment_terms_days} onChange={set("default_payment_terms_days")} error={action.field("default_payment_terms_days")} hint="Used when the customer has none. 0 = due on invoice." />
          <TextField label={t("Quotation validity (days)")} inputMode="numeric" disabled={!editable} value={values.quotation_valid_days} onChange={set("quotation_valid_days")} error={action.field("quotation_valid_days")} />
          <TextField label={t("Max discount without approval %")} inputMode="decimal" disabled={!editable} value={values.max_line_discount_percent} onChange={set("max_line_discount_percent")} error={action.field("max_line_discount_percent")} hint="Bigger discounts need the 'Give discounts above the company limit' permission." />
        </div>
      </Card>
      <Card title={t("Printing")}>
        <TextAreaField label={t("Invoice footer notes")} disabled={!editable} value={values.invoice_notes} onChange={set("invoice_notes")} hint="Bank details, warranty terms, thank-you line…" />
      </Card>
      {editable ? (
        <div className="flex items-center gap-3">
          <Button type="submit" pending={action.pending}>{t("Save")}</Button>
          {saved ? <span className="text-sm text-ink-soft">{t("Saved.")}</span> : null}
        </div>
      ) : null}
    </form>
  );
}

export default function SalesSettingsPage() {
  const { company, name } = useWorkspace();
  const settings = useResource<SalesSettings>(`/sales/settings/${company.id}`);
  return (
    <>
      <PageHeader title="Sales settings" description={`Defaults for quotations and invoices of ${name(company)}.`} />
      <ErrorBanner error={settings.error} />
      {settings.data ? <Form key={settings.data.id} settings={settings.data} /> : settings.error ? null : <Loading />}
    </>
  );
}
