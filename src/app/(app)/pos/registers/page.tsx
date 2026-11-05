"use client";

import { useState } from "react";

import { CustomerPicker } from "@/components/customer-picker";
import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import { Badge, Button } from "@/components/ui";
import { useAccounts } from "@/lib/accounting";
import { useResource } from "@/lib/hooks";
import { useWarehouses } from "@/lib/inventory";
import { useMoneyJournals } from "@/lib/sales";
import type { Customer, Page, PriceList, Register } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

/** The customer already saved on a register, with a button to pick another. */
function CurrentCustomer({ id, label, disabled, onChange }: { id: number; label: string; disabled: boolean; onChange: () => void }) {
  const { name, t } = useWorkspace();
  const customer = useResource<Customer>(`/partners/customers/${id}`).data;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="flex h-10 items-center justify-between gap-2 rounded-lg border border-line-strong bg-surface px-3 text-sm">
        <span className="min-w-0 truncate">
          <span className="font-medium">{customer ? name(customer) : "…"}</span>
          {customer ? <span className="ms-2 font-mono text-xs text-ink-soft">{customer.code}</span> : null}
        </span>
        {!disabled ? <Button variant="ghost" className="h-8 px-2" onClick={onChange}>{t("Change customer")}</Button> : null}
      </div>
    </div>
  );
}

export default function RegistersPage() {
  const { company, branches, name, t } = useWorkspace();
  const warehouses = useWarehouses();
  const journals = useMoneyJournals();
  const accounts = useAccounts().filter((item) => !item.is_group && item.is_active && (item.account_type === "expense" || item.account_type === "income"));
  const priceLists = useResource<Page<PriceList>>(`/catalog/price-lists?company=${company.id}&is_active=true&page_size=200`).data?.results ?? [];
  const [picked, setPicked] = useState<Customer | null>(null);
  const showrooms = branches.filter((item) => item.branch_type === "showroom" || item.branch_type === "head_office" || item.branch_type === "office");

  return (
    <ResourcePage<Register>
      title="Registers"
      description="A register is a till at a showroom: it sells from one warehouse at one price list, and puts cash and card money into the right journals."
      endpoint="/pos/registers"
      permission="pos.register"
      noun="register"
      wide
      query={{ company: company.id }}
      columns={[
        { label: "Code", render: (row) => <span className="font-mono text-xs">{row.code}</span> },
        { label: "Name", render: (row) => <span className="font-medium">{name(row)}</span> },
        { label: "Branch", render: (row) => row.branch_name },
        { label: "Sells from", render: (row) => row.warehouse_name },
        { label: "Price list", render: (row) => row.price_list_name ?? <span className="text-ink-faint">{t("Default")}</span> },
        { label: "Shift", render: (row) => (row.open_shift ? <Badge tone="success">{row.open_shift.number}</Badge> : <span className="text-ink-faint">—</span>) },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "branch", label: "Branch", type: "select", required: true, options: (showrooms.length ? showrooms : branches).map((item) => [String(item.id), name(item)]) },
        { name: "code", label: "Code", required: true, lockOnEdit: true, hint: "e.g. SR1-T1" },
        { name: "name", label: "Name", required: true },
        { name: "name_ar", label: "Name (Arabic)" },
        { name: "warehouse", label: "Sells from", type: "select", required: true, section: "Selling", options: warehouses.map((item) => [String(item.id), name(item)]), hint: "Goods sold here leave this warehouse." },
        { name: "price_list", label: "Price list", type: "select", nullable: true, options: [["", t("Company default")], ...priceLists.map((item): [string, string] => [String(item.id), name(item)])] },
        {
          name: "walk_in_customer",
          label: "Walk-in customer",
          type: "custom",
          required: true,
          wide: true,
          render: ({ value, onChange, error, label, disabled }) =>
            value && (!picked || String(picked.id) !== String(value)) ? (
              <CurrentCustomer id={Number(value)} label={label} disabled={disabled} onChange={() => onChange("")} />
            ) : (
              <CustomerPicker label={label} value={picked && String(picked.id) === String(value) ? picked : null} error={error} disabled={disabled} onChange={(customer) => { setPicked(customer); onChange(customer ? String(customer.id) : ""); }} />
            ),
        },
        { name: "cash_journal", label: "Cash journal", type: "select", required: true, section: "Money", options: journals.filter((item) => item.journal_type === "cash").map((item) => [String(item.id), `${item.code} · ${name(item)}`]), hint: "The drawer." },
        { name: "card_journal", label: "Card journal", type: "select", required: true, options: journals.filter((item) => item.journal_type === "bank").map((item) => [String(item.id), `${item.code} · ${name(item)}`]), hint: "KNET and card settlements." },
        { name: "cash_difference_account", label: "Cash over / short account", type: "select", nullable: true, wide: true, options: [["", t("Record only")], ...accounts.map((item): [string, string] => [String(item.id), `${item.code} ${name(item)}`])], hint: "Booked when the counted cash differs from the expected cash at shift close." },
        { name: "receipt_header", label: "Receipt header", type: "textarea", section: "Receipt", wide: true, hint: "Address, phone, tax number." },
        { name: "receipt_footer", label: "Receipt footer", type: "textarea", wide: true, hint: "e.g. the return policy." },
        { name: "is_active", label: "Active", type: "checkbox", wide: true },
      ]}
      initial={(row) => ({
        branch: row ? String(row.branch) : showrooms[0] ? String(showrooms[0].id) : branches[0] ? String(branches[0].id) : "",
        code: row?.code ?? "",
        name: row?.name ?? "",
        name_ar: row?.name_ar ?? "",
        warehouse: row ? String(row.warehouse) : warehouses[0] ? String(warehouses[0].id) : "",
        price_list: row?.price_list ? String(row.price_list) : "",
        walk_in_customer: row ? String(row.walk_in_customer) : "",
        cash_journal: row ? String(row.cash_journal) : String(journals.find((item) => item.journal_type === "cash")?.id ?? ""),
        card_journal: row ? String(row.card_journal) : String(journals.find((item) => item.journal_type === "bank")?.id ?? ""),
        cash_difference_account: row?.cash_difference_account ? String(row.cash_difference_account) : "",
        receipt_header: row?.receipt_header ?? "",
        receipt_footer: row?.receipt_footer ?? "",
        is_active: row?.is_active ?? true,
      })}
      toPayload={() => ({ company: company.id })}
    />
  );
}
