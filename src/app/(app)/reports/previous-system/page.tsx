"use client";

import { useState } from "react";

import { Badge, Button, EmptyState, ErrorBanner, Loading, Modal, PageHeader, SearchField, SelectField, TextField } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import { decimalsOf, formatAmount } from "@/lib/money";
import type { LegacyDocument, LegacyDocuments } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const label = (key: string) => key.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());

/** Documents made in the previous system: history to look up, outside the live books. */
export default function PreviousSystemPage() {
  const { company, locale, t } = useWorkspace();
  const [kind, setKind] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<LegacyDocument | null>(null);
  const list = useResource<LegacyDocuments>(withQuery("/reports/legacy-documents", { company: company.id, kind: kind || undefined, search: search.trim() || undefined, date_from: from || undefined, date_to: to || undefined, page }));
  const decimals = decimalsOf(company.currency);
  const amount = (value: string | null) => (value === null ? <span className="text-ink-faint">—</span> : formatAmount(value, decimals));
  const r = list.data;
  const cell = "px-4 py-2.5 text-end tabular-nums";
  const reset = () => setPage(1);

  return (
    <>
      <PageHeader title={t("Previous system")} description={t("Invoices, quotations, purchases and other documents made before the move. They are kept to look up; they change neither stock nor the accounts.")} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <SearchField label={t("Search")} value={search} onChange={(e) => { setSearch(e.target.value); reset(); }} />
        <SelectField label={t("Type")} value={kind} onChange={(e) => { setKind(e.target.value); reset(); }}>
          <option value="">{t("All")}</option>
          {(r?.kinds ?? []).map((item) => <option key={item.kind} value={item.kind}>{t(item.label)} ({item.count})</option>)}
        </SelectField>
        <TextField label={t("From")} type="date" value={from} onChange={(e) => { setFrom(e.target.value); reset(); }} />
        <TextField label={t("To")} type="date" value={to} onChange={(e) => { setTo(e.target.value); reset(); }} />
      </div>
      <ErrorBanner error={list.error} />
      {!r ? (list.error ? null : <Loading label={t("Loading…")} />) : r.count === 0 ? (
        <EmptyState title={t("Nothing found")} description={t("Try another type, date or search.")} />
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-soft">
            {r.count.toLocaleString()} {t("documents")} · {t("Total")} <span className="font-medium text-ink tabular-nums">{formatAmount(r.total, decimals)}</span>
            {Number(r.due) ? <> · {t("Due")} <span className="font-medium text-warning tabular-nums">{formatAmount(r.due, decimals)}</span></> : null}
          </p>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[52rem] text-sm">
              <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">{t("Date")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("Type")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("Reference")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("Customer / supplier")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("Status")}</th>
                  <th className="px-4 py-2.5 text-end font-medium">{t("Total")}</th>
                  <th className="px-4 py-2.5 text-end font-medium">{t("Paid")}</th>
                  <th className="px-4 py-2.5 text-end font-medium">{t("Due")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {r.results.map((row) => (
                  <tr key={row.id} onClick={() => setOpen(row)} className="cursor-pointer hover:bg-surface-muted/50">
                    <td className="px-4 py-2.5 whitespace-nowrap">{row.date ? formatDate(row.date, locale) : "—"}</td>
                    <td className="px-4 py-2.5">{t(r.kinds.find((item) => item.kind === row.kind)?.label ?? row.kind)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{row.number || "—"}</td>
                    <td className="max-w-[16rem] truncate px-4 py-2.5">{row.party || row.warehouse || "—"}</td>
                    <td className="px-4 py-2.5">{row.status ? <Badge tone="neutral">{row.status}</Badge> : null} {row.payment_status ? <Badge tone={/due|pending|partial/i.test(row.payment_status) ? "warning" : "neutral"}>{row.payment_status}</Badge> : null}</td>
                    <td className={`${cell} font-medium`}>{amount(row.total)}</td>
                    <td className={cell}>{amount(row.paid)}</td>
                    <td className={`${cell} ${Number(row.due) > 0 ? "text-warning" : ""}`}>{amount(row.due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {r.pages > 1 ? (
            <div className="mt-3 flex items-center justify-end gap-2 text-sm">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("Previous")}</Button>
              <span className="text-ink-soft tabular-nums">{page} / {r.pages}</span>
              <Button variant="secondary" disabled={page >= r.pages} onClick={() => setPage(page + 1)}>{t("Next")}</Button>
            </div>
          ) : null}
        </>
      )}
      <Modal open={open !== null} onClose={() => setOpen(null)} title={open ? `${open.number || t("Document")}` : ""}>
        {open ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            {([["Date", open.date ? formatDate(open.date, locale) : ""], ["Customer / supplier", open.party], ["Warehouse", open.warehouse], ["Status", open.status], ["Payment status", open.payment_status], ["Total", open.total], ["Paid", open.paid], ["Due", open.due]] as [string, string | null][])
              .filter(([, value]) => value)
              .map(([name, value]) => (<div key={name} className="contents"><dt className="text-ink-soft">{t(name)}</dt><dd className="font-medium break-words">{value}</dd></div>))}
            {Object.entries(open.details).filter(([, value]) => value !== "" && value !== null && !Array.isArray(value)).map(([name, value]) => (
              <div key={name} className="contents"><dt className="text-ink-soft">{label(name)}</dt><dd className="break-words whitespace-pre-wrap">{String(value)}</dd></div>
            ))}
          </dl>
        ) : null}
        {open && Array.isArray(open.details.lines) ? (
          <div className="mt-5 overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
                <tr><th className="px-3 py-2 text-start font-medium">{t("Product")}</th><th className="px-3 py-2 text-end font-medium">{t("Quantity")}</th><th className="px-3 py-2 text-end font-medium">{t("Discount")}</th><th className="px-3 py-2 text-end font-medium">{t("Subtotal")}</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {open.details.lines.map((line, index) => (
                  <tr key={index}><td className="px-3 py-2">{String(line[0] ?? "")}</td><td className="px-3 py-2 text-end tabular-nums">{String(line[1] ?? "")} {String(line[2] ?? "")}</td><td className="px-3 py-2 text-end tabular-nums">{Number(line[3]) ? String(line[3]) : "—"}</td><td className="px-3 py-2 text-end font-medium tabular-nums">{formatAmount(String(line[4] ?? 0), decimals)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : open && ["sale", "purchase", "quotation", "sale_return"].includes(open.kind) ? (
          <p className="mt-4 text-sm text-ink-soft">{t("The product lines of this document have not been brought over yet.")}</p>
        ) : null}
      </Modal>
    </>
  );
}
