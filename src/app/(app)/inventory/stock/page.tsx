"use client";

import { useState } from "react";

import { Card, EmptyState, ErrorBanner, Loading, PageHeader, SearchField, SelectField } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { qty, useWarehouses } from "@/lib/inventory";
import { decimalsOf, formatAmount, toMinor } from "@/lib/money";
import type { StockLevels } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export default function StockLevelsPage() {
  const { company, name, t } = useWorkspace();
  const warehouses = useWarehouses();
  const [warehouse, setWarehouse] = useState("");
  const [search, setSearch] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const levels = useResource<StockLevels>(
    withQuery("/inventory/stock", { company: company.id, warehouse, search: search.trim() }),
  );
  const decimals = decimalsOf(company.currency);
  const rows = (levels.data?.rows ?? []).filter((row) => !onlyLow || toMinor(row.free, 4) <= 0n);
  const totalValue = rows.reduce((sum, row) => sum + toMinor(row.value, decimals), 0n);
  const totalFree = rows.filter((row) => toMinor(row.free, 4) > 0n).length;
  const problems = rows.filter((row) => toMinor(row.free, 4) < 0n).length;
  const cell = "px-3 py-2.5 text-end tabular-nums";
  const num = (value: string) => (toMinor(value, 4) === 0n ? <span className="text-ink-faint">—</span> : qty(value));

  return (
    <>
      <PageHeader
        title={t("Stock levels")}
        description={`What ${name(company)} holds in each warehouse right now, by status. Free = available − reserved.`}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SearchField label={t("Search")} placeholder={t("Search…")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <SelectField label={t("Warehouse")} value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
          <option value="">{t("All")}</option>
          {warehouses.map((item) => (
            <option key={item.id} value={item.id}>
              {name(item)}
            </option>
          ))}
        </SelectField>
        <label className="flex items-center gap-2.5 self-end pb-2.5 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
          {t("Only items with nothing free")}
        </label>
      </div>
      <ErrorBanner error={levels.error} />
      {!levels.data ? (
        levels.error ? null : <Loading label={t("Loading…")} />
      ) : rows.length === 0 ? (
        <EmptyState title={t("Nothing here yet")} description="No stock matches. Post an opening adjustment or a goods receipt to bring stock in." />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Card>
              <p className="text-sm text-ink-soft">{t("Stock value")}</p>
              <p className="text-xl font-semibold tabular-nums">{formatAmount(totalValue, decimals)} {company.currency}</p>
            </Card>
            <Card>
              <p className="text-sm text-ink-soft">{t("Lines with free stock")}</p>
              <p className="text-xl font-semibold tabular-nums">{totalFree}</p>
            </Card>
            <Card>
              <p className="text-sm text-ink-soft">{t("Over-reserved lines")}</p>
              <p className={`text-xl font-semibold tabular-nums ${problems ? "text-danger" : ""}`}>{problems}</p>
            </Card>
          </div>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[64rem] text-sm">
              <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("Product")}</th>
                  <th scope="col" className="px-3 py-2.5 text-start font-medium">{t("Warehouse")}</th>
                  <th scope="col" className={`${cell} font-medium`}>{t("Available")}</th>
                  <th scope="col" className={`${cell} font-medium`}>{t("Reserved")}</th>
                  <th scope="col" className={`${cell} font-medium`}>{t("Free")}</th>
                  <th scope="col" className={`${cell} font-medium`}>{t("In transit")}</th>
                  <th scope="col" className={`${cell} font-medium`}>{t("Damaged")}</th>
                  <th scope="col" className={`${cell} font-medium`}>{t("Returned")}</th>
                  <th scope="col" className={`${cell} font-medium`}>{t("Average cost")}</th>
                  <th scope="col" className={`${cell} font-medium`}>{t("Value")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line [&>tr]:transition-colors [&>tr:hover]:bg-surface-muted/50">
                {rows.map((row) => {
                  const free = toMinor(row.free, 4);
                  return (
                    <tr key={`${row.warehouse}-${row.product}`}>
                      <td className="px-4 py-2.5">
                        <span className="block font-medium">{row.product_name}</span>
                        <span className="block font-mono text-xs text-ink-soft">{row.sku} · {row.uom}</span>
                      </td>
                      <td className="px-3 py-2.5">{row.warehouse_name}</td>
                      <td className={cell}>{num(row.available)}</td>
                      <td className={cell}>{num(row.reserved)}</td>
                      <td className={`${cell} font-semibold ${free < 0n ? "text-danger" : free === 0n ? "text-ink-soft" : ""}`}>{qty(row.free)}</td>
                      <td className={cell}>{num(row.in_transit)}</td>
                      <td className={`${cell} ${toMinor(row.damaged, 4) > 0n ? "text-warning" : ""}`}>{num(row.damaged)}</td>
                      <td className={cell}>{num(row.returned)}</td>
                      <td className={cell}>{formatAmount(row.average_cost, decimals)}</td>
                      <td className={cell}>{formatAmount(row.value, decimals)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-line bg-surface-muted/40 font-semibold tabular-nums">
                <tr>
                  <td className="px-4 py-3" colSpan={9}>{t("Total")}</td>
                  <td className={cell}>{formatAmount(totalValue, decimals)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </>
  );
}
