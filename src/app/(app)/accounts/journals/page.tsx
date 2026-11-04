"use client";

import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import type { Journal } from "@/lib/types";
import { useAccounts } from "@/lib/accounting";
import { useWorkspace } from "@/lib/workspace";


const TYPES: [Journal["journal_type"], string][] = [
  ["general", "General"],
  ["sales", "Sales"],
  ["purchase", "Purchases"],
  ["cash", "Cash"],
  ["bank", "Bank"],
];

export default function JournalsPage() {
  const { company, name } = useWorkspace();
  const accounts = useAccounts();
  const typeName = Object.fromEntries(TYPES);
  const detail = accounts
    .filter((account) => !account.is_group && account.account_type === "asset")
    .map((account) => [String(account.id), `${account.code} · ${name(account)}`] as [string, string]);
  const accountName = (id: number | null) => {
    const account = accounts.find((item) => item.id === id);
    return account ? `${account.code} · ${name(account)}` : "—";
  };

  return (
    <ResourcePage<Journal>
      title="Journals"
      description="Books that entries are recorded in. The code starts each entry number, e.g. KW-JV-2026-00001."
      endpoint="/accounting/journals"
      permission="accounting.journal"
      noun="journal"
      query={{ company: company.id }}
      columns={[
        { label: "Code", render: (row) => <span className="font-mono text-xs">{row.code}</span> },
        { label: "Name", render: (row) => <span className="font-medium">{name(row)}</span> },
        { label: "Type", render: (row) => typeName[row.journal_type] },
        { label: "Cash / bank account", render: (row) => accountName(row.default_account) },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "code", label: "Code", required: true, hint: "2–4 letters, e.g. BK2." },
        { name: "name", label: "Name", required: true },
        { name: "name_ar", label: "Name (Arabic)" },
        { name: "journal_type", label: "Type", type: "select", required: true, options: TYPES },
        { name: "default_account", label: "Cash / bank account", type: "select", nullable: true, options: detail, hint: "For cash and bank journals." },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={(row) => ({
        code: row?.code ?? "",
        name: row?.name ?? "",
        name_ar: row?.name_ar ?? "",
        journal_type: row?.journal_type ?? "general",
        default_account: row?.default_account ? String(row.default_account) : "",
        is_active: row?.is_active ?? true,
      })}
      toPayload={() => ({ company: company.id })}
    />
  );
}
