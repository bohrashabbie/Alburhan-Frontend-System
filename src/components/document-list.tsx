"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, Suspense, useState } from "react";

import { Button, EmptyState, ErrorBanner, Loading, PageHeader, SearchField, SelectField, Table, TextField } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import type { Page } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export type DocColumn<T> = { label: string; render: (row: T) => ReactNode; align?: "start" | "end" };

type DocumentListProps<T> = {
  title: string;
  description: string;
  endpoint: string;
  createPermission: string;
  newLabel: string;
  statuses: [string, string][];
  columns: DocColumn<T>[];
  extraFilters?: ReactNode;
  renderOpen: (open: T | "new", close: () => void) => ReactNode;
};

/**
 * A list of documents (transfers, adjustments, counts…) with search, status and date filters,
 * and a "New" button. The caller renders the editor/viewer for the open row.
 * Deep links: `?open=<id>` opens that document, `?new=1` opens a blank one (the command palette
 * and cross-page buttons use these).
 */
export function DocumentList<T extends { id: number; status: string }>(props: DocumentListProps<T>) {
  return (
    <Suspense fallback={<Loading />}>
      <DocumentListInner<T> {...props} />
    </Suspense>
  );
}

function DocumentListInner<T extends { id: number; status: string }>({
  title,
  description,
  endpoint,
  createPermission,
  newLabel,
  statuses,
  columns,
  extraFilters,
  renderOpen,
}: DocumentListProps<T>) {
  const { company, can, locale, t } = useWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<T | "new" | null>(null);
  const list = useResource<Page<T>>(
    withQuery(endpoint, { company: company.id, search: search.trim(), status, date_from: from, date_to: to, page }),
  );
  const rows = list.data?.results ?? [];
  const pages = list.data ? Math.max(1, Math.ceil(list.data.count / 50)) : 1;
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const linkedId = params.get("open");
  const wantsNew = params.get("new") === "1" && can(createPermission);
  const linked = useResource<T>(linkedId ? `${endpoint}/${linkedId}` : null);
  const close = () => {
    setOpen(null);
    list.mutate();
  };
  const closeLink = () => {
    router.replace(pathname, { scroll: false });
    list.mutate();
  };
  const set = (setter: (value: string) => void) => (event: { target: { value: string } }) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title={t(title)}
        description={t(description)}
        actions={
          can(createPermission) ? (
            <Button onClick={() => setOpen("new")}>
              <Plus aria-hidden className="size-5" />
              {t(newLabel)}
            </Button>
          ) : null
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SearchField label={t("Search")} placeholder={t("Search…")} value={search} onChange={set(setSearch)} />
        <SelectField label={t("Status")} value={status} onChange={set(setStatus)}>
          <option value="">{t("All")}</option>
          {statuses.map(([value, label]) => (
            <option key={value} value={value}>
              {t(label)}
            </option>
          ))}
        </SelectField>
        {extraFilters}
        <TextField label={t("From")} type="date" value={from} onChange={set(setFrom)} />
        <TextField label={t("To")} type="date" value={to} onChange={set(setTo)} />
      </div>
      <ErrorBanner error={list.error} />
      {!list.data ? (
        list.error ? null : <Loading label={t("Loading…")} />
      ) : rows.length === 0 ? (
        search || status || from || to ? (
          <EmptyState title={t("No matches")} description={t("Nothing matches these filters. Clear them to see everything.")} action={<Button variant="secondary" onClick={() => { setSearch(""); setStatus(""); setFrom(""); setTo(""); setPage(1); }}>{t("Clear filters")}</Button>} />
        ) : (
          <EmptyState
            title={locale === "ar" ? `لا توجد ${t(title)} بعد` : `No ${title.toLowerCase()} yet`}
            description={t(description)}
            action={can(createPermission) ? <Button onClick={() => setOpen("new")}><Plus aria-hidden className="size-5" />{t(newLabel)}</Button> : undefined}
          />
        )
      ) : (
        <>
          <Table head={columns.map((column) => t(column.label))}>
            {rows.map((row) => (
              <tr key={row.id} onClick={() => setOpen(row)} className="cursor-pointer">
                {columns.map((column) => (
                  <td key={column.label} className={`px-4 py-3 align-middle ${column.align === "end" ? "text-end tabular-nums" : ""}`}>
                    {column.render(row)}
                  </td>
                ))}
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
      {open ? renderOpen(open, close) : wantsNew ? renderOpen("new", closeLink) : linkedId && linked.data ? renderOpen(linked.data, closeLink) : null}
    </>
  );
}

/** Read-only facts strip at the top of a posted document. */
export function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-line p-4 text-sm sm:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-ink-soft">{label}</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
