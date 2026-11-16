"use client";

import { ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Flag, useCountries } from "@/components/country";
import { DIAL_CODES, joinPhone, PREFERRED, splitPhone } from "@/lib/dial-codes";
import { useWorkspace } from "@/lib/workspace";

/**
 * A phone number with its country code: a flag + code dropdown (searchable by country or code)
 * beside the number. Saves one string such as "+965 9988 7766". Starts on the company's country.
 * `compact` drops the label for use inside table rows.
 */
export function PhoneField({
  label,
  value,
  onChange,
  hint,
  error,
  disabled,
  required,
  compact = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  compact?: boolean;
  placeholder?: string;
}) {
  const { company, name, t } = useWorkspace();
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const home = DIAL_CODES[company.country] ? company.country : "KW";
  const parsed = splitPhone(value ?? "", home);
  // Remember a chosen country while the number is still empty.
  const [picked, setPicked] = useState<string | null>(null);
  const country = parsed.number ? parsed.country : (picked ?? parsed.country);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const countries = useCountries();

  const list = useMemo(() => {
    const term = query.trim().toLowerCase().replace(/^\+/, "");
    const rows = countries
      .filter((item) => DIAL_CODES[item.code])
      .filter(
        (item) =>
          !term ||
          DIAL_CODES[item.code].startsWith(term) ||
          item.code.toLowerCase() === term ||
          item.name.toLowerCase().includes(term) ||
          (item.name_ar ?? "").includes(term),
      )
      .sort((a, b) => name(a).localeCompare(name(b)));
    if (term) return rows;
    const top = PREFERRED.map((code) => rows.find((item) => item.code === code)).filter(Boolean) as typeof rows;
    return [...top, ...rows.filter((item) => !PREFERRED.includes(item.code))];
  }, [countries, query, name]);

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

  const choose = (code: string) => {
    setPicked(code);
    onChange(joinPhone(code, parsed.number));
    setOpen(false);
    setQuery("");
  };

  const height = compact ? "h-9" : "h-10";
  return (
    <div ref={box} className={`relative flex flex-col ${compact ? "" : "gap-1.5"}`}>
      {compact ? null : (
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className={`flex ${height} overflow-hidden rounded-lg border bg-surface ${error ? "border-danger" : "border-line-strong"} ${disabled ? "bg-surface-muted" : ""}`}>
        <button
          type="button"
          disabled={disabled}
          aria-label={`${t("Country code")}: +${DIAL_CODES[country]}`}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex shrink-0 items-center gap-1.5 border-e border-line-strong px-2.5 text-sm tabular-nums hover:bg-surface-muted disabled:cursor-not-allowed"
        >
          <Flag code={country} />
          <span dir="ltr">+{DIAL_CODES[country]}</span>
          <ChevronDown aria-hidden className="size-3.5 text-ink-faint" />
        </button>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          dir="ltr"
          autoComplete="tel-national"
          aria-label={compact ? label : undefined}
          aria-invalid={Boolean(error)}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          value={parsed.number}
          onChange={(event) => onChange(joinPhone(country, event.target.value))}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none placeholder:text-ink-faint disabled:cursor-not-allowed disabled:text-ink-soft"
        />
      </div>
      {open ? (
        <div className="absolute top-full start-0 z-40 mt-1 w-72 rounded-xl border border-line bg-surface p-1.5 shadow-lg">
          <div className="relative mb-1">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 start-2.5 size-4 -translate-y-1/2 text-ink-faint" />
            <input
              ref={search}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && list[0]) {
                  event.preventDefault();
                  choose(list[0].code);
                }
              }}
              placeholder={t("Country or code")}
              aria-label={t("Country or code")}
              className="h-9 w-full rounded-lg border border-line-strong bg-surface ps-8 pe-2 text-sm"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto">
            {list.map((item, index) => (
              <li key={item.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={item.code === country}
                  onClick={() => choose(item.code)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-sm hover:bg-surface-muted ${item.code === country ? "bg-surface-muted font-medium" : ""} ${!query && index === PREFERRED.length - 1 ? "mb-1 border-b border-line pb-2.5" : ""}`}
                >
                  <Flag code={item.code} />
                  <span className="min-w-0 flex-1 truncate">{name(item)}</span>
                  <span className="text-ink-soft tabular-nums" dir="ltr">+{DIAL_CODES[item.code]}</span>
                </button>
              </li>
            ))}
            {list.length === 0 ? <li className="px-2.5 py-2 text-sm text-ink-soft">{t("No countries match.")}</li> : null}
          </ul>
        </div>
      ) : null}
      {!compact && error ? <p className="text-sm text-danger">{error}</p> : null}
      {!compact && !error && hint ? <p className="text-sm text-ink-soft">{hint}</p> : null}
    </div>
  );
}
