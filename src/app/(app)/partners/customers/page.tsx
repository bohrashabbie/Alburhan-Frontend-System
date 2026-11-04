"use client";

import { ContactsEditor, contactsPayload } from "@/components/contacts-editor";
import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import { formatMoney } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import type { Customer, Page, PriceList } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const TYPES: [Customer["customer_type"], string][] = [
  ["individual", "Individual"],
  ["business", "Business"],
  ["contractor", "Contractor"],
  ["government", "Government"],
];

export default function CustomersPage() {
  const { company, locale, name } = useWorkspace();
  const priceLists = useResource<Page<PriceList>>(
    `/catalog/price-lists?company=${company.id}&is_active=true&page_size=200`,
  );
  const typeName = Object.fromEntries(TYPES);
  const listOptions = (priceLists.data?.results ?? []).map(
    (item) => [String(item.id), `${name(item)} · ${item.currency}`] as [string, string],
  );

  return (
    <ResourcePage<Customer>
      title="Customers"
      description={`Customers of ${name(company)}. Codes are given automatically, e.g. ${company.code}-CUS-00001.`}
      endpoint="/partners/customers"
      permission="partners.customer"
      noun="customer"
      wide
      query={{ company: company.id }}
      filters={[{ name: "customer_type", label: "Type", options: TYPES }]}
      columns={[
        { label: "Code", render: (row) => <span className="font-mono text-xs">{row.code}</span> },
        {
          label: "Name",
          render: (row) => (
            <span className="block">
              <span className="block font-medium">{name(row)}</span>
              {row.contacts[0] ? (
                <span className="block text-xs text-ink-soft">{row.contacts.find((c) => c.is_primary)?.name ?? row.contacts[0].name}</span>
              ) : null}
            </span>
          ),
        },
        { label: "Type", render: (row) => typeName[row.customer_type] },
        { label: "Mobile", render: (row) => <span className="tabular-nums">{row.mobile || row.phone || "—"}</span> },
        {
          label: "Credit limit",
          render: (row) => (
            <span className="tabular-nums">
              {Number(row.credit_limit) ? formatMoney(row.credit_limit, company.currency, locale) : "—"}
            </span>
          ),
        },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "name", label: "Name", required: true, section: "General" },
        { name: "name_ar", label: "Name (Arabic)" },
        { name: "customer_type", label: "Type", type: "select", required: true, options: TYPES },
        { name: "code", label: "Code", lockOnEdit: true, hint: "Leave empty to number automatically." },
        { name: "mobile", label: "Mobile" },
        { name: "phone", label: "Phone" },
        { name: "email", label: "Email", type: "email" },
        { name: "area", label: "Area / city" },
        { name: "address", label: "Address", type: "textarea" },

        { name: "civil_id", label: "Civil ID / passport", section: "Registration" },
        { name: "commercial_registration", label: "Commercial registration no." },
        { name: "tax_number", label: "Tax number" },

        { name: "price_list", label: "Price list", type: "select", nullable: true, options: listOptions, section: "Sales terms", hint: "Empty = the company's default list." },
        { name: "credit_limit", label: `Credit limit (${company.currency})`, type: "number" },
        { name: "payment_terms_days", label: "Payment terms (days)", type: "number", hint: "0 = pay on invoice." },
        { name: "notes", label: "Notes", type: "textarea" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={(row) => ({
        name: row?.name ?? "",
        name_ar: row?.name_ar ?? "",
        customer_type: row?.customer_type ?? "individual",
        code: row?.code ?? "",
        mobile: row?.mobile ?? "",
        phone: row?.phone ?? "",
        email: row?.email ?? "",
        area: row?.area ?? "",
        address: row?.address ?? "",
        civil_id: row?.civil_id ?? "",
        commercial_registration: row?.commercial_registration ?? "",
        tax_number: row?.tax_number ?? "",
        price_list: row?.price_list ? String(row.price_list) : "",
        credit_limit: row?.credit_limit ?? "0",
        payment_terms_days: String(row?.payment_terms_days ?? 0),
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
