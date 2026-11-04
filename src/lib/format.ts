import type { Locale } from "@/lib/i18n";

/** Minor units per currency. KWD has 3 decimals; the API's /currencies is the source of truth. */
const DECIMALS: Record<string, number> = { KWD: 3, AED: 2, CNY: 2, EGP: 2, USD: 2, EUR: 2 };

/**
 * Formats an API money string (e.g. "1250.500") for display. Formatting only: never do money
 * maths in JavaScript numbers; the backend calculates and rounds.
 */
export function formatMoney(amount: string | number, currency: string, locale: Locale = "en") {
  const decimals = DECIMALS[currency] ?? 2;
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) return String(amount);
  return new Intl.NumberFormat(locale === "ar" ? "ar-KW" : "en-KW", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(value: string | null | undefined, locale: Locale = "en") {
  if (!value) return "—";
  const date = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-KW" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function fullName(person: { first_name: string; last_name: string; email: string }) {
  return [person.first_name, person.last_name].filter(Boolean).join(" ") || person.email;
}
