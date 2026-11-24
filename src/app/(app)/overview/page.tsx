"use client";

import Link from "next/link";

import { BusinessOverview, Panel } from "@/components/business-overview";
import { BarList, StatTile } from "@/components/charts";
import { ErrorBanner, Loading, PageHeader } from "@/components/ui";
import { YourAreas } from "@/components/your-areas";
import { withQuery } from "@/lib/api";
import { formatMoney, fullName } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import type { Dashboard } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export default function OverviewPage() {
  const { me, company, branch, can, canSee, locale, name, t } = useWorkspace();
  const allowed = can("reports.dashboard.view") || canSee("reports.dashboard.view");
  const data = useResource<Dashboard>(allowed ? withQuery("/reports/dashboard", { company: company.id, branch: branch?.id }) : null);
  const money = (value: string | number) => formatMoney(value, company.currency, locale);
  const header = <PageHeader title={t("Dashboard")} description={`${fullName(me)} · ${name(company)}${branch ? ` · ${name(branch)}` : ""}`} />;

  if (!allowed) {
    return (
      <>
        <PageHeader title={`${t("Welcome")}, ${me.first_name || fullName(me)}`} description={`${name(company)}${branch ? ` · ${name(branch)}` : ""} · ${t("Everything you can open, one click away. Press Ctrl K to search anywhere.")}`} />
        <YourAreas />
      </>
    );
  }
  if (data.error) return <>{header}<ErrorBanner error={data.error} /></>;
  if (!data.data) return <>{header}<Loading label={t("Loading…")} /></>;
  const d = data.data;
  const operations: [string, string, string, string][] = [
    [t("Stock value"), money(d.stock_value), t("at average cost"), "/inventory/stock"],
    [t("Active projects"), String(d.projects.active), `${money(d.projects.contract_value)} ${t("contracted")}`, "/projects/list"],
    [t("Jobs today"), String(d.jobs_today), t("installation"), "/installation/schedule"],
    [t("Open purchase orders"), String(d.purchase_orders.open), money(d.purchase_orders.value), "/purchasing/orders"],
    [t("Open POS shifts"), String(d.open_shifts), t("registers selling now"), "/pos/shifts"],
  ];

  return (
    <>
      {header}
      <BusinessOverview data={d} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={t("Sales today")} value={money(d.sales.today)} hint={`${d.sales.today_count} ${t(d.sales.today_count === 1 ? "invoice" : "invoices")}`} />
        <StatTile label={t("Receivables")} value={money(d.receivables.total)} hint={Number(d.receivables.overdue) > 0 ? `${money(d.receivables.overdue)} ${t("overdue")}` : `${d.receivables.count} ${t("open invoices")}`} tone={Number(d.receivables.overdue) > 0 ? "warning" : undefined} />
        <StatTile label={t("Payables")} value={money(d.payables.total)} hint={Number(d.payables.overdue) > 0 ? `${money(d.payables.overdue)} ${t("overdue")}` : `${d.payables.count} ${t("open bills")}`} />
        <StatTile label={t("Cash & bank")} value={money(d.cash.total)} hint={d.cash.accounts.map((a) => `${a.name} ${money(a.balance)}`).join(" · ") || undefined} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title={t("By branch")} action={<span className="text-xs text-ink-soft">{t("This month")}</span>}>
          {d.sales.by_branch.length ? <BarList points={d.sales.by_branch.map((b) => ({ label: b.name, value: Number(b.amount) }))} format={(v) => money(v)} /> : <p className="text-sm text-ink-soft">{t("No sales yet this month.")}</p>}
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
