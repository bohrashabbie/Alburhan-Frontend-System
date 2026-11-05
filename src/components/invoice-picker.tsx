"use client";

import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { withQuery } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import { decimalsOf, formatAmount } from "@/lib/money";
import type { Invoice, Page } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

/** Search posted invoices by number or customer and pick one (for deliveries and credit notes). */
export function InvoicePicker({
  label,
  value,
  onChange,
  error,
  disabled,
  customer,
}: {
  label: string;
  value: Invoice | null;
  onChange: (invoice: Invoice | null) => void;
  error?: string;
  disabled?: boolean;
  /** Limit to one customer's invoices. */
  customer?: number | null;
}) {
  const { company, locale, t } = useWorkspace();
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = useResource<Page<Invoice>>(
    open ? withQuery("/sales/invoices", { company: company.id, search: query.trim(), open: "true", customer: customer ?? "", page_size: 8 }) : null,
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
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {value ? (
        <div className="flex h-10 items-center justify-between gap-2 rounded-lg border border-line-strong bg-surface px-3 text-sm">
          <span className="min-w-0 truncate">
            <span className="font-mono text-xs">{value.number}</span>
            <span className="ms-2 font-medium">{value.customer_name}</span>
            <span className="ms-2 text-ink-soft tabular-nums">{formatAmount(value.total, decimalsOf(value.currency))} {value.currency}</span>
          </span>
          {!disabled ? (
            <button type="button" aria-label={t("Clear")} onClick={() => onChange(null)} className="rounded-md p-0.5 text-ink-soft hover:bg-surface-muted">
              <X aria-hidden className="size-4" />
            </button>
          ) : null}
        </div>
      ) : (
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-ink-faint" />
          <input
            id={id}
            type="search"
            autoComplete="off"
            disabled={disabled}
            placeholder={t("Invoice number or customer")}
            value={query}
            aria-invalid={Boolean(error)}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            className="h-10 w-full rounded-lg border border-line-strong bg-surface ps-9 pe-3 text-sm placeholder:text-ink-faint aria-invalid:border-danger disabled:bg-surface-muted"
          />
        </div>
      )}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {open && !value ? (
        <ul role="listbox" className="absolute top-[4.25rem] z-30 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-lg">
          {!results.data ? (
            <li className="px-3 py-2 text-sm text-ink-soft">{t("Loading…")}</li>
          ) : results.data.results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-soft">{t("No open invoices found.")}</li>
          ) : (
            results.data.results.map((invoice) => (
              <li key={invoice.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    onChange(invoice);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-sm hover:bg-surface-muted"
                >
                  <span className="min-w-0">
                    <span className="font-mono text-xs">{invoice.number}</span>
                    <span className="ms-2 font-medium">{invoice.customer_name}</span>
                    <span className="block text-xs text-ink-soft">{formatDate(invoice.date, locale)}</span>
                  </span>
                  <span className="shrink-0 text-end tabular-nums">
                    <span className="block">{formatAmount(invoice.total, decimalsOf(invoice.currency))} {invoice.currency}</span>
                    <span className="block text-xs text-ink-soft">{t("Due")} {formatAmount(invoice.amount_due, decimalsOf(invoice.currency))}</span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
