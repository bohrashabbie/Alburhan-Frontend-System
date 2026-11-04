"use client";

import { useState } from "react";

import { ProductPicker } from "@/components/product-picker";
import { ResourcePage } from "@/components/resource-page";
import { Button, ErrorBanner } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useAction } from "@/lib/hooks";
import { DocStatus, qty, useWarehouses } from "@/lib/inventory";
import type { Product, Reservation } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function ReleaseButton({ reservation, onDone }: { reservation: Reservation; onDone: () => void }) {
  const { can, t } = useWorkspace();
  const action = useAction();
  if (reservation.status !== "active" || !can("inventory.reservation.delete")) return null;
  return (
    <section className="border-t border-line pt-6">
      <h3 className="text-base font-bold">{t("Release")}</h3>
      <p className="mt-1 text-sm text-ink-soft">Releasing makes this quantity free to sell or transfer again.</p>
      <div className="mt-3"><ErrorBanner error={action.error} /></div>
      <Button
        className="mt-3"
        variant="secondary"
        pending={action.pending}
        onClick={() => action.run(async () => { await api.post(`/inventory/reservations/${reservation.id}/release`); onDone(); })}
      >
        {t("Release")}
      </Button>
    </section>
  );
}

export default function ReservationsPage() {
  const { company, locale, name } = useWorkspace();
  const warehouses = useWarehouses();
  const [picked, setPicked] = useState<Product | null>(null);

  return (
    <ResourcePage<Reservation>
      title="Reservations"
      description={`Stock held for a project or order in ${name(company)}. Reserved quantities can't be transferred or sold elsewhere.`}
      endpoint="/inventory/reservations"
      permission="inventory.reservation"
      noun="reservation"
      query={{ company: company.id }}
      filters={[{ name: "status", label: "Status", options: [["active", "Active"], ["released", "Released"], ["fulfilled", "Fulfilled"]] }]}
      columns={[
        { label: "Product", render: (row) => <span><span className="block font-medium">{row.product_name}</span><span className="block font-mono text-xs text-ink-soft">{row.sku}</span></span> },
        { label: "Warehouse", render: (row) => row.warehouse_name },
        { label: "Quantity", render: (row) => <span className="tabular-nums">{qty(row.quantity)} {row.uom}</span> },
        { label: "Reference", render: (row) => row.reference || "—" },
        { label: "Date", render: (row) => <span className="tabular-nums">{formatDate(row.created_at, locale)}</span> },
        { label: "Status", render: (row) => <DocStatus status={row.status} /> },
      ]}
      fields={[
        { name: "warehouse", label: "Warehouse", type: "select", required: true, options: warehouses.map((item) => [String(item.id), name(item)]) },
        {
          name: "product",
          label: "Product",
          type: "custom",
          required: true,
          render: ({ value, onChange, error, label }) => (
            <ProductPicker
              label={label}
              value={picked && String(picked.id) === String(value) ? picked : null}
              error={error}
              onChange={(product) => { setPicked(product); onChange(product ? String(product.id) : ""); }}
            />
          ),
        },
        { name: "quantity", label: "Quantity", type: "number", required: true },
        { name: "reference", label: "Reference", hint: "Project or order number" },
      ]}
      initial={(row) => ({
        warehouse: row?.warehouse ? String(row.warehouse) : warehouses[0] ? String(warehouses[0].id) : "",
        product: row?.product ? String(row.product) : "",
        quantity: row ? qty(row.quantity) : "",
        reference: row?.reference ?? "",
      })}
      toPayload={() => ({ company: company.id })}
      drawerExtra={(row) => <ReleaseButton reservation={row} onDone={() => window.location.reload()} />}
    />
  );
}
