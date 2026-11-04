"use client";

import { ContactsEditor, contactsPayload } from "@/components/contacts-editor";
import { CountryLabel } from "@/components/country";
import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import { Badge } from "@/components/ui";
import { useResource } from "@/lib/hooks";
import type { Currency, Page, Supplier } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export default function SuppliersPage() {
  const { company, companies, name } = useWorkspace();
  const currencies = useResource<Page<Currency>>("/organization/currencies?page_size=500");
  const currencyOptions = (currencies.data?.results ?? []).map(
    (item) => [item.code, `${item.code} · ${name(item)}`] as [string, string],
  );
  const groupCompanies = companies
    .filter((item) => item.id !== company.id)
    .map((item) => [String(item.id), name(item)] as [string, string]);
  const groupName = (id: number | null) => companies.find((item) => item.id === id);

  return (
    <ResourcePage<Supplier>
      title="Suppliers"
      description={`Suppliers of ${name(company)}, including group companies such as the MS Lighting factory.`}
      endpoint="/partners/suppliers"
      permission="partners.supplier"
      noun="supplier"
      wide
      query={{ company: company.id }}
      columns={[
        { label: "Code", render: (row) => <span className="font-mono text-xs">{row.code}</span> },
        {
          label: "Name",
          render: (row) => (
            <span className="flex flex-wrap items-center gap-2 font-medium">
              {name(row)}
              {row.intercompany ? <Badge>Group · {groupName(row.intercompany)?.code}</Badge> : null}
            </span>
          ),
        },
        { label: "Country", render: (row) => <CountryLabel code={row.country} /> },
        { label: "Currency", render: (row) => row.currency },
        {
          label: "Lead time",
          render: (row) => <span className="tabular-nums">{row.lead_time_days ? `${row.lead_time_days} d` : "—"}</span>,
        },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "name", label: "Name", required: true, section: "General" },
        { name: "name_ar", label: "Name (Arabic)" },
        { name: "code", label: "Code", lockOnEdit: true, hint: "Leave empty to number automatically." },
        { name: "country", label: "Country", type: "country", nullable: true },
        { name: "currency", label: "Invoice currency", type: "select", required: true, options: currencyOptions },
        { name: "intercompany", label: "Group company", type: "select", nullable: true, options: groupCompanies, hint: "Set when this supplier is another Al-Burhan company." },
        { name: "phone", label: "Phone" },
        { name: "email", label: "Email", type: "email" },
        { name: "website", label: "Website", type: "url", wide: true },
        { name: "address", label: "Address", type: "textarea" },

        { name: "tax_number", label: "Tax number", section: "Purchase terms" },
        { name: "payment_terms_days", label: "Payment terms (days)", type: "number" },
        { name: "lead_time_days", label: "Lead time (days)", type: "number", hint: "Typical days from order to delivery." },
        { name: "notes", label: "Notes", type: "textarea" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={(row) => ({
        name: row?.name ?? "",
        name_ar: row?.name_ar ?? "",
        code: row?.code ?? "",
        country: row?.country ?? "",
        currency: row?.currency ?? company.currency,
        intercompany: row?.intercompany ? String(row.intercompany) : "",
        phone: row?.phone ?? "",
        email: row?.email ?? "",
        website: row?.website ?? "",
        address: row?.address ?? "",
        tax_number: row?.tax_number ?? "",
        payment_terms_days: String(row?.payment_terms_days ?? 0),
        lead_time_days: String(row?.lead_time_days ?? 0),
        notes: row?.notes ?? "",
        is_active: row?.is_active ?? true,
        contacts: JSON.stringify(row?.contacts ?? []),
      })}
      extraForm={(values, set, field) => (
        <ContactsEditor value={values.contacts} onChange={(json) => set("contacts", json)} error={field("contacts")} />
      )}
      toPayload={(values) => ({
        company: company.id,
        contacts: contactsPayload(values.contacts),
      })}
    />
  );
}
