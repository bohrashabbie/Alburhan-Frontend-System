"use client";

import { useState } from "react";

import { Badge, Button, EmptyState, ErrorBanner, Loading, PageHeader, SearchField, SelectField, Table, TextField } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import { STOCK_STATUSES, qty, useWarehouses } from "@/lib/inventory";
import { decimalsOf, formatAmount } from "@/lib/money";
import type { Page, StockMove } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const TYPES: [StockMove["move_type"], string][] = [
  ["adjustment", "Adjustment"],
  ["count", "Stock count"],
  ["transfer_out", "Transfer out"],
  ["transfer_in", "Transfer in"],
  ["receipt", "Goods receipt"],
  ["issue", "Goods issue"],
  ["status", "Status change"],
];

export default function MovesPage() {
  const { company, locale, name, t } = useWorkspace();
  const warehouses = useWarehouses();
  const [search, setSearch] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const list = useResource<Page<StockMove>>(
    withQuery("/inventory/moves", {
      company: company.id, warehouse, move_type: type, search: search.trim(), date_from: from, date_to: to, page,
    }),
  );
  const typeName = Object.fromEntries(TYPES);
  const statusName = Object.fromEntries(STOCK_STATUSES);
  const decimals = decimalsOf(company.currency);
  const rows = list.data?.results ?? [];
  const pages = list.data ? Math.max(1, Math.ceil(list.data.count / 50)) : 1;
  const set = (setter: (value: string) => void) => (event: { target: { value: string } }) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <>
      <PageHeader title={t("Movements")} description={`Every stock movement of ${name(company)}, newest first. Nothing here can be edited: corrections are new documents.`} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SearchField label={t("Search")} placeholder={t("Search…")} value={search} onChange={set(setSearch)} />
        <SelectField label={t("Warehouse")} value={warehouse} onChange={set(setWarehouse)}>
          <option value="">{t("All")}</option>
          {warehouses.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
        </SelectField>
        <SelectField label={t("Type")} value={type} onChange={set(setType)}>
          <option value="">{t("All")}</option>
          {TYPES.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
        </SelectField>
        <TextField label={t("From")} type="date" value={from} onChange={set(setFrom)} />
        <TextField label={t("To")} type="date" value={to} onChange={set(setTo)} />
      </div>
      <ErrorBanner error={list.error} />
      {!list.data ? (
        list.error ? null : <Loading label={t("Loading…")} />
      ) : rows.length === 0 ? (
        <EmptyState title={t("Nothing here yet")} description="No movements match." />
      ) : (
        <>
          <Table head={[t("Date"), t("Product"), t("Warehouse"), t("Type"), t("Status"), t("Quantity"), t("Value"), t("Reference")]}>
            {rows.map((move) => {
              const outgoing = move.quantity.startsWith("-");
              return (
                <tr key={move.id}>
                  <td className="px-4 py-2.5 tabular-nums">{formatDate(move.date, locale)}</td>
                  <td className="px-4 py-2.5">
                    <span className="block font-medium">{move.product_name}</span>
                    <span className="block font-mono text-xs text-ink-soft">{move.sku}</span>
                  </td>
                  <td className="px-4 py-2.5">{move.warehouse_name}</td>
                  <td className="px-4 py-2.5">{t(typeName[move.move_type])}</td>
                  <td className="px-4 py-2.5"><Badge tone={move.status === "damaged" ? "warning" : "neutral"}>{t(statusName[move.status])}</Badge></td>
                  <td className={`px-4 py-2.5 text-end font-semibold tabular-nums ${outgoing ? "text-danger" : ""}`}>
                    {outgoing ? "−" : "+"}{qty(move.quantity.replace("-", ""))} {move.uom}
                  </td>
                  <td className="px-4 py-2.5 text-end tabular-nums">{formatAmount(move.value.replace("-", ""), decimals)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{move.reference || "—"}</td>
                </tr>
              );
            })}
          </Table>
          {pages > 1 ? (
            <div className="mt-4 flex items-center justify-end gap-2 text-sm text-ink-soft">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</Button>
              <span className="tabular-nums">{page} / {pages}</span>
              <Button variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>›</Button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
