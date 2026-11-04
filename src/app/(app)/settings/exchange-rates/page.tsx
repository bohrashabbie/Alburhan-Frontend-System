"use client";

import { ResourcePage } from "@/components/resource-page";
import { formatDate } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import type { Currency, ExchangeRate, Page } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export default function ExchangeRatesPage() {
  const { locale } = useWorkspace();
  const currencies = useResource<Page<Currency>>("/organization/currencies");
  const options = (currencies.data?.results ?? []).map(
    (item) => [item.code, item.code] as [string, string],
  );

  return (
    <ResourcePage<ExchangeRate>
      title="Exchange rates"
      description="1 unit of the first currency = rate × the second, from the effective date. Shared by all companies."
      endpoint="/organization/exchange-rates"
      permission="organization.exchange_rate"
      noun="exchange rate"
      columns={[
        { label: "Date", render: (row) => <span className="tabular-nums">{formatDate(row.effective_date, locale)}</span> },
        { label: "From", render: (row) => row.currency },
        { label: "To", render: (row) => row.to_currency },
        { label: "Rate", render: (row) => <span className="font-mono tabular-nums">{row.rate}</span> },
        { label: "Source", render: (row) => row.source || "—" },
      ]}
      fields={[
        { name: "currency", label: "From", type: "select", required: true, options },
        { name: "to_currency", label: "To", type: "select", required: true, options },
        { name: "rate", label: "Rate", type: "number", required: true },
        { name: "effective_date", label: "Effective date", type: "date", required: true },
        { name: "source", label: "Source", hint: "e.g. Central Bank of Kuwait", wide: true },
      ]}
      initial={(row) => ({
        currency: row?.currency ?? "KWD",
        to_currency: row?.to_currency ?? "AED",
        rate: row?.rate ?? "",
        effective_date: row?.effective_date ?? new Date().toLocaleDateString("en-CA"),
        source: row?.source ?? "",
      })}
    />
  );
}
