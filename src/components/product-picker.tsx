"use client";

import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import type { Page, Product } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

/** Pick a product: the list shows as soon as the box is clicked; typing narrows it by SKU, model,
 * barcode or name. Arrow keys move through it, Enter picks. */
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
  const [active, setActive] = useState(0);
  // Open upwards when the box sits low on the screen (e.g. a line at the bottom of a form).
  const [upwards, setUpwards] = useState(false);
  const show = () => {
    const rect = box.current?.getBoundingClientRect();
    if (rect) setUpwards(window.innerHeight - rect.bottom < 340 && rect.top > 340);
    setOpen(true);
  };
  const term = query.trim();
  const results = useResource<Page<Product>>(
    open ? withQuery("/catalog/products", { search: term, is_active: "true", ordering: "name", page_size: 50 }) : null,
  );
  const items = results.data?.results ?? [];
  const pick = (product: Product) => {
    onChange(product);
    setQuery("");
    setOpen(false);
  };

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
            onFocus={show}
            onClick={show}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
              if (!open) show();
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setOpen(true);
                setActive((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (event.key === "Enter" && open && items[active]) {
                event.preventDefault();
                pick(items[active]);
              } else if (event.key === "Escape") {
                setOpen(false);
              }
            }}
            className="w-full rounded-lg border border-line-strong bg-surface py-2 ps-9 pe-3 text-sm placeholder:text-ink-faint aria-invalid:border-danger"
          />
        </div>
      )}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {open && !value ? (
        <ul
          role="listbox"
          className={`absolute start-0 z-30 max-h-80 w-full min-w-[22rem] overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-lg ${upwards ? "bottom-full mb-1" : "top-full mt-1"}`}
        >
          {!results.data ? (
            <li className="px-3 py-2 text-sm text-ink-soft">{t("Loading…")}</li>
          ) : items.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-soft">{t("No products found.")}</li>
          ) : (
            items.map((product, index) => (
              <li key={product.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(product)}
                  className={`block w-full rounded-lg px-3 py-2 text-start text-sm ${index === active ? "bg-surface-muted" : "hover:bg-surface-muted"}`}
                >
                  <span className="font-mono text-xs text-ink-soft">{product.sku}</span>{" "}
                  <span className="font-medium">{name(product)}</span>
                  <span className="block text-xs text-ink-soft">{product.category_name}</span>
                </button>
              </li>
            ))
          )}
          {results.data && results.data.count > items.length ? (
            <li className="px-3 pt-2 pb-1 text-xs text-ink-faint">
              {items.length} / {results.data.count} · {t("type to narrow the list")}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
