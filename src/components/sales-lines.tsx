"use client";

import { Plus, Trash2 } from "lucide-react";

import { ProductPicker } from "@/components/product-picker";
import { Badge, Button, IconButton } from "@/components/ui";
import { api } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { LINE_INPUT, qty } from "@/lib/inventory";
import { decimalsOf, formatAmount, toMinor } from "@/lib/money";
import type { Page, PriceList, Product, SalesLine, SalesSettings } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export type LineDraft = {
  product: Product | null;
  productId: number | null;
  label: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount_percent: string;
  tax_rate: string;
  /** Purchasing: the goods-receipt line this bill line clears (kept through edits). */
  receipt_line?: number | null;
  account?: number | null;
};

export const newLine = (tax = "0"): LineDraft => ({
  product: null, productId: null, label: "", description: "", quantity: "1", unit_price: "", discount_percent: "0", tax_rate: tax,
});

export function fromSalesLines(lines: SalesLine[]): LineDraft[] {
  return lines.map((line) => ({
    product: null,
    productId: line.product,
    label: `${line.sku} · ${line.product_name}`,
    description: line.description,
    quantity: qty(line.quantity),
    unit_price: line.unit_price,
    discount_percent: qty(line.discount_percent),
    tax_rate: qty(line.tax_rate),
  }));
}

export function toPayload(lines: LineDraft[]) {
  return lines
    .filter((line) => line.productId)
    .map((line) => ({
      product: line.productId,
      description: line.description,
      quantity: line.quantity || "1",
      unit_price: line.unit_price || "0",
      discount_percent: line.discount_percent || "0",
      tax_rate: line.tax_rate || "0",
    }));
}

/** Line totals computed exactly in minor units, mirroring the backend's rounding. */
export function totals(lines: LineDraft[], decimals: number) {
  let net = 0n;
  let tax = 0n;
  for (const line of lines) {
    if (!line.productId) continue;
    const quantity = toMinor(line.quantity || "1", 4);
    const price = toMinor(line.unit_price || "0", decimals);
    const gross = (quantity * price) / 10000n;
    const discount = toMinor(line.discount_percent || "0", 2);
    const lineNet = (gross * (10000n - discount)) / 10000n;
    const rate = toMinor(line.tax_rate || "0", 2);
    const lineTax = (lineNet * rate) / 10000n;
    net += lineNet;
    tax += lineTax;
  }
  return { net, tax, total: net + tax };
}

/** Sales settings and price lists of the current company (for defaults and price lookup). */
export function useSalesDefaults(customerPriceList: number | null | undefined) {
  const { company } = useWorkspace();
  const settings = useResource<SalesSettings>(`/sales/settings/${company.id}`);
  const lists = useResource<Page<PriceList>>(`/catalog/price-lists?company=${company.id}&is_active=true&page_size=100`);
  const priceList =
    (lists.data?.results ?? []).find((item) => item.id === customerPriceList) ??
    (lists.data?.results ?? []).find((item) => item.is_default) ??
    null;
  return { settings: settings.data, priceList };
}

