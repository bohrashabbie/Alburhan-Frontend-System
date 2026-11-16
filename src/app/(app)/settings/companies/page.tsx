"use client";

import { useSWRConfig } from "swr";

import { CountryLabel } from "@/components/country";
import { PhotoThumb, PhotoUpload } from "@/components/photo-upload";
import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import { useResource } from "@/lib/hooks";
import type { Company, Currency, Page } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

/** Every time zone, with its current UTC offset, ordered by offset: "(UTC+03:00) Asia/Kuwait". */
const TIME_ZONES: [string, string][] = (() => {
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["Asia/Kuwait", "Asia/Dubai", "Asia/Riyadh", "Asia/Shanghai", "Africa/Cairo", "UTC"];
  const offset = (zone: string) => {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    const match = part.match(/GMT([+-])(\d{2}):(\d{2})/);
    const minutes = match ? (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) : 0;
    const sign = minutes < 0 ? "-" : "+";
    const abs = Math.abs(minutes);
    return { minutes, label: `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}` };
  };
  return [...new Set([...zones, "UTC"])]
    .map((zone) => ({ zone, ...offset(zone) }))
    .sort((a, b) => a.minutes - b.minutes || a.zone.localeCompare(b.zone))
    .map(({ zone, label }) => [zone, `(${label}) ${zone.replaceAll("_", " ")}`]);
})();

export default function CompaniesPage() {
  const { can, name } = useWorkspace();
  const { mutate } = useSWRConfig();
  const currencies = useResource<Page<Currency>>("/organization/currencies?page_size=500");
  const currencyOptions = (currencies.data?.results ?? []).map(
    (item) => [item.code, `${item.code} · ${name(item)}`] as [string, string],
  );
  const refreshCompanies = () =>
    mutate((key) => typeof key === "string" && key.startsWith("/organization/companies"));

  return (
    <ResourcePage<Company>
      title="Companies"
      description="One legal entity per country. Every document belongs to a company."
      endpoint="/organization/companies"
      permission="organization.company"
      noun="company"
      columns={[
        {
          label: "Company",
          render: (row) => (
            <span className="flex items-center gap-3">
              <PhotoThumb url={row.logo_url} name={row.name} size="size-9" />
              <span className="min-w-0">
                <span className="block font-medium">{name(row)}</span>
                <span className="block font-mono text-xs text-ink-soft">{row.code}</span>
              </span>
            </span>
          ),
        },
        { label: "Country", render: (row) => <CountryLabel code={row.country} /> },
        { label: "Currency", render: (row) => row.currency },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      wide
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "name_ar", label: "Name (Arabic)" },
        { name: "code", label: "Code", required: true, lockOnEdit: true, hint: "Used in document numbers, e.g. KW." },
        { name: "legal_name", label: "Legal name" },
        { name: "country", label: "Country", type: "country", required: true, section: "Country and books" },
        { name: "currency", label: "Currency", type: "select", required: true, options: currencyOptions, hint: "The currency this company keeps its books in." },
        { name: "timezone", label: "Time zone", type: "select", required: true, options: TIME_ZONES, hint: "Dates, times and the start of each business day follow this." },
        { name: "tax_registration_number", label: "Tax registration no.", section: "Registration", hint: "Printed on invoices; used for VAT returns." },
        { name: "commercial_registration_number", label: "Commercial registration no.", hint: "Used as the XBRL filing identifier." },
        { name: "phone", label: "Phone", type: "phone", section: "Contact" },
        { name: "email", label: "Email", type: "email" },
        { name: "address", label: "Address", type: "textarea", wide: true },
        { name: "is_active", label: "Active", type: "checkbox", wide: true },
      ]}
      initial={(row) => ({
        code: row?.code ?? "",
        name: row?.name ?? "",
        name_ar: row?.name_ar ?? "",
        legal_name: row?.legal_name ?? "",
        country: row?.country ?? "KW",
        currency: row?.currency ?? "KWD",
        timezone: row?.timezone ?? "Asia/Kuwait",
        tax_registration_number: row?.tax_registration_number ?? "",
        commercial_registration_number: row?.commercial_registration_number ?? "",
        phone: row?.phone ?? "",
        email: row?.email ?? "",
        address: row?.address ?? "",
        is_active: row?.is_active ?? true,
      })}
      keepOpenAfterCreate
      drawerExtra={(row) => (
        <PhotoUpload
          endpoint={`/organization/companies/${row.id}/logo`}
          name={row.name}
          initialUrl={row.logo_url}
          canEdit={can("organization.company.update")}
          onChanged={refreshCompanies}
          title="Logo"
          hint="PNG, JPEG or WebP, up to 2 MB. A square logo looks best."
          shape="rounded-lg"
        />
      )}
    />
  );
}
