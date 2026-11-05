"use client";

import Link from "next/link";

import { withQuery } from "@/lib/api";
import { formatAmount } from "@/lib/money";
import type { ReportGroup } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

/** One section of a financial statement: group headings, account rows and a section total. */
export function StatementSection({ title, groups, total, decimals, from, to, strong = false }: { title: string; groups: ReportGroup[]; total: string; decimals: number; from?: string; to: string; strong?: boolean }) {
  const { name, t } = useWorkspace();
  return (
    <tbody className="border-b border-line">
      <tr className="bg-surface-muted/40"><th scope="rowgroup" colSpan={2} className="px-4 py-2 text-start text-xs font-semibold tracking-wide text-ink-soft uppercase">{title}</th></tr>
      {groups.map((group) => (
        <GroupRows key={group.code} group={group} decimals={decimals} from={from} to={to} />
      ))}
      {groups.length === 0 ? <tr><td colSpan={2} className="px-4 py-2 text-sm text-ink-faint">{t("Nothing posted.")}</td></tr> : null}
      <tr className={strong ? "font-bold" : "font-semibold"}><td className="px-4 py-2.5">{t("Total")} {title.toLowerCase()}</td><td className="px-4 py-2.5 text-end tabular-nums">{formatAmount(total, decimals)}</td></tr>
    </tbody>
  );
  function GroupRows({ group, decimals, from, to }: { group: ReportGroup; decimals: number; from?: string; to: string }) {
    return (
      <>
        <tr><td colSpan={2} className="px-4 pt-3 pb-1 text-sm font-semibold">{name(group)}</td></tr>
        {group.rows.map((row) => (
          <tr key={row.account} className="transition-colors hover:bg-surface-muted/50">
            <td className="ps-8 pe-4 py-1.5 text-sm"><Link href={withQuery("/accounts/ledger", { account: row.account, from, to })} className="hover:underline"><span className="me-3 font-mono text-xs text-ink-soft">{row.code}</span>{name(row)}</Link></td>
            <td className="px-4 py-1.5 text-end text-sm tabular-nums">{formatAmount(row.amount, decimals)}</td>
          </tr>
        ))}
      </>
    );
  }
}

export function TotalRow({ label, value, decimals, tone }: { label: string; value: string; decimals: number; tone?: "strong" | "danger" }) {
  return (
    <tr className={tone === "strong" ? "bg-surface-muted/40 text-base font-bold" : "font-semibold"}>
      <td className="px-4 py-3">{label}</td>
      <td className={`px-4 py-3 text-end tabular-nums ${tone === "danger" || Number(value) < 0 ? "text-danger" : ""}`}>{formatAmount(value, decimals)}</td>
    </tr>
  );
}
