"use client";

import { CancelPosted } from "@/components/cancel-posted";
import { ResourcePage } from "@/components/resource-page";
import { Badge } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import type { MoneyAccount, MoneyTransfer } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const today = () => new Date().toLocaleDateString("en-CA");

export default function MoneyTransfersPage() {
  const { company, can, locale, name, t } = useWorkspace();
  const accounts = useResource<MoneyAccount[]>(withQuery("/accounting/money-accounts", { company: company.id }));
  const money = (value: string) => formatMoney(value, company.currency, locale);
  const options: [string, string][] = (accounts.data ?? [])
    .filter((item) => item.is_active && item.account)
    .map((item) => [String(item.journal), `${name(item)} · ${money(item.balance)}`]);

  return (
    <ResourcePage<MoneyTransfer>
      title="Money transfer"
      description="Move money between your own cash and bank accounts: cash taken to the bank, a float for the till."
      endpoint="/accounting/money-transfers"
      permission="accounting.money_transfer"
      noun="money transfer"
      query={{ company: company.id }}
      columns={[
        { label: "Date", render: (row) => formatDate(row.date, locale) },
        { label: "Reference", render: (row) => <span className="font-mono text-xs">{row.number}</span> },
        { label: "From account", render: (row) => row.from_name },
        { label: "To account", render: (row) => row.to_name },
        { label: "Note", render: (row) => <span className="text-ink-soft">{row.note || "—"}</span> },
        { label: "Amount", render: (row) => <span className={`font-medium tabular-nums ${row.status === "cancelled" ? "text-ink-faint line-through" : ""}`}>{money(row.amount)}</span> },
        {
          label: "Status",
          render: (row) =>
            row.status === "cancelled" ? <Badge tone="danger">{t("Cancelled")}</Badge> : can("accounting.money_transfer.cancel") ? <CancelPosted endpoint="/accounting/money-transfers" id={row.id} label={row.number} /> : <Badge tone="success">{t("Posted")}</Badge>,
        },
      ]}
      fields={[
        { name: "date", label: "Date", type: "date", required: true },
        { name: "amount", label: "Amount", type: "number", required: true },
        { name: "from_journal", label: "From account", type: "select", required: true, options },
        { name: "to_journal", label: "To account", type: "select", required: true, options },
        { name: "note", label: "Note", wide: true },
      ]}
      initial={(row) => ({
        date: row?.date ?? today(),
        amount: row?.amount ?? "",
        from_journal: row ? String(row.from_journal) : "",
        to_journal: row ? String(row.to_journal) : "",
        note: row?.note ?? "",
      })}
      readOnly={() => "A transfer is booked in the accounts as soon as it is saved, so it can't be changed. Cancel it and enter it again."}
      toPayload={() => ({ company: company.id })}
    />
  );
}
