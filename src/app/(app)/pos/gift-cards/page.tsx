"use client";

import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import { withQuery } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import type { GiftCard, MoneyAccount } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export default function GiftCardsPage() {
  const { company, locale, name } = useWorkspace();
  const accounts = useResource<MoneyAccount[]>(withQuery("/accounting/money-accounts", { company: company.id }));
  const money = (value: string) => formatMoney(value, company.currency, locale);
  return (
    <ResourcePage<GiftCard>
      title="Gift cards"
      description="Sell a card for an amount; the customer spends it later at the till by its number. The money is held as a customer advance until it is spent."
      endpoint="/pos/gift-cards"
      permission="pos.gift_card"
      noun="gift card"
      query={{ company: company.id }}
      columns={[
        { label: "Number", render: (row) => <span className="font-mono text-sm font-medium">{row.code}</span> },
        { label: "Customer", render: (row) => row.customer_name ?? "—" },
        { label: "Sold for", render: (row) => <span className="tabular-nums">{money(row.amount)}</span> },
        { label: "Balance", render: (row) => <span className="font-semibold tabular-nums">{money(row.balance)}</span> },
        { label: "Expires", render: (row) => (row.expires_on ? formatDate(row.expires_on, locale) : "—") },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "code", label: "Card number", required: true },
        { name: "amount", label: "Amount", type: "number", required: true },
        { name: "paid_into", label: "Paid into", type: "select", required: true, options: (accounts.data ?? []).filter((item) => item.is_active && item.account).map((item) => [String(item.journal), name(item)]), hint: "The cash or bank the customer's money went into." },
        { name: "expires_on", label: "Expires on", type: "date", nullable: true },
      ]}
      initial={(row) => ({ code: row?.code ?? "", amount: row?.amount ?? "", paid_into: row ? String(row.paid_into) : "", expires_on: row?.expires_on ?? "" })}
      readOnly={() => "A gift card is booked when it is sold and its balance only changes at the till, so it can't be edited."}
      toPayload={() => ({ company: company.id })}
    />
  );
}
