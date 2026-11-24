"use client";

import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import type { CustomerGroup } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export default function CustomerGroupsPage() {
  const { company, name } = useWorkspace();
  return (
    <ResourcePage<CustomerGroup>
      title="Customer group"
      description="Customers who get the same standing discount, e.g. contractors or dealers. The discount is filled in on every new line sold to a customer of the group."
      endpoint="/partners/customer-groups"
      permission="partners.customer_group"
      noun="customer group"
      query={{ company: company.id }}
      columns={[
        { label: "Name", render: (row) => <span className="font-medium">{name(row)}</span> },
        { label: "Discount %", render: (row) => <span className="tabular-nums">{Number(row.discount_percent)}%</span> },
        { label: "Customers", render: (row) => <span className="tabular-nums">{row.customer_count}</span> },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "name_ar", label: "Name (Arabic)" },
        { name: "discount_percent", label: "Discount %", type: "number", required: true },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={(row) => ({ name: row?.name ?? "", name_ar: row?.name_ar ?? "", discount_percent: row ? String(Number(row.discount_percent)) : "0", is_active: row?.is_active ?? true })}
      toPayload={() => ({ company: company.id })}
    />
  );
}
