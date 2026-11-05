"use client";

import Link from "next/link";

import { BarList, ColumnChart, StatTile } from "@/components/charts";
import { EmptyState, ErrorBanner, Loading, PageHeader } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { formatMoney, fullName } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import type { Dashboard } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function OverviewPage() {
  const { me, company, branch, can, canSee, locale, name, t } = useWorkspace();
  const allowed = can("reports.dashboard.view") || canSee("reports.dashboard.view");
  const data = useResource<Dashboard>(allowed ? withQuery("/reports/dashboard", { company: company.id, branch: branch?.id }) : null);
  const money = (value: string | number) => formatMoney(value, company.currency, locale);
  const header = <PageHeader title={t("Home")} description={`${fullName(me)} · ${name(company)}${branch ? ` · ${name(branch)}` : ""}`} />;

  if (!allowed) {
    return (
      <>
        {header}
        <EmptyState title={t("Welcome to Al-Burhan ERP")} description="Use the icons on the left to open your areas." />
      </>
    );
  }
  if (data.error) return <>{header}<ErrorBanner error={data.error} /></>;
  if (!data.data) return <>{header}<Loading label={t("Loading…")} /></>;
  const d = data.data;
  const change = d.sales.change_percent === null ? null : `${Number(d.sales.change_percent) >= 0 ? "+" : ""}${d.sales.change_percent}% ${t("vs last month")}`;
  const dayFormat = new Intl.DateTimeFormat(locale === "ar" ? "ar-KW-u-nu-latn" : "en-GB", { day: "numeric", month: "short" });
  const series = d.sales.series.map((p) => {
    const date = new Date(`${p.date}T00:00:00`);
    return { label: String(date.getDate()), value: Number(p.amount), hint: dayFormat.format(date) };
  });
  const operations: [string, string, string, string][] = [
    [t("Payables"), money(d.payables.total), Number(d.payables.overdue) > 0 ? `${money(d.payables.overdue)} ${t("overdue")}` : `${d.payables.count} ${t("open bills")}`, "/purchasing/bills"],
    [t("Stock value"), money(d.stock_value), t("at average cost"), "/inventory/stock"],
    [t("Active projects"), String(d.projects.active), `${money(d.projects.contract_value)} ${t("contracted")}`, "/projects/list"],
    [t("Jobs today"), String(d.jobs_today), t("installation"), "/installation/schedule"],
    [t("Open purchase orders"), String(d.purchase_orders.open), money(d.purchase_orders.value), "/purchasing/orders"],
    [t("Open POS shifts"), String(d.open_shifts), t("registers selling now"), "/pos/shifts"],
  ];

  return (
    <>
      {header}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={t("Sales today")} value={money(d.sales.today)} hint={`${d.sales.today_count} ${t("invoices")}`} />
        <StatTile label={t("Sales this month")} value={money(d.sales.month)} delta={change} hint={`${d.sales.month_count} ${t("invoices")}`} />
        <StatTile label={t("Receivables")} value={money(d.receivables.total)} hint={Number(d.receivables.overdue) > 0 ? `${money(d.receivables.overdue)} ${t("overdue")}` : `${d.receivables.count} ${t("open invoices")}`} tone={Number(d.receivables.overdue) > 0 ? "warning" : undefined} />
        <StatTile label={t("Cash & bank")} value={money(d.cash.total)} hint={d.cash.accounts.map((a) => `${a.name} ${money(a.balance)}`).join(" · ") || undefined} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Panel title={t("Sales by day")} action={<span className="text-xs text-ink-soft">{t("Last 30 days")} · {company.currency}</span>}>
          <ColumnChart points={series} format={(v) => money(v)} />
        </Panel>
        <Panel title={t("By branch")} action={<span className="text-xs text-ink-soft">{t("This month")}</span>}>
          {d.sales.by_branch.length ? <BarList points={d.sales.by_branch.map((b) => ({ label: b.name, value: Number(b.amount) }))} format={(v) => money(v)} /> : <p className="text-sm text-ink-soft">{t("No sales yet this month.")}</p>}
        </Panel>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title={t("Top products")} action={<span className="text-xs text-ink-soft">{t("This month")}</span>}>
          {d.sales.top_products.length ? (
            <table className="w-full text-sm">
              <thead className="text-xs tracking-wide text-ink-soft uppercase">
                <tr><th className="pb-2 text-start font-medium">{t("Product")}</th><th className="pb-2 text-end font-medium">{t("Quantity")}</th><th className="pb-2 text-end font-medium">{t("Sales")}</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {d.sales.top_products.map((p) => (
                  <tr key={p.product}><td className="py-2"><span className="font-mono text-xs text-ink-soft">{p.sku}</span> <span className="font-medium">{p.name}</span></td><td className="py-2 text-end tabular-nums">{p.quantity}</td><td className="py-2 text-end font-medium tabular-nums">{money(p.amount)}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-ink-soft">{t("No sales yet this month.")}</p>}
        </Panel>
        <Panel title={t("Operations")}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            {operations.map(([label, value, hint, href]) => (
              <Link key={label} href={href} className="-m-2 rounded-lg p-2 transition-colors hover:bg-surface-muted/60">
                <dt className="text-ink-soft">{label}</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
                <dd className="text-xs text-ink-soft">{hint}</dd>
              </Link>
            ))}
          </dl>
        </Panel>
      </div>
    </>
  );
}
