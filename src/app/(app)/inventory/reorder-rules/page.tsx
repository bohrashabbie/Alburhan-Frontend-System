"use client";

import { useState } from "react";

import { ProductPicker } from "@/components/product-picker";
import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import { qty, useWarehouses } from "@/lib/inventory";
import type { Product, ReorderRule } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export default function ReorderRulesPage() {
  const { company, name } = useWorkspace();
  const warehouses = useWarehouses();
  const [picked, setPicked] = useState<Product | null>(null);

  return (
    <ResourcePage<ReorderRule>
      title="Reorder rules"
      description="When free stock in a warehouse drops below the minimum, the product appears in Reorder alerts with a suggested quantity."
      endpoint="/inventory/reorder-rules"
      permission="inventory.reorder_rule"
      noun="reorder rule"
      query={{ company: company.id }}
      columns={[
        { label: "Product", render: (row) => <span><span className="block font-medium">{row.product_name}</span><span className="block font-mono text-xs text-ink-soft">{row.sku}</span></span> },
        { label: "Warehouse", render: (row) => row.warehouse_name },
        { label: "Min. quantity", render: (row) => <span className="tabular-nums">{qty(row.min_quantity)} {row.uom}</span> },
        { label: "Reorder quantity", render: (row) => <span className="tabular-nums">{qty(row.reorder_quantity)} {row.uom}</span> },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "warehouse", label: "Warehouse", type: "select", required: true, options: warehouses.map((item) => [String(item.id), name(item)]) },
        {
          name: "product",
          label: "Product",
          type: "custom",
          required: true,
          render: ({ value, onChange, error, label, disabled }) =>
            disabled ? (
              <div className="flex flex-col gap-1.5"><span className="text-sm font-medium">{label}</span><span className="text-sm text-ink-soft">{String(value)}</span></div>
            ) : (
              <ProductPicker label={label} value={picked && String(picked.id) === String(value) ? picked : null} error={error} onChange={(product) => { setPicked(product); onChange(product ? String(product.id) : ""); }} />
            ),
        },
        { name: "min_quantity", label: "Min. quantity", type: "number", required: true, hint: "Alert when free stock drops below this." },
        { name: "reorder_quantity", label: "Reorder quantity", type: "number", required: true, hint: "The usual order size." },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={(row) => ({
        warehouse: row?.warehouse ? String(row.warehouse) : warehouses[0] ? String(warehouses[0].id) : "",
        product: row?.product ? String(row.product) : "",
        min_quantity: row ? qty(row.min_quantity) : "",
        reorder_quantity: row ? qty(row.reorder_quantity) : "",
        is_active: row?.is_active ?? true,
      })}
      toPayload={() => ({ company: company.id })}
    />
  );
}
