/**
 * Exact money arithmetic for forms (totals, differences) using integers of the currency's minor
 * unit, so 0.1 + 0.2 is never 0.30000000000000004. The backend still does the real calculation.
 */
export function toMinor(value: string | number | null | undefined, decimals: number): bigint {
  const text = String(value ?? "").trim();
  if (!/^-?\d*(\.\d*)?$/.test(text) || text === "" || text === "-" || text === ".") return 0n;
  const negative = text.startsWith("-");
  const [whole, fraction = ""] = text.replace("-", "").split(".");
  const digits = (whole || "0") + fraction.padEnd(decimals, "0").slice(0, decimals);
  const minor = BigInt(digits);
  return negative ? -minor : minor;
}

export function fromMinor(minor: bigint, decimals: number): string {
  const negative = minor < 0n;
  const digits = (negative ? -minor : minor).toString().padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = decimals ? `.${digits.slice(-decimals)}` : "";
  return `${negative ? "-" : ""}${whole}${fraction}`;
}

/** Thousands separators, fixed decimals: 1234.5 → "1,234.500" for KWD. */
export function formatAmount(value: string | bigint, decimals: number): string {
  const text = typeof value === "bigint" ? fromMinor(value, decimals) : fromMinor(toMinor(value, decimals), decimals);
  const [whole, fraction] = text.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${grouped}.${fraction}` : grouped;
}

export const CURRENCY_DECIMALS: Record<string, number> = { KWD: 3, BHD: 3, OMR: 3, JOD: 3, AED: 2, CNY: 2, EGP: 2, USD: 2, EUR: 2, SAR: 2 };
export const decimalsOf = (currency: string) => CURRENCY_DECIMALS[currency] ?? 2;
