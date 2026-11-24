"use client";

import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import type { Account, ExpenseCategory, Page } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export default function ExpenseCategoriesPage() {
  const { company, name } = useWorkspace();
  const accounts = useResource<Page<Account>>(withQuery("/accounting/accounts", { company: company.id, account_type: "expense", is_group: "false", page_size: 200 }));
  return (
    <ResourcePage<ExpenseCategory>
      title="Expense category"
      description="The kinds of spending staff choose from, and the account each one is booked to."
      endpoint="/accounting/expense-categories"
      permission="accounting.expense_category"
      noun="expense category"
      query={{ company: company.id }}
      columns={[
        { label: "Code", render: (row) => <span className="font-mono text-xs">{row.code}</span> },
        { label: "Name", render: (row) => <span className="font-medium">{name(row)}</span> },
        { label: "Account", render: (row) => `${row.account_code} · ${row.account_name}` },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "code", label: "Code", required: true },
        { name: "name", label: "Name", required: true },
        { name: "name_ar", label: "Name (Arabic)" },
        { name: "account", label: "Account", type: "select", required: true, options: (accounts.data?.results ?? []).map((item) => [String(item.id), `${item.code} · ${name(item)}`]), hint: "The expense account this spending is booked to." },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={(row) => ({ code: row?.code ?? "", name: row?.name ?? "", name_ar: row?.name_ar ?? "", account: row ? String(row.account) : "", is_active: row?.is_active ?? true })}
      toPayload={() => ({ company: company.id })}
    />
  );
}
