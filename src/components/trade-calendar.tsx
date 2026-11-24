"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Button, ErrorBanner, Loading, PageHeader } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { decimalsOf, formatAmount } from "@/lib/money";
import type { TradeCalendar } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

/**
 * Sales or purchases as a calendar: every day of a month, or every month of a year, with the
 * number of documents, the net amount, the tax and the total, like the previous system's
 * "Daily sale" and "Monthly sale" pages.
 */
export function TradeCalendarReport({ kind, by }: { kind: "sale" | "purchase"; by: "day" | "month" }) {
  const { company, locale, t } = useWorkspace();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const report = useResource<TradeCalendar>(withQuery("/reports/trade-calendar", { company: company.id, kind, year, month: by === "day" ? month : undefined }));
  const decimals = decimalsOf(company.currency);
  const tag = locale === "ar" ? "ar-KW-u-nu-latn" : "en-GB";
  const heading = by === "day" ? new Intl.DateTimeFormat(tag, { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1)) : String(year);
  const step = (direction: 1 | -1) => {
    if (by === "month") return setYear(year + direction);
    const next = new Date(year, month - 1 + direction, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  };
  const title = `${by === "day" ? "Daily" : "Monthly"} ${kind === "sale" ? "sale" : "purchase"}`;
  const r = report.data;
  const today = now.toLocaleDateString("en-CA");
  const amount = (value: string) => formatAmount(value, decimals);
  // Monday-first grid: blanks before the 1st so each date sits under its weekday.
  const lead = by === "day" ? (new Date(year, month - 1, 1).getDay() + 6) % 7 : 0;
  const weekdays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(tag, { weekday: "short" }).format(new Date(2024, 0, 1 + index)));

  return (
    <>
      <PageHeader title={t(title)} description={`${t(kind === "sale" ? "Posted invoices" : "Posted supplier bills")} · ${company.currency}`} />
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-3 py-2">
        <Button variant="secondary" onClick={() => step(-1)}><ChevronLeft aria-hidden className="size-4 rtl:-scale-x-100" />{t("Previous")}</Button>
        <p className="text-lg font-semibold">{heading}</p>
        <Button variant="secondary" onClick={() => step(1)}>{t("Next")}<ChevronRight aria-hidden className="size-4 rtl:-scale-x-100" /></Button>
      </div>
      <ErrorBanner error={report.error} />
      {!r ? (report.error ? null : <Loading label={t("Loading…")} />) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[[t(kind === "sale" ? "Invoices" : "Bills"), String(r.totals.count)], [t("Net amount"), amount(r.totals.net)], [t("Tax"), amount(r.totals.tax)], [t("Grand total"), amount(r.totals.total)]].map(([label, value], index) => (
              <div key={label} className={`rounded-xl border border-line bg-surface p-3 ${index === 3 ? "bg-surface-muted/40" : ""}`}><p className="text-xs text-ink-soft">{label}</p><p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p></div>
            ))}
          </div>
          {by === "day" ? (
            <div className="hidden grid-cols-7 gap-2 pb-2 text-center text-xs font-medium text-ink-soft md:grid">
              {weekdays.map((name) => <span key={name}>{name}</span>)}
            </div>
          ) : null}
          <div className={`grid gap-2 ${by === "day" ? "grid-cols-2 sm:grid-cols-4 md:grid-cols-7" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}`}>
            {Array.from({ length: lead }, (_, index) => <span key={`lead-${index}`} className="hidden md:block" />)}
            {r.rows.map((row) => {
              const date = new Date(`${row.date}T00:00:00`);
              const empty = row.count === 0;
              return (
                <div key={row.date} className={`min-h-24 rounded-xl border p-2.5 text-xs ${row.date === today ? "border-link" : "border-line"} ${empty ? "bg-surface-muted/30 text-ink-faint" : "bg-surface"}`}>
                  <p className={`text-sm font-semibold ${empty ? "" : "text-ink"}`}>{by === "day" ? date.getDate() : new Intl.DateTimeFormat(tag, { month: "long" }).format(date)}</p>
                  {empty ? null : (
                    <dl className="mt-1.5 space-y-0.5 tabular-nums">
                      <div className="flex justify-between gap-2"><dt className="text-ink-soft">{t(kind === "sale" ? "Invoices" : "Bills")}</dt><dd>{row.count}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-ink-soft">{t("Net")}</dt><dd>{amount(row.net)}</dd></div>
                      {Number(row.tax) ? <div className="flex justify-between gap-2"><dt className="text-ink-soft">{t("Tax")}</dt><dd>{amount(row.tax)}</dd></div> : null}
                      <div className="flex justify-between gap-2 font-semibold text-ink"><dt>{t("Total")}</dt><dd>{amount(row.total)}</dd></div>
                    </dl>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
