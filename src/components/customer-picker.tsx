"use client";

import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import type { Customer, Page } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

/** Search the current company's customers by name, code, mobile or contact and pick one. */
export function CustomerPicker({
  label,
  value,
  onChange,
  error,
  disabled,
}: {
  label: string;
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  error?: string;
  disabled?: boolean;
}) {
  const { company, name, t } = useWorkspace();
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const term = query.trim();
  const results = useResource<Page<Customer>>(
    open ? withQuery("/partners/customers", { company: company.id, search: term, is_active: "true", page_size: 8 }) : null,
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
            <span className="font-medium">{name(value)}</span>
            <span className="ms-2 font-mono text-xs text-ink-soft">{value.code}</span>
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
            placeholder={t("Choose a customer")}
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
            <li className="px-3 py-2 text-sm text-ink-soft">{t("No customers found.")}</li>
          ) : (
            results.data.results.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    onChange(customer);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-start text-sm hover:bg-surface-muted"
                >
                  <span className="font-medium">{name(customer)}</span>
                  <span className="ms-2 font-mono text-xs text-ink-soft">{customer.code}</span>
                  <span className="block text-xs text-ink-soft">{customer.mobile || customer.phone || customer.email || "—"}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
