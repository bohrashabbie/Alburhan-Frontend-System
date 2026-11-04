"use client";

import { ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { useResource } from "@/lib/hooks";
import type { Country, Page } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

/** A country flag from /public/flags (3:2). No code shows a neutral placeholder. */
export function Flag({ code, className = "h-3.5" }: { code?: string | null; className?: string }) {
  if (!code) {
    return (
      <span aria-hidden className={`inline-block aspect-[3/2] rounded-[2px] bg-surface-muted ${className}`} />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static SVGs, no optimisation needed
    <img
      src={`/flags/${code.toUpperCase()}.svg`}
      alt=""
      loading="lazy"
      className={`inline-block aspect-[3/2] shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgb(0_0_0/0.08)] ${className}`}
    />
  );
}

/** Every country, loaded once and shared by all pickers and tables. */
export function useCountries() {
  const { data } = useResource<Page<Country>>("/organization/countries?page_size=500");
  return data?.results ?? [];
}

/** Flag and country name, for tables. */
export function CountryLabel({ code }: { code?: string | null }) {
  const { name } = useWorkspace();
  const countries = useCountries();
  if (!code) return <span className="text-ink-faint">—</span>;
  const country = countries.find((item) => item.code === code);
  return (
    <span className="inline-flex items-center gap-2">
      <Flag code={code} />
      {country ? name(country) : code}
    </span>
  );
}

/** A searchable dropdown of every country with its flag. */
export function CountryPicker({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (code: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const { name, t } = useWorkspace();
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const countries = useCountries();
  const selected = countries.find((item) => item.code === value);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    return countries
      .filter(
        (item) =>
          !term ||
          item.code.toLowerCase() === term ||
          item.name.toLowerCase().includes(term) ||
          (item.name_ar ?? "").includes(term),
      )
      .sort((a, b) => name(a).localeCompare(name(b)));
  }, [countries, query, name]);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const outside = (event: Event) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Closes just the list, not the panel it sits in.
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

  const choose = (code: string) => {
    onChange(code);
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
        className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-line-strong bg-surface px-3 text-start text-sm text-ink data-[invalid=true]:border-danger disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-soft"
      >
        {selected ? (
          <>
            <Flag code={selected.code} />
            <span className="min-w-0 flex-1 truncate">{name(selected)}</span>
          </>
        ) : (
          <span className="flex-1 text-ink-faint">{t("Choose a country")}</span>
        )}
        <ChevronDown aria-hidden className="size-4 shrink-0 text-ink-soft" />
      </button>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-ink-soft">{hint}</p>
      ) : null}

      {open ? (
        <div className="absolute top-[4.25rem] z-40 w-full rounded-xl border border-line bg-surface p-1.5 shadow-lg">
          <div className="relative mb-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-ink-faint"
            />
            <input
              ref={search}
              type="search"
              aria-label={t("Search")}
              placeholder={t("Search")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && matches[0]) {
                  event.preventDefault();
                  choose(matches[0].code);
                }
              }}
              className="h-9 w-full rounded-lg border border-line-strong bg-canvas ps-9 pe-3 text-sm placeholder:text-ink-faint"
            />
          </div>
          <ul role="listbox" aria-label={label} className="max-h-64 overflow-y-auto">
            {!required && value ? (
              <li>
                <button
                  type="button"
                  onClick={() => choose("")}
                  className="w-full rounded-lg px-3 py-2 text-start text-sm text-ink-soft hover:bg-surface-muted"
                >
                  {t("None")}
                </button>
              </li>
            ) : null}
            {matches.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-soft">{t("No countries found.")}</li>
            ) : (
              matches.map((country) => (
                <li key={country.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={country.code === value}
                    onClick={() => choose(country.code)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm hover:bg-surface-muted aria-selected:bg-accent-soft aria-selected:font-medium"
                  >
                    <Flag code={country.code} />
                    <span className="min-w-0 flex-1 truncate">{name(country)}</span>
                    <span className="font-mono text-xs text-ink-faint">{country.code}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
