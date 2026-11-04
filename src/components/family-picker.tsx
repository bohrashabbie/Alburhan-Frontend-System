"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { PhotoThumb } from "@/components/photo-upload";
import { useResource } from "@/lib/hooks";
import type { Page, ProductCategory } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const GROUP_NAMES: Record<string, string> = {
  indoor: "Indoor",
  outdoor: "Outdoor",
  magnetic_linear: "Magnetic & linear",
  accessory: "Accessories & drivers",
  service: "Services",
};

/** Every active product family, shared by the catalogue screens. */
export function useFamilies() {
  const { data } = useResource<Page<ProductCategory>>("/catalog/categories?page_size=500&is_active=true");
  return data?.results ?? [];
}

/** Pick a product family from a searchable grid of photo cards, grouped by indoor/outdoor/… */
export function FamilyPicker({
  label,
  value,
  onChange,
  error,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  const { name, t } = useWorkspace();
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const families = useFamilies();
  const selected = families.find((item) => String(item.id) === value);

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matches = families.filter(
      (item) => !term || item.name.toLowerCase().includes(term) || (item.name_ar ?? "").includes(term),
    );
    return Object.keys(GROUP_NAMES)
      .map((group) => ({ group, items: matches.filter((item) => item.group === group) }))
      .filter((entry) => entry.items.length > 0);
  }, [families, query]);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const outside = (event: Event) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const choose = (family: ProductCategory) => {
    onChange(String(family.id));
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={box} className="relative flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-describedby={error ? `${id}-error` : undefined}
        data-invalid={Boolean(error)}
        onClick={() => setOpen(!open)}
        className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-line-strong bg-surface ps-1.5 pe-3 text-start text-sm text-ink data-[invalid=true]:border-danger disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-soft"
      >
        {selected ? (
          <>
            <PhotoThumb url={selected.image_url} name={selected.name} size="size-7" rounded="rounded-md" />
            <span className="min-w-0 flex-1 truncate">{name(selected)}</span>
          </>
        ) : (
          <span className="flex-1 ps-1.5 text-ink-faint">{t("Choose a family")}</span>
        )}
        <ChevronDown aria-hidden className="size-4 shrink-0 text-ink-soft" />
      </button>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      {open ? (
        <div className="absolute top-[4.25rem] z-40 w-[min(34rem,calc(100vw-3rem))] rounded-xl border border-line bg-surface p-2 shadow-lg">
          <div className="relative mb-2">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-ink-faint" />
            <input
              ref={search}
              type="search"
              aria-label={t("Search")}
              placeholder={t("Search")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-9 w-full rounded-lg border border-line-strong bg-canvas ps-9 pe-3 text-sm placeholder:text-ink-faint"
            />
          </div>
          <div role="listbox" aria-label={label} className="max-h-80 overflow-y-auto">
            {groups.length === 0 ? (
              <p className="px-3 py-2 text-sm text-ink-soft">{t("No families found.")}</p>
            ) : (
              groups.map(({ group, items }) => (
                <div key={group} className="mb-2">
                  <p className="px-2 pt-1 pb-1.5 text-xs font-semibold tracking-wide text-ink-soft uppercase">
                    {t(GROUP_NAMES[group])}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {items.map((family) => {
                      const active = String(family.id) === value;
                      return (
                        <button
                          key={family.id}
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => choose(family)}
                          className={`flex items-center gap-2.5 rounded-lg border p-1.5 text-start text-sm transition-colors ${
                            active ? "border-accent bg-accent-soft font-medium" : "border-transparent hover:bg-surface-muted"
                          }`}
                        >
                          <PhotoThumb url={family.image_url} name={family.name} size="size-12" rounded="rounded-md" />
                          <span className="min-w-0 flex-1 leading-tight">{name(family)}</span>
                          {active ? <Check aria-hidden className="size-4 shrink-0 text-accent" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
