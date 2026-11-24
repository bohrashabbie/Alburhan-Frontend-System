"use client";

import { Paperclip } from "lucide-react";
import { useSWRConfig } from "swr";

import { CancelPosted } from "@/components/cancel-posted";
import { ResourcePage } from "@/components/resource-page";
import { Badge } from "@/components/ui";
import { upload, withQuery } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { useAction, useResource } from "@/lib/hooks";
import type { Expense, ExpenseCategory, Journal, Page } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const today = () => new Date().toLocaleDateString("en-CA");

/** The scanned receipt: a link when there is one, otherwise a button to add it. */
function Receipt({ expense }: { expense: Expense }) {
  const { can, t } = useWorkspace();
  const { mutate } = useSWRConfig();
  const action = useAction();
  if (expense.attachment_url) {
    return <a href={expense.attachment_url} target="_blank" rel="noopener" onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1 text-link hover:underline"><Paperclip aria-hidden className="size-4" />{t("Open")}</a>;
  }
  if (!can("accounting.expense.create") || expense.status === "cancelled") return <span className="text-ink-faint">—</span>;
  return (
    <label onClick={(event) => event.stopPropagation()} className="inline-flex cursor-pointer items-center gap-1 text-sm text-ink-soft hover:text-ink">
      <Paperclip aria-hidden className="size-4" />
      {action.pending ? t("Loading…") : t("Attach")}
      <input
        type="file"
        accept=".pdf,image/*"
        className="sr-only"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const done = await action.run(() => upload(`/accounting/expenses/${expense.id}/attach/`, { file }));
          if (done) await mutate((key) => typeof key === "string" && key.startsWith("/accounting/expenses"));
          else window.alert(t("Use a PDF or an image up to 5 MB."));
        }}
      />
    </label>
  );
}

export default function ExpensesPage() {
  const { company, branches, branch, can, locale, name, t } = useWorkspace();
  const categories = useResource<Page<ExpenseCategory>>(withQuery("/accounting/expense-categories", { company: company.id, page_size: 200 }));
  const journals = useResource<Page<Journal>>(withQuery("/accounting/journals", { company: company.id, page_size: 100 }));
  const active = (categories.data?.results ?? []).filter((item) => item.is_active);
  const paidFrom = (journals.data?.results ?? []).filter((item) => (item.journal_type === "cash" || item.journal_type === "bank") && item.is_active);
  const money = (value: string) => formatMoney(value, company.currency, locale);

  return (
    <ResourcePage<Expense>
      title="Expense list"
      description="Day-to-day spending: rent, fuel, bank charges. Each one is booked to its expense account and taken out of the cash or bank it was paid from."
      endpoint="/accounting/expenses"
      permission="accounting.expense"
      noun="expense"
      query={{ company: company.id, branch: branch?.id }}
      filters={[
        { name: "category", label: "Category", options: (categories.data?.results ?? []).map((item) => [String(item.id), name(item)]) },
        { name: "status", label: "Status", options: [["posted", "Posted"], ["cancelled", "Cancelled"]] },
      ]}
      columns={[
        { label: "Date", render: (row) => formatDate(row.date, locale) },
        { label: "Reference", render: (row) => <span className="font-mono text-xs">{row.number}</span> },
        { label: "Category", render: (row) => <span className="font-medium">{row.category_name}</span> },
        { label: "Branch", render: (row) => row.branch_name ?? "—" },
        { label: "Paid from", render: (row) => row.paid_from_name },
        { label: "Note", render: (row) => <span className="line-clamp-1 max-w-[18rem] text-ink-soft">{row.note || "—"}</span> },
        { label: "Receipt", render: (row) => <Receipt expense={row} /> },
        { label: "Amount", render: (row) => <span className={`font-medium tabular-nums ${row.status === "cancelled" ? "text-ink-faint line-through" : ""}`}>{money(row.amount)}</span> },
        {
          label: "Status",
          render: (row) =>
            row.status === "cancelled" ? (
              <Badge tone="danger">{t("Cancelled")}</Badge>
            ) : can("accounting.expense.cancel") ? (
              <CancelPosted endpoint="/accounting/expenses" id={row.id} label={row.number} />
            ) : (
              <Badge tone="success">{t("Posted")}</Badge>
            ),
        },
      ]}
      fields={[
        { name: "date", label: "Date", type: "date", required: true },
        { name: "category", label: "Category", type: "select", required: true, options: active.map((item) => [String(item.id), name(item)]) },
        { name: "amount", label: "Amount", type: "number", required: true },
        { name: "paid_from", label: "Paid from", type: "select", required: true, options: paidFrom.map((item) => [String(item.id), name(item)]), hint: "The cash or bank the money came out of." },
        { name: "branch", label: "Branch", type: "select", nullable: true, options: branches.map((item) => [String(item.id), name(item)]), hint: "The showroom or office the cost belongs to." },
        { name: "reference", label: "Receipt or bill number" },
        { name: "note", label: "Note", type: "textarea", wide: true },
      ]}
      initial={(row) => ({
        date: row?.date ?? today(),
        category: row ? String(row.category) : "",
        amount: row?.amount ?? "",
        paid_from: row ? String(row.paid_from) : paidFrom.length === 1 ? String(paidFrom[0].id) : "",
        branch: row?.branch ? String(row.branch) : branch ? String(branch.id) : "",
        reference: row?.reference ?? "",
        note: row?.note ?? "",
      })}
      readOnly={() => "An expense is booked in the accounts as soon as it is saved, so it can't be changed. Cancel it and enter it again."}
      toPayload={() => ({ company: company.id })}
    />
  );
}
