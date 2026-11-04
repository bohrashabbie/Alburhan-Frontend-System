"use client";

import { useSWRConfig } from "swr";

import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import { Badge, Button } from "@/components/ui";
import { api } from "@/lib/api";
import { useAction, useResource } from "@/lib/hooks";
import { ACCOUNT_TYPES, useAccounts } from "@/lib/accounting";
import type { Account, Currency, Page } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function SetUpButton() {
  const { company, can, t } = useWorkspace();
  const { mutate } = useSWRConfig();
  const action = useAction();
  if (!can("accounting.account.create")) return null;
  const run = () =>
    action.run(async () => {
      await api.post("/accounting/setup", { company: company.id, year: new Date().getFullYear() });
      await mutate((key) => typeof key === "string" && key.startsWith("/accounting/"));
    });
  return (
    <Button pending={action.pending} onClick={run}>
      {t("Set up accounting")}
    </Button>
  );
}

export default function ChartPage() {
  const { company, name } = useWorkspace();
  const accounts = useAccounts();
  const byId = new Map(accounts.map((account) => [account.id, account]));
  const depth = (account: Account) => {
    let level = 0;
    for (let node = account.parent ? byId.get(account.parent) : undefined; node; node = node.parent ? byId.get(node.parent) : undefined) {
      level += 1;
    }
    return level;
  };
  const typeName = Object.fromEntries(ACCOUNT_TYPES);
  const headings = accounts
    .filter((account) => account.is_group)
    .map((account) => [String(account.id), `${account.code} · ${name(account)}`] as [string, string]);
  const currencies = useResource<Page<Currency>>("/organization/currencies?page_size=500");
  const currencyOptions = (currencies.data?.results ?? []).map(
    (item) => [item.code, `${item.code} · ${name(item)}`] as [string, string],
  );

  return (
    <ResourcePage<Account>
      title="Chart of accounts"
      description={`Accounts of ${name(company)}. Headings group accounts; entries post to the accounts under them.`}
      endpoint="/accounting/accounts"
      permission="accounting.account"
      noun="account"
      query={{ company: company.id, page_size: 500, ordering: "code" }}
      filters={[{ name: "account_type", label: "Type", options: ACCOUNT_TYPES }]}
      emptyAction={<SetUpButton />}
      columns={[
        {
          label: "Account",
          render: (row) => (
            <span className="flex items-baseline gap-3" style={{ paddingInlineStart: `${depth(row) * 1.25}rem` }}>
              <span className="w-12 shrink-0 font-mono text-xs text-ink-soft tabular-nums">{row.code}</span>
              <span className={row.is_group ? "font-semibold" : ""}>{name(row)}</span>
            </span>
          ),
        },
        { label: "Type", render: (row) => typeName[row.account_type] },
        {
          label: "Kind",
          render: (row) => (
            <span className="flex gap-1.5">
              {row.is_group ? <Badge>Heading</Badge> : null}
              {row.is_reconcilable ? <Badge>By partner</Badge> : null}
              {row.currency ? <Badge>{row.currency}</Badge> : null}
            </span>
          ),
        },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "code", label: "Code", required: true, hint: "e.g. 6210" },
        { name: "name", label: "Name", required: true },
        { name: "name_ar", label: "Name (Arabic)" },
        { name: "account_type", label: "Type", type: "select", required: true, options: ACCOUNT_TYPES },
        { name: "parent", label: "Under heading", type: "select", nullable: true, options: headings },
        { name: "currency", label: "Foreign currency", type: "select", nullable: true, options: currencyOptions, hint: "Only for accounts kept in another currency, e.g. a USD bank account." },
        { name: "is_group", label: "Heading (groups other accounts; no entries)", type: "checkbox" },
        { name: "is_reconcilable", label: "Track by customer or supplier", type: "checkbox" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={(row) => ({
        code: row?.code ?? "",
        name: row?.name ?? "",
        name_ar: row?.name_ar ?? "",
        account_type: row?.account_type ?? "expense",
        parent: row?.parent ? String(row.parent) : "",
        currency: row?.currency ?? "",
        is_group: row?.is_group ?? false,
        is_reconcilable: row?.is_reconcilable ?? false,
        is_active: row?.is_active ?? true,
      })}
      toPayload={() => ({ company: company.id })}
    />
  );
}
