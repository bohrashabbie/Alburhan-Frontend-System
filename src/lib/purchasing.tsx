"use client";

import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { type LineDraft } from "@/components/sales-lines";
import { Badge } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { qty } from "@/lib/inventory";
import type { Page, PurchaseLine, PurchaseOrder, SalesLine } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const LABELS: Record<string, [string, "neutral" | "success" | "warning" | "danger"]> = {
  draft: ["Draft", "neutral"],
  sent: ["Sent", "warning"],
  partial: ["Partly received", "warning"],
  received: ["Received", "success"],
  closed: ["Closed", "neutral"],
  cancelled: ["Cancelled", "danger"],
  posted: ["Unpaid", "warning"],
  partially_paid: ["Partly paid", "warning"],
  paid: ["Paid", "success"],
};

export function PurchaseStatus({ status, posted = "Posted" }: { status: string; posted?: string }) {
  const { t } = useWorkspace();
  const [label, tone] = LABELS[status] ?? [status, "neutral"];
  if (status === "posted" && posted !== "Unpaid") return <Badge tone="success">{t(posted)}</Badge>;
  return <Badge tone={tone}>{t(label)}</Badge>;
}

export const PAYMENT_METHODS: [string, string][] = [
  ["bank_transfer", "Bank transfer"],
  ["cheque", "Cheque"],
  ["cash", "Cash"],
  ["letter_of_credit", "Letter of credit"],
];

/** Purchase lines use `unit_cost`; the shared editor and view speak `unit_price`. */
export function fromPurchaseLines(lines: PurchaseLine[]): LineDraft[] {
  return lines.map((line) => ({
    product: null,
    productId: line.product,
    label: `${line.receipt_number ? `${line.receipt_number} · ` : ""}${line.sku} · ${line.product_name}`,
    description: line.description,
    quantity: qty(line.quantity),
    unit_price: line.unit_cost,
    discount_percent: qty(line.discount_percent),
    tax_rate: qty(line.tax_rate),
    receipt_line: line.receipt_line ?? null,
    account: line.account ?? null,
  }));
}

export function toPurchasePayload(lines: LineDraft[]) {
  return lines
    .filter((line) => line.productId)
    .map((line) => ({
      product: line.productId,
      description: line.description,
      quantity: line.quantity || "1",
      unit_cost: line.unit_price || "0",
      discount_percent: line.discount_percent || "0",
      tax_rate: line.tax_rate || "0",
      receipt_line: line.receipt_line ?? null,
      account: line.account ?? null,
    }));
}

export function asSalesLines(lines: PurchaseLine[]): SalesLine[] {
  return lines.map((line) => ({ ...line, unit_price: line.unit_cost }));
}

/** Search the company's open purchase orders (sent or partly received) and pick one. */
export function OrderPicker({ label, value, onChange, error, filter = "open" }: { label: string; value: PurchaseOrder | null; onChange: (order: PurchaseOrder | null) => void; error?: string; filter?: "open" | "all" }) {
  const { company, t } = useWorkspace();
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = useResource<Page<PurchaseOrder>>(
    open ? withQuery("/purchasing/orders", { company: company.id, search: query.trim(), open: filter === "open" ? "true" : undefined, page_size: 8 }) : null,
  );

  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  return (
    <div ref={box} className="relative flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
      {value ? (
        <div className="flex h-10 items-center justify-between gap-2 rounded-lg border border-line-strong bg-surface px-3 text-sm">
          <span className="min-w-0 truncate"><span className="font-mono text-xs">{value.number}</span><span className="ms-2 font-medium">{value.supplier_name}</span><span className="ms-2 text-ink-soft">{value.total} {value.currency}</span></span>
          <button type="button" aria-label={t("Clear")} onClick={() => onChange(null)} className="rounded-md p-0.5 text-ink-soft hover:bg-surface-muted"><X aria-hidden className="size-4" /></button>
        </div>
      ) : (
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-ink-faint" />
          <input id={id} type="search" autoComplete="off" placeholder={t("Choose a purchase order")} value={query} aria-invalid={Boolean(error)} onFocus={() => setOpen(true)} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} className="h-10 w-full rounded-lg border border-line-strong bg-surface ps-9 pe-3 text-sm placeholder:text-ink-faint aria-invalid:border-danger" />
        </div>
      )}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {open && !value ? (
        <ul role="listbox" className="absolute top-[4.25rem] z-30 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-lg">
          {!results.data ? <li className="px-3 py-2 text-sm text-ink-soft">{t("Loading…")}</li> : results.data.results.length === 0 ? <li className="px-3 py-2 text-sm text-ink-soft">{t("No open orders.")}</li> : results.data.results.map((order) => (
            <li key={order.id}>
              <button type="button" role="option" aria-selected={false} onClick={() => { onChange(order); setQuery(""); setOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-start text-sm hover:bg-surface-muted">
                <span className="font-mono text-xs">{order.number}</span><span className="ms-2 font-medium">{order.supplier_name}</span>
                <span className="block text-xs text-ink-soft">{order.date} · {order.total} {order.currency} · {order.warehouse_name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
