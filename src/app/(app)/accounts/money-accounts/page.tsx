"use client";

import { ArrowLeftRight, Banknote, Landmark } from "lucide-react";
import Link from "next/link";

import { ButtonLink, EmptyState, ErrorBanner, Loading, PageHeader } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import type { MoneyAccount } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

/** "Create bank name" in the previous system: the cash and bank accounts and what is in each. */
export default function MoneyAccountsPage() {
  const { company, can, canSee, locale, name, t } = useWorkspace();
  const list = useResource<MoneyAccount[]>(withQuery("/accounting/money-accounts", { company: company.id }));
  const money = (value: string | number) => formatMoney(value, company.currency, locale);
  const total = (list.data ?? []).reduce((sum, item) => sum + Number(item.balance), 0);
  const first = new Date(new Date().getFullYear(), 0, 1).toLocaleDateString("en-CA");

  return (
    <>
      <PageHeader
        title={t("Bank & cash accounts")}
        description={t("Every cash box and bank account, with what is in it now. Open one to see every movement.")}
        actions={
          <span className="flex flex-wrap gap-2">
            {canSee("accounting.journal.view") ? <ButtonLink variant="secondary" href="/accounts/journals">{t("Add or change accounts")}</ButtonLink> : null}
            {can("accounting.money_transfer.create") ? <ButtonLink href="/accounts/money-transfers?new=1"><ArrowLeftRight aria-hidden className="size-4" />{t("Money transfer")}</ButtonLink> : null}
          </span>
        }
      />
      <ErrorBanner error={list.error} />
      {!list.data ? (list.error ? null : <Loading label={t("Loading…")} />) : list.data.length === 0 ? (
        <EmptyState title={t("No cash or bank accounts yet")} description={t("Add a cash or bank journal under Accounting → Journals.")} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.data.map((item) => {
              const Icon = item.journal_type === "bank" ? Landmark : Banknote;
              const body = (
                <>
                  <span className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-[#f0ecff] text-link"><Icon aria-hidden className="size-5" strokeWidth={1.6} /></span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{name(item)}</span>
                      <span className="block text-xs text-ink-soft">{t(item.journal_type === "bank" ? "Bank" : "Cash")} · {item.account_code ?? t("No account set")}</span>
                    </span>
                  </span>
                  <span className={`mt-4 block text-2xl font-semibold tracking-tight tabular-nums ${Number(item.balance) < 0 ? "text-danger" : ""}`}>{money(item.balance)}</span>
                </>
              );
              const className = "rounded-2xl border border-line bg-surface p-5 transition-colors";
              return item.account && canSee("accounting.report.view") ? (
                <Link key={item.journal} href={`/accounts/ledger?account=${item.account}&from=${first}`} className={`${className} hover:border-ink-faint`}>{body}</Link>
              ) : (
                <div key={item.journal} className={className}>{body}</div>
              );
            })}
          </div>
          <p className="mt-4 text-end text-sm text-ink-soft">{t("Total")}: <span className="text-lg font-semibold text-ink tabular-nums">{money(total)}</span></p>
        </>
      )}
    </>
  );
}
