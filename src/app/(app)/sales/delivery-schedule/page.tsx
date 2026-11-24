"use client";

import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSWRConfig } from "swr";

import { Badge, Button, EmptyState, ErrorBanner, Loading, Modal, PageHeader, SelectField, Table, TextField } from "@/components/ui";
import { api, withQuery } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useAction, useResource } from "@/lib/hooks";
import type { DeliveryNote, Page, ScheduleStatus, Warehouse } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const STATUSES: [ScheduleStatus, string][] = [
  ["pending", "Pending"],
  ["scheduled", "Scheduled"],
  ["out", "Out for delivery"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled"],
];
const TONE: Record<ScheduleStatus, "neutral" | "warning" | "success" | "danger"> = {
  pending: "neutral", scheduled: "warning", out: "warning", delivered: "success", cancelled: "danger",
};
const label = (status: ScheduleStatus) => STATUSES.find(([key]) => key === status)?.[1] ?? status;

function ScheduleForm({ note, onDone }: { note: DeliveryNote; onDone: () => void }) {
  const { t } = useWorkspace();
  const action = useAction();
  const [date, setDate] = useState(note.scheduled_date ?? "");
  const [time, setTime] = useState(note.scheduled_time?.slice(0, 5) ?? "");
  const [status, setStatus] = useState<ScheduleStatus>(note.schedule_status === "pending" ? "scheduled" : note.schedule_status);
  const [text, setText] = useState(note.schedule_note);
  const save = async () => {
    const done = await action.run(() =>
      api.post(`/sales/deliveries/${note.id}/schedule/`, { scheduled_date: date || null, scheduled_time: time || null, schedule_status: status, schedule_note: text }),
    );
    if (done) onDone();
  };
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">
        {note.number || t("Draft")} · {note.customer_name} · {note.warehouse_name}
      </p>
      <ErrorBanner error={action.error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label={t("Scheduled date")} type="date" value={date} onChange={(e) => setDate(e.target.value)} error={action.field("scheduled_date")} />
        <TextField label={t("Scheduled time")} type="time" value={time} onChange={(e) => setTime(e.target.value)} error={action.field("scheduled_time")} />
      </div>
      <SelectField label={t("Schedule status")} value={status} onChange={(e) => setStatus(e.target.value as ScheduleStatus)}>
        {STATUSES.map(([key, name]) => (
          <option key={key} value={key}>{t(name)}</option>
        ))}
      </SelectField>
      <TextField label={t("Note")} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>{t("Cancel")}</Button>
        <Button pending={action.pending} onClick={save}>{t("Save")}</Button>
      </div>
    </div>
  );
}

function Limits() {
  const { company, can, name, t } = useWorkspace();
  const { mutate } = useSWRConfig();
  const path = withQuery("/organization/warehouses", { company: company.id, page_size: 100 });
  const list = useResource<Page<Warehouse>>(path);
  const action = useAction();
  const [draft, setDraft] = useState<Record<number, string>>({});
  const editable = can("organization.warehouse.update");
  const save = async (warehouse: Warehouse) => {
    const value = draft[warehouse.id];
    const done = await action.run(() => api.patch(`/organization/warehouses/${warehouse.id}/`, { daily_delivery_limit: value === "" ? null : Number(value) }));
    if (done) {
      setDraft((current) => { const next = { ...current }; delete next[warehouse.id]; return next; });
      await mutate(path);
    }
  };
  if (!list.data) return list.error ? <ErrorBanner error={list.error} /> : <Loading label={t("Loading…")} />;
  return (
    <>
      <p className="mb-3 text-sm text-ink-soft">{t("The most deliveries each warehouse can send out in one day. Leave empty for no limit.")}</p>
      <ErrorBanner error={action.error} />
      <Table head={[t("Warehouse"), t("Deliveries per day"), ""]}>
        {list.data.results.filter((item) => item.is_active).map((warehouse) => {
          const value = draft[warehouse.id] ?? (warehouse.daily_delivery_limit === null ? "" : String(warehouse.daily_delivery_limit));
          const changed = warehouse.id in draft;
          return (
            <tr key={warehouse.id}>
              <td className="px-4 py-2.5 font-medium">{name(warehouse)}</td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  aria-label={`${t("Deliveries per day")}: ${name(warehouse)}`}
                  disabled={!editable}
                  placeholder={t("No limit")}
                  value={value}
                  onChange={(e) => setDraft((current) => ({ ...current, [warehouse.id]: e.target.value }))}
                  className="h-9 w-32 rounded-lg border border-line-strong bg-surface px-3 text-sm tabular-nums disabled:bg-surface-muted"
                />
              </td>
              <td className="px-4 py-2 text-end">{changed ? <Button className="!h-8 !px-3 !text-xs" pending={action.pending} onClick={() => save(warehouse)}>{t("Save")}</Button> : null}</td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}

export default function DeliverySchedulePage() {
  const { company, can, locale, t } = useWorkspace();
  const { mutate } = useSWRConfig();
  const [tab, setTab] = useState<"schedules" | "limits">("schedules");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<DeliveryNote | null>(null);
  const path = withQuery("/sales/deliveries", { company: company.id, schedule_status: status || undefined, scheduled_from: from || undefined, scheduled_to: to || undefined, page, ordering: "-created_at" });
  const list = useResource<Page<DeliveryNote>>(tab === "schedules" ? path : null);
  const canSchedule = can("sales.delivery.schedule");
  const pages = list.data ? Math.max(1, Math.ceil(list.data.count / 50)) : 1;
  const tabClass = (key: string) => `border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === key ? "border-link text-ink" : "border-transparent text-ink-soft hover:text-ink"}`;

  return (
    <>
      <PageHeader title={t("Delivery schedule")} description={t("Every delivery note appears here by itself. Set its date, time and status when the delivery is planned.")} />
      <div role="tablist" className="mb-4 flex border-b border-line">
        <button type="button" role="tab" aria-selected={tab === "schedules"} className={tabClass("schedules")} onClick={() => setTab("schedules")}>{t("Schedules")}</button>
        <button type="button" role="tab" aria-selected={tab === "limits"} className={tabClass("limits")} onClick={() => setTab("limits")}>{t("Daily limits by warehouse")}</button>
      </div>
      {tab === "limits" ? (
        <Limits />
      ) : (
        <>
          <div className="mb-4 grid max-w-3xl gap-3 sm:grid-cols-3">
            <SelectField label={t("Schedule status")} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">{t("All")}</option>
              {STATUSES.map(([key, name]) => <option key={key} value={key}>{t(name)}</option>)}
            </SelectField>
            <TextField label={t("Scheduled date from")} type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            <TextField label={t("Scheduled date to")} type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </div>
          <ErrorBanner error={list.error} />
          {!list.data ? (list.error ? null : <Loading label={t("Loading…")} />) : list.data.results.length === 0 ? (
            <EmptyState title={t("No deliveries here")} description={t("Delivery notes show up here as soon as they are created from an invoice.")} />
          ) : (
            <>
              <Table head={[t("Reference"), t("Invoice"), t("Customer"), t("Warehouse"), t("Scheduled date"), t("Scheduled time"), t("Schedule status"), ""]}>
                {list.data.results.map((note) => (
                  <tr key={note.id}>
                    <td className="px-4 py-2.5"><Link href={`/sales/deliveries?open=${note.id}`} className="font-mono text-xs text-link hover:underline">{note.number || t("Draft")}</Link></td>
                    <td className="px-4 py-2.5 font-mono text-xs">{note.invoice_number}</td>
                    <td className="px-4 py-2.5 font-medium">{note.customer_name}</td>
                    <td className="px-4 py-2.5">{note.warehouse_name}</td>
                    <td className="px-4 py-2.5">{note.scheduled_date ? formatDate(note.scheduled_date, locale) : <span className="text-ink-faint">—</span>}</td>
                    <td className="px-4 py-2.5 tabular-nums">{note.scheduled_time ? note.scheduled_time.slice(0, 5) : <span className="text-ink-faint">—</span>}</td>
                    <td className="px-4 py-2.5"><Badge tone={TONE[note.schedule_status]}>{t(label(note.schedule_status))}</Badge></td>
                    <td className="px-4 py-2 text-end">
                      {canSchedule ? (
                        <Button variant="secondary" className="!h-8 !px-3 !text-xs" onClick={() => setEditing(note)}>
                          <CalendarClock aria-hidden className="size-4" />
                          {t("Schedule delivery")}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </Table>
              {pages > 1 ? (
                <div className="mt-3 flex items-center justify-end gap-2 text-sm">
                  <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("Previous")}</Button>
                  <span className="tabular-nums text-ink-soft">{page} / {pages}</span>
                  <Button variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>{t("Next")}</Button>
                </div>
              ) : null}
            </>
          )}
        </>
      )}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={t("Schedule delivery")}>
        {editing ? (
          <ScheduleForm
            key={editing.id}
            note={editing}
            onDone={() => {
              setEditing(null);
              void mutate((key) => typeof key === "string" && key.startsWith("/sales/deliveries"));
            }}
          />
        ) : null}
      </Modal>
    </>
  );
}
