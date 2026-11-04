"use client";

import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import type { Page, Product } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

/** Search the catalogue by SKU, model, barcode or name and pick one product. */
export function ProductPicker({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: Product | null;
  onChange: (product: Product | null) => void;
  error?: string;
}) {
  const { name, t } = useWorkspace();
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const term = query.trim();
  const results = useResource<Page<Product>>(
    open && term.length >= 2
      ? withQuery("/catalog/products", { search: term, is_active: "true", page_size: 8 })
      : null,
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
        <div className="flex items-center justify-between gap-2 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm">
          <span className="min-w-0 truncate">
            <span className="font-mono text-xs text-ink-soft">{value.sku}</span>{" "}
            <span className="font-medium">{name(value)}</span>
          </span>
          <button
            type="button"
            aria-label={t("Clear")}
            onClick={() => onChange(null)}
            className="rounded-md p-0.5 text-ink-soft hover:bg-surface-muted"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-ink-faint"
          />
          <input
            id={id}
            type="search"
            autoComplete="off"
            placeholder={t("SKU, model or name")}
            value={query}
            aria-invalid={Boolean(error)}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            className="w-full rounded-lg border border-line-strong bg-surface py-2 ps-9 pe-3 text-sm placeholder:text-ink-faint aria-invalid:border-danger"
          />
        </div>
      )}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {open && !value && term.length >= 2 ? (
        <ul
          role="listbox"
          className="absolute top-full z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-lg"
        >
          {!results.data ? (
            <li className="px-3 py-2 text-sm text-ink-soft">{t("Loading…")}</li>
          ) : results.data.results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-soft">{t("No products found.")}</li>
          ) : (
            results.data.results.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    onChange(product);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-start text-sm hover:bg-surface-muted"
                >
                  <span className="font-mono text-xs text-ink-soft">{product.sku}</span>{" "}
                  <span className="font-medium">{name(product)}</span>
                  <span className="block text-xs text-ink-soft">{product.category_name}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
