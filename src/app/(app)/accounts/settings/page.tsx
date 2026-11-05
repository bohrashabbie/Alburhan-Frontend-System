"use client";

import { useState } from "react";

import { Card, ErrorBanner, Loading, PageHeader, SaveBar, SelectField } from "@/components/ui";
import { api } from "@/lib/api";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import type { Account, AccountType } from "@/lib/types";
import { useAccounts } from "@/lib/accounting";
import { saveLabels } from "@/lib/i18n";
import { useWorkspace } from "@/lib/workspace";


/** Field → label and which account types make sense for it. */
const FIELDS: { group: string; items: [string, string, AccountType[]][] }[] = [
  {
    group: "Customers and sales",
    items: [
      ["receivable", "Customer balances (receivable)", ["asset"]],
      ["customer_advances", "Customer down payments", ["liability"]],
      ["sales", "Sales", ["income"]],
      ["sales_returns", "Sales returns", ["income"]],
      ["installation_income", "Installation income", ["income"]],
      ["vat_output", "VAT on sales", ["liability"]],
    ],
  },
  {
    group: "Suppliers and stock",
    items: [
      ["payable", "Supplier balances (payable)", ["liability"]],
      ["supplier_advances", "Advances to suppliers", ["asset"]],
      ["grni", "Goods received not invoiced", ["liability"]],
      ["purchase_expenses", "Freight, customs and purchase price differences", ["expense"]],
      ["inventory", "Inventory", ["asset"]],
      ["cost_of_sales", "Cost of goods sold", ["expense"]],
      ["vat_input", "VAT on purchases", ["asset"]],
    ],
  },
  {
    group: "Other",
    items: [
      ["fx_difference", "Exchange gains and losses", ["expense", "income"]],
      ["retained_earnings", "Retained earnings", ["equity"]],
    ],
  },
];

type Settings = Record<string, number | null> & { id: number; company: number };

function SettingsForm({ settings, accounts }: { settings: Settings; accounts: Account[] }) {
  const { can, name, t } = useWorkspace();
  const [base, setBase] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.flatMap((g) => g.items).map(([field]) => [field, settings[field] ? String(settings[field]) : ""])),
  );
  const [values, setValues] = useState<Record<string, string>>(base);
  const dirty = JSON.stringify(values) !== JSON.stringify(base);
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const editable = can("accounting.settings.update");


  const save = () =>
    action.run(async () => {
      await api.patch(
        `/accounting/settings/${settings.company}`,
        Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value ? Number(value) : null])),
      );
      setBase(values);
      setSaved(true);
    });

  return (
    <form onSubmit={onSubmit(save)} className="flex max-w-3xl flex-col gap-4">
      <ErrorBanner error={action.error} hideFields />
      {FIELDS.map((group) => (
        <Card key={group.group} title={t(group.group)}>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            {group.items.map(([field, label, types]) => (
              <SelectField
                key={field}
                label={t(label)}
                value={values[field]}
                disabled={!editable}
                error={action.field(field)}
                onChange={(event) => {
                  setValues({ ...values, [field]: event.target.value });
                  setSaved(false);
                }}
              >
                <option value="">—</option>
                {accounts
                  .filter((account) => !account.is_group && account.is_active && types.includes(account.account_type))
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} · {name(account)}
                    </option>
                  ))}
              </SelectField>
            ))}
          </div>
        </Card>
      ))}
      {editable ? <SaveBar dirty={dirty} saved={saved} pending={action.pending} onDiscard={() => setValues(base)} labels={saveLabels(t)} /> : null}
    </form>
  );
}

export default function DefaultAccountsPage() {
  const { company, name } = useWorkspace();
  const accounts = useAccounts();
  const settings = useResource<Settings>(`/accounting/settings/${company.id}`);

  return (
    <>
      <PageHeader
        title="Default accounts"
        description={`Where ${name(company)}'s sales, purchases and stock movements post automatically.`}
      />
      <ErrorBanner error={settings.error?.status === 404 ? null : settings.error} />
      {settings.error?.status === 404 ? (
        <p className="text-sm text-ink-soft">Set up accounting for this company first (Chart of accounts → Set up accounting).</p>
      ) : !settings.data || accounts.length === 0 ? (
        <Loading />
      ) : (
        <SettingsForm key={settings.data.id} settings={settings.data} accounts={accounts} />
      )}
    </>
  );
}