export function SalesLinesEditor({
  lines,
  onChange,
  currency,
  priceListId,
  defaultTax,
  error,
  priceLabel = "Unit price",
}: {
  lines: LineDraft[];
  onChange: (lines: LineDraft[]) => void;
  currency: string;
  priceListId: number | null;
  defaultTax: string;
  error?: string;
  /** "Unit cost" on purchasing documents. */
  priceLabel?: string;
}) {
  const { t } = useWorkspace();
  const decimals = decimalsOf(currency);
  const sums = totals(lines, decimals);
  const setLine = (index: number, patch: Partial<LineDraft>) => onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const pick = async (index: number, product: Product | null) => {
    const patch: Partial<LineDraft> = {
      product,
      productId: product?.id ?? null,
      label: product ? `${product.sku} · ${product.name}` : "",
    };
    if (product && priceListId) {
      try {
        const quote = await api.get<{ unit_price: string | null }>(
          `/catalog/price-lists/${priceListId}/price?product=${product.id}&quantity=${lines[index].quantity || "1"}`,
        );
        if (quote.unit_price !== null) patch.unit_price = quote.unit_price;
      } catch {
        // No price in the list: the salesperson types one.
      }
    }
    setLine(index, patch);
  };

  const lineTotal = (line: LineDraft) => {
    const { total } = totals([line], decimals);
    return formatAmount(total, decimals);
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold">{t("Lines")}</h3>
        <Button variant="secondary" onClick={() => onChange([...lines, newLine(defaultTax)])}>
          <Plus aria-hidden className="size-4" />
          {t("Add line")}
        </Button>
      </div>
      <div className="overflow-visible rounded-xl border border-line">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[34%]" />
            <col className="w-[11%]" />
            <col className="w-[15%]" />
            <col className="w-[11%]" />
            <col className="w-[10%]" />
            <col />
            <col className="w-11" />
          </colgroup>
          <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
            <tr>
              <th scope="col" className="px-3 py-2.5 text-start font-medium">{t("Product")}</th>
              <th scope="col" className="px-2 py-2.5 text-end font-medium">{t("Quantity")}</th>
              <th scope="col" className="px-2 py-2.5 text-end font-medium">{t(priceLabel)}</th>
              <th scope="col" className="px-2 py-2.5 text-end font-medium">{t("Disc. %")}</th>
              <th scope="col" className="px-2 py-2.5 text-end font-medium">{t("VAT %")}</th>
              <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Total")}</th>
              <th scope="col" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lines.map((line, index) => (
              <tr key={index} className="align-top">
                <td className="px-2 py-2">
                  {line.productId && !line.product ? (
                    <div className="flex h-9 items-center justify-between gap-2 rounded-lg border border-line-strong bg-surface px-2.5 text-sm">
                      <span className="truncate">{line.label}</span>
                      <button type="button" className="shrink-0 text-xs text-ink-soft hover:text-ink" onClick={() => setLine(index, { productId: null, label: "", product: null })}>
                        {t("Change")}
                      </button>
                    </div>
                  ) : (
                    <ProductPicker label="" value={line.product} onChange={(product) => pick(index, product)} />
                  )}
                  <input
                    aria-label={`${t("Description")} ${index + 1}`}
                    placeholder={t("Description (optional)")}
                    value={line.description}
                    onChange={(e) => setLine(index, { description: e.target.value })}
                    className="mt-1.5 h-8 w-full rounded-lg border border-transparent bg-transparent px-2.5 text-xs text-ink-soft placeholder:text-ink-faint hover:border-line focus:border-line-strong focus:bg-surface"
                  />
                </td>
                <td className="px-1.5 py-2">
                  <input aria-label={`${t("Quantity")} ${index + 1}`} inputMode="decimal" value={line.quantity} onChange={(e) => setLine(index, { quantity: e.target.value })} className={`${LINE_INPUT} text-end tabular-nums`} />
                </td>
                <td className="px-1.5 py-2">
                  <input aria-label={`${t(priceLabel)} ${index + 1}`} inputMode="decimal" value={line.unit_price} onChange={(e) => setLine(index, { unit_price: e.target.value })} className={`${LINE_INPUT} text-end tabular-nums`} />
                </td>
                <td className="px-1.5 py-2">
                  <input aria-label={`${t("Discount %")} ${index + 1}`} inputMode="decimal" value={line.discount_percent} onChange={(e) => setLine(index, { discount_percent: e.target.value })} className={`${LINE_INPUT} text-end tabular-nums`} />
                </td>
                <td className="px-1.5 py-2">
                  <input aria-label={`${t("VAT %")} ${index + 1}`} inputMode="decimal" value={line.tax_rate} onChange={(e) => setLine(index, { tax_rate: e.target.value })} className={`${LINE_INPUT} text-end tabular-nums`} />
                </td>
                <td className="px-3 py-2 pt-4 text-end font-medium tabular-nums">{line.productId ? lineTotal(line) : <span className="text-ink-faint">—</span>}</td>
                <td className="px-1 py-2 text-center">
                  <IconButton label={t("Remove line")} disabled={lines.length <= 1} onClick={() => onChange(lines.filter((_, i) => i !== index))}>
                    <Trash2 aria-hidden className="size-4" />
                  </IconButton>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-line bg-surface-muted/40 text-sm tabular-nums">
            <tr>
              <td className="px-3 py-2 text-end text-ink-soft" colSpan={5}>{t("Subtotal")}</td>
              <td className="px-3 py-2 text-end">{formatAmount(sums.net, decimals)}</td>
              <td />
            </tr>
            <tr>
              <td className="px-3 py-2 text-end text-ink-soft" colSpan={5}>{t("VAT")}</td>
              <td className="px-3 py-2 text-end">{formatAmount(sums.tax, decimals)}</td>
              <td />
            </tr>
            <tr className="font-semibold">
              <td className="px-3 py-2.5 text-end" colSpan={5}>{t("Grand total")} · {currency}</td>
              <td className="px-3 py-2.5 text-end text-base">{formatAmount(sums.total, decimals)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </section>
  );
}

/** Read-only lines of a posted sales document. */
export function SalesLinesView({ lines, currency, extra, priceLabel = "Unit price", extraLabel = "Delivered" }: { lines: SalesLine[]; currency: string; extra?: (line: SalesLine) => React.ReactNode; priceLabel?: string; extraLabel?: string }) {
  const { t } = useWorkspace();
  const decimals = decimalsOf(currency);
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
          <tr>
            <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("Product")}</th>
            <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Quantity")}</th>
            <th scope="col" className="px-3 py-2.5 text-end font-medium">{t(priceLabel)}</th>
            <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Discount %")}</th>
            <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("VAT %")}</th>
            <th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Total")}</th>
            {extra ? <th scope="col" className="px-3 py-2.5 text-end font-medium">{t(extraLabel)}</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {lines.map((line) => (
            <tr key={line.id}>
              <td className="px-4 py-2.5">
                <span className="font-mono text-xs text-ink-soft">{line.sku}</span> <span className="font-medium">{line.product_name}</span>
                {line.description ? <span className="block text-xs text-ink-soft">{line.description}</span> : null}
                {line.product_type === "service" ? <Badge>Service</Badge> : null}
              </td>
              <td className="px-3 py-2.5 text-end tabular-nums">{qty(line.quantity)} {line.uom}</td>
              <td className="px-3 py-2.5 text-end tabular-nums">{formatAmount(line.unit_price, decimals)}</td>
              <td className="px-3 py-2.5 text-end tabular-nums">{Number(line.discount_percent) ? qty(line.discount_percent) : "—"}</td>
              <td className="px-3 py-2.5 text-end tabular-nums">{Number(line.tax_rate) ? qty(line.tax_rate) : "—"}</td>
              <td className="px-4 py-2.5 text-end font-medium tabular-nums">{formatAmount(line.total_amount ?? "0", decimals)}</td>
              {extra ? <td className="px-3 py-2.5 text-end tabular-nums">{extra(line)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
