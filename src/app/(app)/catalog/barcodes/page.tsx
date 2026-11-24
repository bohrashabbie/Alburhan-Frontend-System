"use client";

import JsBarcode from "jsbarcode";
import { Printer, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ProductPicker } from "@/components/product-picker";
import { Button, CheckboxField, EmptyState, PageHeader, SelectField } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import type { Page, PriceList, PriceListItem, Product } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

type Row = { product: Product; copies: string };

function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, value, { format: "CODE128", height: 38, width: 1.4, margin: 0, fontSize: 11, textMargin: 1 });
    } catch {
      ref.current.replaceChildren();
    }
  }, [value]);
  return <svg ref={ref} className="mx-auto max-w-full" role="img" aria-label={value} />;
}

/** The product's price in the default list (asked per product, so a big catalogue is no problem). */
function LabelPrice({ listId, currency, product }: { listId: number; currency: string; product: number }) {
  const { locale } = useWorkspace();
  const prices = useResource<Page<PriceListItem>>(withQuery("/catalog/price-list-items", { price_list: listId, product, page_size: 5 }));
  const price = prices.data?.results.find((item) => Number(item.min_quantity) <= 1)?.unit_price;
  return price ? <p className="text-[11px] leading-4 font-semibold">{formatMoney(price, currency, locale)}</p> : null;
}

/** Pick products and how many labels of each, then print them on a sheet or a label roll. */
export default function BarcodesPage() {
  const { company, name, t } = useWorkspace();
  const [picking, setPicking] = useState<Product | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [showName, setShowName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [columns, setColumns] = useState("3");
  const lists = useResource<Page<PriceList>>(showPrice ? withQuery("/catalog/price-lists", { company: company.id, is_default: "true", page_size: 1 }) : null);
  const list = lists.data?.results[0];

  const add = (product: Product | null) => {
    setPicking(null);
    if (!product) return;
    setRows((current) => (current.some((row) => row.product.id === product.id) ? current : [...current, { product, copies: "1" }]));
  };
  const labels = rows.flatMap((row) => Array.from({ length: Math.min(Math.max(Number(row.copies) || 0, 0), 500) }, (_, index) => ({ key: `${row.product.id}-${index}`, product: row.product })));

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title={t("Print barcode")}
          description={t("Choose products and how many labels of each. The barcode is the product's own barcode, or its code when it has none.")}
          actions={<Button disabled={labels.length === 0} onClick={() => window.print()}><Printer aria-hidden className="size-4" />{t("Print")}</Button>}
        />
        <div className="mb-4 grid max-w-4xl items-end gap-3 sm:grid-cols-[2fr_1fr]">
          <ProductPicker label={t("Add product")} value={picking} onChange={add} />
          <SelectField label={t("Labels per row")} value={columns} onChange={(e) => setColumns(e.target.value)}>
            {["1", "2", "3", "4", "5"].map((value) => <option key={value} value={value}>{value}</option>)}
          </SelectField>
        </div>
        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2">
          <CheckboxField label={t("Show product name")} checked={showName} onChange={(e) => setShowName(e.target.checked)} />
          <CheckboxField label={t("Show price")} checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
        </div>
        {rows.length === 0 ? (
          <EmptyState title={t("No products chosen")} description={t("Search for a product above to add its labels.")} />
        ) : (
          <div className="mb-6 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[30rem] text-sm">
              <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
                <tr><th className="px-4 py-2.5 text-start font-medium">{t("Product")}</th><th className="px-4 py-2.5 text-start font-medium">{t("Barcode")}</th><th className="px-4 py-2.5 text-start font-medium">{t("Labels")}</th><th /></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <tr key={row.product.id}>
                    <td className="px-4 py-2.5"><span className="font-medium">{name(row.product)}</span><span className="block font-mono text-xs text-ink-soft">{row.product.sku}</span></td>
                    <td className="px-4 py-2.5 font-mono text-xs">{row.product.barcode || row.product.sku}</td>
                    <td className="px-4 py-2">
                      <input type="number" min={1} max={500} aria-label={`${t("Labels")}: ${row.product.sku}`} value={row.copies} onChange={(e) => setRows((current) => current.map((item) => (item.product.id === row.product.id ? { ...item, copies: e.target.value } : item)))} className="h-9 w-24 rounded-lg border border-line-strong bg-surface px-3 text-sm tabular-nums" />
                    </td>
                    <td className="px-4 py-2 text-end"><Button variant="ghost" aria-label={t("Remove")} onClick={() => setRows((current) => current.filter((item) => item.product.id !== row.product.id))}><Trash2 aria-hidden className="size-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {labels.length ? (
        <div className="print-sheet grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {labels.map(({ key, product }) => {
            return (
              <div key={key} className="break-inside-avoid rounded-md border border-line bg-white p-2 text-center text-black print:border-neutral-300">
                {showName ? <p className="truncate text-[11px] leading-4 font-semibold">{name(product)}</p> : null}
                <Barcode value={product.barcode || product.sku} />
                {showPrice && list ? <LabelPrice listId={list.id} currency={list.currency} product={product.id} /> : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
