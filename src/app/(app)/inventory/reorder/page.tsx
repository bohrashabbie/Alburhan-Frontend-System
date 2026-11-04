"use client";

import Link from "next/link";
import { useState } from "react";

import { EmptyState, ErrorBanner, Loading, PageHeader, SelectField, Table } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { qty, useWarehouses } from "@/lib/inventory";
import type { ReorderRow } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export default function ReorderAlertsPage() {
  const { company, name, t } = useWorkspace();
  const warehouses = useWarehouses();
  const [warehouse, setWarehouse] = useState("");
  const report = useResource<{ rows: ReorderRow[] }>(withQuery("/inventory/reports/reorder", { company: company.id, warehouse }));
  const rows = report.data?.rows ?? [];

  return (
    <>
      <PageHeader
        title={t("Reorder alerts")}
        description={
          <>
            Products whose free stock is below the minimum set in{" "}
            <Link href="/inventory/reorder-rules" className="font-medium text-link hover:underline">Reorder rules</Link>.
            Purchasing can turn these into purchase requests.
          </>
        }
      />
      <div className="mb-4 max-w-xs">
        <SelectField label={t("Warehouse")} value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
          <option value="">{t("All")}</option>
          {warehouses.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
        </SelectField>
      </div>
      <ErrorBanner error={report.error} />
      {!report.data ? (
        report.error ? null : <Loading label={t("Loading…")} />
      ) : rows.length === 0 ? (
        <EmptyState title={t("Nothing to reorder")} description="Every product with a rule has enough free stock." />
      ) : (
        <Table head={[t("Product"), t("Warehouse"), t("Free"), t("Min. quantity"), t("Suggested")]}>
          {rows.map((row) => (
            <tr key={row.rule}>
              <td className="px-4 py-3"><span className="block font-medium">{row.product_name}</span><span className="block font-mono text-xs text-ink-soft">{row.sku}</span></td>
              <td className="px-4 py-3">{row.warehouse_name}</td>
              <td className="px-4 py-3 text-end font-semibold text-danger tabular-nums">{qty(row.free)}</td>
              <td className="px-4 py-3 text-end tabular-nums">{qty(row.min_quantity)}</td>
              <td className="px-4 py-3 text-end font-semibold tabular-nums">{qty(row.suggested)}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
