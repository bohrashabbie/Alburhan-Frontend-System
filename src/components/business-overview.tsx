"use client";

import { BarChart3, type LucideIcon, ShoppingBag, Trophy, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BarList, PairedColumns } from "@/components/charts";
import { Badge } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import type { BestSeller, Dashboard, DashboardPeriod, RecentDocument } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** A row of choices where one is on, like the period buttons at the top of the dashboard. */
function Choice<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (next: T) => void }) {
  return (
    <span role="tablist" className="inline-flex rounded-full border border-line-strong bg-surface p-0.5">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={value === key}
          onClick={() => onChange(key)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${value === key ? "bg-accent text-white" : "text-ink-soft hover:text-ink"}`}
        >
          {label}
        </button>
      ))}
    </span>
  );
}

function Figure({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5">
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon aria-hidden className="size-6" strokeWidth={1.6} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        <span className="block text-sm text-ink-soft">{label}</span>
      </span>
    </div>
  );
}

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  paid: "success", posted: "warning", partially_paid: "warning", received: "success", partial: "warning",
  sent: "neutral", accepted: "success", invoiced: "success", cancelled: "danger", expired: "danger", closed: "neutral", draft: "neutral",
};

function Sellers({ rows, show, money }: { rows: BestSeller[]; show: "quantity" | "amount"; money: (value: string) => string }) {
  const { t } = useWorkspace();
  if (!rows.length) return <p className="text-sm text-ink-soft">{t("No sales yet.")}</p>;
  return (
    <ol className="divide-y divide-line text-sm">
      {rows.map((row, index) => (
        <li key={row.product} className="flex items-center gap-3 py-2.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-ink-soft">{index + 1}</span>
          <Link href={`/inventory/items/${row.product}`} className="min-w-0 flex-1 hover:underline">
            <span className="block truncate font-medium">{row.name}</span>
            <span className="block truncate font-mono text-xs text-ink-soft">{row.sku}</span>
          </Link>
          <span className="shrink-0 font-semibold tabular-nums">{show === "quantity" ? row.quantity : money(row.amount)}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * The home page staff know from their previous system: four totals with a period switch, money
 * in and out by month, this month at a glance, bought against sold through the year, the latest
 * documents and the best sellers.
 */
export function BusinessOverview({ data }: { data: Dashboard }) {
  const { company, locale, t } = useWorkspace();
  const [period, setPeriod] = useState<DashboardPeriod>("week");
  const [tab, setTab] = useState<keyof Dashboard["recent"]>("sales");
  const money = (value: string | number) => formatMoney(value, company.currency, locale);
  const totals = data.periods[period];
  const monthName = new Intl.DateTimeFormat(locale === "ar" ? "ar-KW-u-nu-latn" : "en-GB", { month: "short" });
  const longMonth = new Intl.DateTimeFormat(locale === "ar" ? "ar-KW-u-nu-latn" : "en-GB", { month: "long", year: "numeric" });
  const label = (month: string) => monthName.format(new Date(`${month}-01T00:00:00`));
  const hint = (month: string) => longMonth.format(new Date(`${month}-01T00:00:00`));
  const recentHref: Record<keyof Dashboard["recent"], string> = {
    sales: "/sales/invoices", purchases: "/purchasing/orders", quotations: "/sales/quotations", payments: "/sales/receipts",
  };
  const rows: RecentDocument[] = data.recent[tab];
  const profit = Number(totals.profit);

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Choice
          value={period}
          onChange={setPeriod}
          options={[["today", t("Today")], ["week", t("Last 7 days")], ["month", t("This month")], ["year", t("This year")]]}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Figure icon={BarChart3} label={t("Total sale")} value={money(totals.sale)} tone="bg-[#f0ecff] text-link" />
        <Figure icon={Undo2} label={t("Sale return")} value={money(totals.sale_return)} tone="bg-warning-soft text-warning" />
        <Figure icon={ShoppingBag} label={t("Total purchase")} value={money(totals.purchase)} tone="bg-surface-muted text-ink" />
        <Figure icon={Trophy} label={t("Profit")} value={money(totals.profit)} tone={profit < 0 ? "bg-danger-soft text-danger" : "bg-[#e8f5e9] text-[#2e7d32]"} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Panel title={t("Cash flow")} action={<span className="text-xs text-ink-soft">{t("Last 7 months")} · {company.currency}</span>}>
          <PairedColumns
            title={t("Cash flow")}
            names={[t("Payment received"), t("Payment sent")]}
            format={(v) => money(v)}
            points={data.cash_flow.map((p) => ({ label: label(p.month), hint: hint(p.month), first: Number(p.received), second: Number(p.sent) }))}
          />
        </Panel>
        <Panel title={hint(data.today.slice(0, 7))}>
          <BarList
            format={(v) => money(v)}
            points={[
              { label: t("Revenue"), value: Number(data.month_mix.revenue) },
              { label: t("Purchase"), value: Number(data.month_mix.purchase) },
              { label: t("Expense"), value: Number(data.month_mix.expense) },
            ]}
          />
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title={t("Yearly report")} action={<span className="text-xs text-ink-soft">{data.today.slice(0, 4)} · {company.currency}</span>}>
          <PairedColumns
            title={t("Yearly report")}
            names={[t("Purchased amount"), t("Sold amount")]}
            format={(v) => money(v)}
            height={250}
            width={1200}
            points={data.yearly.map((p) => ({ label: label(p.month), hint: hint(p.month), first: Number(p.purchased), second: Number(p.sold) }))}
          />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Panel
          title={t("Recent transactions")}
          action={
            <Choice
              value={tab}
              onChange={setTab}
              options={[["sales", t("Sale")], ["purchases", t("Purchase")], ["quotations", t("Quotation")], ["payments", t("Payment")]]}
            />
          }
        >
          {rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs tracking-wide text-ink-soft uppercase">
                  <tr>
                    <th className="pb-2 text-start font-medium">{t("Date")}</th>
                    <th className="pb-2 text-start font-medium">{t("Reference")}</th>
                    <th className="pb-2 text-start font-medium">{tab === "purchases" ? t("Supplier") : t("Customer")}</th>
                    <th className="pb-2 text-start font-medium">{t("Status")}</th>
                    <th className="pb-2 text-end font-medium">{t("Grand total")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2.5 whitespace-nowrap">{formatDate(row.date, locale)}</td>
                      <td className="py-2.5"><Link href={`${recentHref[tab]}?open=${row.id}`} className="font-mono text-xs text-link hover:underline">{row.number}</Link></td>
                      <td className="max-w-[14rem] truncate py-2.5">{row.party}</td>
                      <td className="py-2.5"><Badge tone={STATUS_TONE[row.status] ?? "neutral"}>{t(row.status_label)}</Badge></td>
                      <td className="py-2.5 text-end font-medium tabular-nums">{formatMoney(row.amount, row.currency, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">{t("Nothing here yet.")}</p>
          )}
        </Panel>
        <Panel title={t("Best seller this month")} action={<span className="text-xs text-ink-soft">{t("Top 5 by quantity")}</span>}>
          <Sellers rows={data.best_sellers.month_quantity} show="quantity" money={money} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title={`${t("Best seller")} ${data.today.slice(0, 4)}`} action={<span className="text-xs text-ink-soft">{t("Top 5 by quantity")}</span>}>
          <Sellers rows={data.best_sellers.year_quantity} show="quantity" money={money} />
        </Panel>
        <Panel title={`${t("Best seller")} ${data.today.slice(0, 4)}`} action={<span className="text-xs text-ink-soft">{t("Top 5 by value")}</span>}>
          <Sellers rows={data.best_sellers.year_amount} show="amount" money={money} />
        </Panel>
      </div>
    </>
  );
}
