"use client";

import { Plus, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";

import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  ErrorBanner,
  IconButton,
  Loading,
  PageHeader,
  SelectField,
  Table,
  TextField,
} from "@/components/ui";
import { useAccounts, useJournals } from "@/lib/accounting";
import { api, withQuery } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import { decimalsOf, formatAmount, toMinor } from "@/lib/money";
import type { Currency, EntryLine, JournalEntry, Page } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const today = () => new Date().toLocaleDateString("en-CA");

function StatusBadge({ entry }: { entry: JournalEntry }) {
  const { t } = useWorkspace();
  if (entry.status === "draft") return <Badge>{t("Draft")}</Badge>;
  if (entry.reversed_by) return <Badge tone="warning">{t("Reversed")}</Badge>;
  if (entry.reversal_of) return <Badge tone="warning">{t("Reversal")}</Badge>;
  return <Badge tone="success">{t("Posted")}</Badge>;
}

type LineDraft = { account: string; description: string; debit: string; credit: string };
const EMPTY_LINE: LineDraft = { account: "", description: "", debit: "", credit: "" };

const CELL =
  "h-9 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-2.5 text-sm placeholder:text-ink-faint";

/** Create or edit a draft entry, then save or post it. */
function DraftEditor({ entry, onDone }: { entry?: JournalEntry; onDone: () => void }) {
  const { company, can, name, t } = useWorkspace();
  const accounts = useAccounts().filter((account) => !account.is_group && account.is_active);
  const journals = useJournals().filter((journal) => journal.is_active);
  const currencies = useResource<Page<Currency>>("/organization/currencies?page_size=500&is_active=true");
  const [journal, setJournal] = useState(entry ? String(entry.journal) : "");
  const [date, setDate] = useState(entry?.date ?? today());
  const [reference, setReference] = useState(entry?.reference ?? "");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [currency, setCurrency] = useState(entry?.currency ?? company.currency);
  const [rate, setRate] = useState(entry && entry.currency !== company.currency ? entry.exchange_rate : "");
  const [lines, setLines] = useState<LineDraft[]>(
    entry?.lines.length
      ? entry.lines.map((line) => ({
          account: String(line.account),
          description: line.description,
          debit: Number(line.debit) ? line.debit : "",
          credit: Number(line.credit) ? line.credit : "",
        }))
      : [{ ...EMPTY_LINE }, { ...EMPTY_LINE }],
  );
  const save = useAction();
  const remove = useAction();
  const decimals = decimalsOf(currency);
  const foreign = currency !== company.currency;

  const debit = lines.reduce((sum, line) => sum + toMinor(line.debit, decimals), 0n);
  const credit = lines.reduce((sum, line) => sum + toMinor(line.credit, decimals), 0n);
  const difference = debit - credit;
  const firstJournal = journals.find((item) => item.code === "JV") ?? journals[0];
  const journalValue = journal || (firstJournal ? String(firstJournal.id) : "");

  const setLine = (index: number, patch: Partial<LineDraft>) =>
    setLines(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const payload = () => ({
    company: company.id,
    journal: Number(journalValue),
    date,
    reference,
    description,
    currency,
    ...(foreign && rate ? { exchange_rate: rate } : {}),
    lines: lines
      .filter((line) => line.account || line.debit || line.credit)
      .map((line) => ({
        account: Number(line.account) || null,
        description: line.description,
        debit: line.debit || "0",
        credit: line.credit || "0",
        customer: null,
        supplier: null,
        branch: null,
      })),
  });

  const persist = async () =>
    entry
      ? api.patch<JournalEntry>(`/accounting/entries/${entry.id}`, payload())
      : api.post<JournalEntry>("/accounting/entries", payload());

  const saveDraft = () =>
    save.run(async () => {
      await persist();
      onDone();
    });
  const saveAndPost = () =>
    save.run(async () => {
      const saved = await persist();
      await api.post(`/accounting/entries/${saved.id}/post`);
      onDone();
    });
  const destroy = () =>
    remove.run(async () => {
      if (!entry || !window.confirm("Delete this draft entry?")) return;
      await api.delete(`/accounting/entries/${entry.id}`);
      onDone();
    });

  const formId = "entry-form";
  return (
    <Drawer
      open
      large
      wide
      onClose={onDone}
      title={entry ? t("Draft entry") : t("New entry")}
      footer={
        <div className="flex items-center gap-2">
          {entry && can("accounting.entry.delete") ? (
            <Button variant="danger" pending={remove.pending} onClick={destroy}>
              {t("Delete")}
            </Button>
          ) : null}
          <span className="flex-1" />
          <Button variant="secondary" onClick={onDone}>
            {t("Cancel")}
          </Button>
          <Button variant="secondary" type="submit" form={formId} pending={save.pending}>
            {t("Save draft")}
          </Button>
          {can("accounting.entry.post") ? (
            <Button disabled={difference !== 0n || debit === 0n} pending={save.pending} onClick={saveAndPost}>
              {t("Post")}
            </Button>
          ) : null}
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit(saveDraft)} className="profile-section flex flex-col gap-5 pb-6">
        <ErrorBanner error={save.error ?? remove.error} />
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <SelectField label={t("Journal")} value={journalValue} onChange={(e) => setJournal(e.target.value)} error={save.field("journal")}>
            {journals.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} · {name(item)}
              </option>
            ))}
          </SelectField>
          <TextField label={t("Date")} type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={save.field("date")} />
          <TextField label={t("Reference")} value={reference} onChange={(e) => setReference(e.target.value)} hint="e.g. invoice or cheque number" />
          <SelectField label={t("Currency")} value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {(currencies.data?.results ?? []).map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} · {name(item)}
              </option>
            ))}
          </SelectField>
          {foreign ? (
            <TextField
              label={`${t("Exchange rate")} (1 ${currency} = ? ${company.currency})`}
              inputMode="decimal"
              value={rate}
              placeholder="Automatic from Exchange rates"
              onChange={(e) => setRate(e.target.value)}
              error={save.field("exchange_rate")}
            />
          ) : null}
          <div className="sm:col-span-2">
            <TextField label={t("Description")} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">{t("Lines")}</h3>
            <Button variant="secondary" onClick={() => setLines([...lines, { ...EMPTY_LINE }])}>
              <Plus aria-hidden className="size-4" />
              {t("Add line")}
            </Button>
          </div>
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[36%]" />
                <col />
                <col className="w-[16%]" />
                <col className="w-[16%]" />
                <col className="w-12" />
              </colgroup>
              <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
                <tr>
                  <th scope="col" className="px-3 py-2.5 text-start font-medium">{t("Account")}</th>
                  <th scope="col" className="px-3 py-2.5 text-start font-medium">{t("Description")}</th>
                  <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Debit")}</th>
                  <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Credit")}</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lines.map((line, index) => (
                  <tr key={index}>
                    <td className="px-2 py-2">
                      <select
                        aria-label={`${t("Account")} ${index + 1}`}
                        value={line.account}
                        onChange={(e) => setLine(index, { account: e.target.value })}
                        className={`${CELL} control-select`}
                      >
                        <option value="">—</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} · {name(account)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        aria-label={`${t("Description")} ${index + 1}`}
                        value={line.description}
                        onChange={(e) => setLine(index, { description: e.target.value })}
                        className={CELL}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        aria-label={`${t("Debit")} ${index + 1}`}
                        inputMode="decimal"
                        value={line.debit}
                        onChange={(e) => setLine(index, { debit: e.target.value, credit: e.target.value ? "" : line.credit })}
                        className={`${CELL} text-end tabular-nums`}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        aria-label={`${t("Credit")} ${index + 1}`}
                        inputMode="decimal"
                        value={line.credit}
                        onChange={(e) => setLine(index, { credit: e.target.value, debit: e.target.value ? "" : line.debit })}
                        className={`${CELL} text-end tabular-nums`}
                      />
                    </td>
                    <td className="px-1 py-2 text-center">
                      <IconButton
                        label={t("Remove line")}
                        disabled={lines.length <= 2}
                        onClick={() => setLines(lines.filter((_, i) => i !== index))}
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-line bg-surface-muted/40 text-sm font-semibold tabular-nums">
                <tr>
                  <td className="px-3 py-2.5" colSpan={2}>
                    {difference === 0n ? (
                      <span className="text-ink-soft">{t("Total")}</span>
                    ) : (
                      <span className="text-danger">
                        {t("Difference")}: {formatAmount(difference < 0n ? -difference : difference, decimals)} {currency}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-end">{formatAmount(debit, decimals)}</td>
                  <td className="px-3 py-2.5 text-end">{formatAmount(credit, decimals)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          {save.field("lines") ? <p className="text-sm text-danger">{save.field("lines")}</p> : null}
        </section>
      </form>
    </Drawer>
  );
}

/** A posted entry: read-only, with Reverse. */
function PostedView({ entry, onDone }: { entry: JournalEntry; onDone: () => void }) {
  const { company, can, locale, name, t } = useWorkspace();
  const accounts = useAccounts();
  const [date, setDate] = useState(today());
  const action = useAction();
  const decimals = decimalsOf(entry.currency);
  const baseDecimals = decimalsOf(company.currency);
  const foreign = entry.currency !== company.currency;
  const accountName = (id: number) => {
    const account = accounts.find((item) => item.id === id);
    return account ? name(account) : "";
  };
  const canReverse = can("accounting.entry.reverse") && !entry.reversed_by && !entry.reversal_of;

  const reverse = () =>
    action.run(async () => {
      await api.post(`/accounting/entries/${entry.id}/reverse`, { date });
      onDone();
    });

  const facts: [string, string][] = [
    [t("Date"), formatDate(entry.date, locale)],
    [t("Journal"), entry.journal_code],
    [t("Reference"), entry.reference || "—"],
    [t("Currency"), foreign ? `${entry.currency} @ ${entry.exchange_rate}` : entry.currency],
  ];

  return (
    <Drawer open large wide onClose={onDone} title={entry.number} action={<StatusBadge entry={entry} />}>
      <div className="profile-section flex flex-col gap-6 pb-6">
        {entry.description ? <p className="text-[15px]">{entry.description}</p> : null}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-line p-4 text-sm sm:grid-cols-4">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-ink-soft">{label}</dt>
              <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("Account")}</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Debit")}</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">{t("Credit")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entry.lines.map((line: EntryLine) => (
                <tr key={line.id}>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-ink-soft">{line.account_code}</span>{" "}
                    <span className="font-medium">{accountName(line.account) || line.account_name}</span>
                    {line.description ? <span className="block text-xs text-ink-soft">{line.description}</span> : null}
                  </td>
                  <td className="px-4 py-2.5 text-end tabular-nums">
                    {Number(line.debit) ? formatAmount(line.debit, decimals) : ""}
                    {foreign && Number(line.debit) ? (
                      <span className="block text-xs text-ink-soft">{formatAmount(line.debit_base ?? "0", baseDecimals)} {company.currency}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-end tabular-nums">
                    {Number(line.credit) ? formatAmount(line.credit, decimals) : ""}
                    {foreign && Number(line.credit) ? (
                      <span className="block text-xs text-ink-soft">{formatAmount(line.credit_base ?? "0", baseDecimals)} {company.currency}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-line bg-surface-muted/40 font-semibold tabular-nums">
              <tr>
                <td className="px-4 py-2.5 text-ink-soft">{t("Total")}</td>
                <td className="px-4 py-2.5 text-end">{formatAmount(entry.total_debit, decimals)}</td>
                <td className="px-4 py-2.5 text-end">{formatAmount(entry.total_credit, decimals)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {canReverse ? (
          <section className="border-t border-line pt-6">
            <h3 className="text-base font-bold">{t("Reverse")}</h3>
            <p className="mt-1 text-sm text-ink-soft">
              Posted entries can&apos;t be edited. A reversal posts the opposite entry on the date you choose.
            </p>
            <div className="mt-3">
              <ErrorBanner error={action.error} />
            </div>
            <div className="mt-3 flex items-end gap-3">
              <div className="w-48">
                <TextField label={t("Date")} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <Button variant="secondary" pending={action.pending} onClick={reverse}>
                <Undo2 aria-hidden className="size-4" />
                {t("Reverse")}
              </Button>
            </div>
          </section>
        ) : null}
      </div>
    </Drawer>
  );
}

export default function EntriesPage() {
  const { company, can, locale, name, t } = useWorkspace();
  const journals = useJournals();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [journal, setJournal] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<JournalEntry | "new" | null>(null);
  const list = useResource<Page<JournalEntry>>(
    withQuery("/accounting/entries", {
      company: company.id,
      search: search.trim(),
      status,
      journal,
      date_from: from,
      date_to: to,
      page,
    }),
  );
  const rows = list.data?.results ?? [];
  const pages = list.data ? Math.max(1, Math.ceil(list.data.count / 50)) : 1;
  const close = () => {
    setOpen(null);
    list.mutate();
  };

  return (
    <>
      <PageHeader
        title={t("Journal entries")}
        description={`Double-entry records of ${name(company)}. Drafts can change; posted entries are corrected by reversal.`}
        actions={
          can("accounting.entry.create") ? (
            <Button onClick={() => setOpen("new")}>
              <Plus aria-hidden className="size-5" />
              {t("New entry")}
            </Button>
          ) : null
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <TextField label={t("Search")} type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <SelectField label={t("Status")} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">{t("All")}</option>
          <option value="draft">{t("Draft")}</option>
          <option value="posted">{t("Posted")}</option>
        </SelectField>
        <SelectField label={t("Journal")} value={journal} onChange={(e) => { setJournal(e.target.value); setPage(1); }}>
          <option value="">{t("All")}</option>
          {journals.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} · {name(item)}
            </option>
          ))}
        </SelectField>
        <TextField label={t("From")} type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        <TextField label={t("To")} type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
      </div>
      <ErrorBanner error={list.error} />
      {!list.data ? (
        list.error ? null : <Loading label={t("Loading…")} />
      ) : rows.length === 0 ? (
        <EmptyState title={t("Nothing here yet")} description="No journal entries match." />
      ) : (
        <>
          <Table head={[t("Date"), t("Number"), t("Journal"), t("Description"), t("Amount"), t("Status")]}>
            {rows.map((entry) => (
              <tr key={entry.id} onClick={() => setOpen(entry)} className="cursor-pointer">
                <td className="px-4 py-3 tabular-nums">{formatDate(entry.date, locale)}</td>
                <td className="px-4 py-3 font-mono text-xs">{entry.number || "—"}</td>
                <td className="px-4 py-3">{entry.journal_code}</td>
                <td className="max-w-[28rem] truncate px-4 py-3">{entry.description || entry.reference || "—"}</td>
                <td className="px-4 py-3 text-end tabular-nums">
                  {formatAmount(entry.total_debit, decimalsOf(entry.currency))} {entry.currency}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge entry={entry} />
                </td>
              </tr>
            ))}
          </Table>
          {pages > 1 ? (
            <div className="mt-4 flex items-center justify-end gap-2 text-sm text-ink-soft">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</Button>
              <span className="tabular-nums">{page} / {pages}</span>
              <Button variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>›</Button>
            </div>
          ) : null}
        </>
      )}

      {open === "new" ? <DraftEditor onDone={close} /> : null}
      {open && open !== "new" && open.status === "draft" ? <DraftEditor key={open.id} entry={open} onDone={close} /> : null}
      {open && open !== "new" && open.status !== "draft" ? <PostedView key={open.id} entry={open} onDone={close} /> : null}
    </>
  );
}

