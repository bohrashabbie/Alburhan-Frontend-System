"use client";

import { Check, Trash2 } from "lucide-react";
import { useState } from "react";

import { ProductPicker } from "@/components/product-picker";
import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import { Badge, Button, ErrorBanner, IconButton, TextField } from "@/components/ui";
import { api, withQuery } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { useAction, useResource } from "@/lib/hooks";
import type { Currency, Page, PriceList, PriceListItem, Product } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function PriceRow({ item, canEdit, onChanged }: { item: PriceListItem; canEdit: boolean; onChanged: () => void }) {
  const { locale, t } = useWorkspace();
  const [price, setPrice] = useState(item.unit_price);
  const action = useAction();
  const dirty = price !== item.unit_price;

  const save = () =>
    action.run(async () => {
      await api.patch(`/catalog/price-list-items/${item.id}`, { unit_price: price });
      onChanged();
    });
  const remove = () =>
    action.run(async () => {
      await api.delete(`/catalog/price-list-items/${item.id}`);
      onChanged();
    });

  return (
    <tr className="align-middle">
      <td className="px-4 py-2.5">
        <span className="block font-mono text-xs text-ink-soft">{item.sku}</span>
        <span className="block">{item.product_name}</span>
        {action.error ? <span className="block text-xs text-danger">{action.field("unit_price") ?? action.error.message}</span> : null}
      </td>
      <td className="px-4 py-2.5 text-end tabular-nums">{Number(item.min_quantity)}</td>
      <td className="px-4 py-2.5">
        {canEdit ? (
          <input
            aria-label={`${t("Price")} ${item.sku}`}
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="w-28 rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-end text-sm tabular-nums"
          />
        ) : (
          <span className="tabular-nums">{formatMoney(item.unit_price, item.currency, locale)}</span>
        )}
      </td>
      <td className="px-2 py-2.5">
        {canEdit ? (
          <span className="flex justify-end gap-1.5">
            {dirty ? (
              <IconButton label={t("Save")} onClick={save}>
                <Check aria-hidden className="size-4" />
              </IconButton>
            ) : null}
            <IconButton label={t("Delete")} onClick={remove}>
              <Trash2 aria-hidden className="size-4" />
            </IconButton>
          </span>
        ) : null}
      </td>
    </tr>
  );
}

/** The products and prices inside one price list. */
function PriceItems({ priceList }: { priceList: PriceList }) {
  const { can, t } = useWorkspace();
  const path = withQuery("/catalog/price-list-items", { price_list: priceList.id, page_size: 500 });
  const items = useResource<Page<PriceListItem>>(path);
  const [product, setProduct] = useState<Product | null>(null);
  const [price, setPrice] = useState("");
  const [minQuantity, setMinQuantity] = useState("1");
  const action = useAction();
  const canEdit = can("catalog.price_list.update");

  const add = () =>
    action.run(async () => {
      await api.post("/catalog/price-list-items", {
        price_list: priceList.id,
        product: product?.id,
        unit_price: price,
        min_quantity: minQuantity || "1",
      });
      setProduct(null);
      setPrice("");
      setMinQuantity("1");
      await items.mutate();
    });

  const rows = items.data?.results ?? [];

  return (
    <section className="border-t border-line pt-6">
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-bold">{t("Prices")}</h3>
        <span className="text-sm text-ink-soft tabular-nums">
          {rows.length} · {priceList.currency}
        </span>
      </div>

      {canEdit ? (
        <div className="mt-3 grid items-end gap-3 rounded-xl border border-line bg-surface-muted/40 p-4 sm:grid-cols-[minmax(0,1fr)_7rem_8rem_auto]">
          <ProductPicker label={t("Product")} value={product} onChange={setProduct} error={action.field("product")} />
          <TextField
            label={t("Min. quantity")}
            inputMode="decimal"
            value={minQuantity}
            error={action.field("min_quantity")}
            onChange={(event) => setMinQuantity(event.target.value)}
          />
          <TextField
            label={`${t("Price")} (${priceList.currency})`}
            inputMode="decimal"
            value={price}
            error={action.field("unit_price")}
            onChange={(event) => setPrice(event.target.value)}
          />
          <Button disabled={!product || !price} pending={action.pending} onClick={add}>
            {t("Add")}
          </Button>
          <div className="sm:col-span-4">
            <ErrorBanner error={action.error} hideFields />
          </div>
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
            <tr>
              <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("Product")}</th>
              <th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Min. quantity")}</th>
              <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("Price")}</th>
              <th scope="col" className="w-24 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-soft">
                  {t("No prices yet.")}
                </td>
              </tr>
            ) : (
              rows.map((item) => (
                <PriceRow key={`${item.id}-${item.unit_price}`} item={item} canEdit={canEdit} onChanged={() => items.mutate()} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function PriceListsPage() {
  const { company, locale, name } = useWorkspace();
  const currencies = useResource<Page<Currency>>("/organization/currencies");
  const currencyOptions = (currencies.data?.results ?? []).map(
    (item) => [item.code, `${item.code} · ${name(item)}`] as [string, string],
  );

  return (
    <ResourcePage<PriceList>
      title="Price lists"
      description={`Selling prices of ${name(company)}. Customers without their own list get the default one.`}
      endpoint="/catalog/price-lists"
      permission="catalog.price_list"
      noun="price list"
      wide
      query={{ company: company.id }}
      columns={[
        {
          label: "Name",
          render: (row) => (
            <span className="flex items-center gap-2 font-medium">
              {name(row)}
              {row.is_default ? <Badge tone="success">Default</Badge> : null}
            </span>
          ),
        },
        { label: "Currency", render: (row) => row.currency },
        { label: "Products", render: (row) => <span className="tabular-nums">{row.item_count}</span> },
        {
          label: "Valid",
          render: (row) =>
            row.valid_from || row.valid_to
              ? `${formatDate(row.valid_from, locale)} – ${formatDate(row.valid_to, locale)}`
              : "Always",
        },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "name", label: "Name", required: true, hint: "e.g. Retail, Contractors" },
        { name: "name_ar", label: "Name (Arabic)" },
        { name: "code", label: "Code", required: true, lockOnEdit: true },
        { name: "currency", label: "Currency", type: "select", required: true, options: currencyOptions },
        { name: "valid_from", label: "Valid from", type: "date", nullable: true },
        { name: "valid_to", label: "Valid to", type: "date", nullable: true },
        { name: "is_default", label: "Default for this company", type: "checkbox" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={(row) => ({
        name: row?.name ?? "",
        name_ar: row?.name_ar ?? "",
        code: row?.code ?? "",
        currency: row?.currency ?? (company as { currency: string }).currency,
        valid_from: row?.valid_from ?? "",
        valid_to: row?.valid_to ?? "",
        is_default: row?.is_default ?? false,
        is_active: row?.is_active ?? true,
      })}
      toPayload={() => ({ company: company.id })}
      drawerExtra={(row) => <PriceItems priceList={row} />}
    />
  );
}
