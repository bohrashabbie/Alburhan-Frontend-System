"use client";

import { CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { ATTENDANCE } from "@/components/hr-extras";
import { Badge, Button, EmptyState, ErrorBanner, Loading, PageHeader, SelectField, TextField } from "@/components/ui";
import { api, withQuery } from "@/lib/api";
import { useAction, useResource } from "@/lib/hooks";
import type { AttendanceRow, AttendanceSheet, AttendanceStatus } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

type Entry = { status: AttendanceStatus | null; check_in: string; check_out: string; note: string };

const CHOICE_STYLE: Record<AttendanceStatus, string> = {
  present: "border-accent bg-accent text-white",
  late: "border-warning bg-warning-soft text-warning",
  half_day: "border-warning bg-warning-soft text-warning",
  absent: "border-danger bg-danger text-white",
};

const shift = (day: string, by: number) => {
  const next = new Date(`${day}T12:00:00`);
  next.setDate(next.getDate() + by);
  return next.toLocaleDateString("en-CA");
};

/** One day's sheet. Keyed by day, store and save, so it starts from what is stored each time. */
function Sheet({ sheet, branch, onSaved }: { sheet: AttendanceSheet; branch: string; onSaved: () => void }) {
  const { can, company, t } = useWorkspace();
  const editable = can("hr.attendance.create");
  const start = (row: AttendanceRow): Entry => ({ status: row.status, check_in: row.check_in ?? "", check_out: row.check_out ?? "", note: row.note });
  const [entries, setEntries] = useState<Record<number, Entry>>(() => Object.fromEntries(sheet.rows.map((row) => [row.employee, start(row)])));
  const save = useAction();
  const working = sheet.rows.filter((row) => !row.on_leave);
  const changed = working.filter((row) => JSON.stringify(entries[row.employee]) !== JSON.stringify(start(row)));
  const set = (id: number, patch: Partial<Entry>) => setEntries((now) => ({ ...now, [id]: { ...now[id], ...patch } }));
  const allPresent = () => setEntries((now) => Object.fromEntries(Object.entries(now).map(([id, entry]) => [id, working.some((row) => String(row.employee) === id) && !entry.status ? { ...entry, status: "present" as const } : entry])));
  const submit = () => save.run(async () => {
    await api.post("/hr/attendance/mark", {
      company: company.id,
      date: sheet.date,
      entries: changed.map((row) => { const entry = entries[row.employee]; return { employee: row.employee, status: entry.status ?? "", check_in: entry.check_in || null, check_out: entry.check_out || null, note: entry.note }; }),
    });
    onSaved();
  });
  const count = (status: AttendanceStatus) => working.filter((row) => entries[row.employee]?.status === status).length;
  const unmarked = working.filter((row) => !entries[row.employee]?.status).length;
  if (sheet.rows.length === 0) return <EmptyState title={t("No employees here")} description={t("Add employees under HR → Employee, with their store.")} />;
  return (
    <div className="flex flex-col gap-4">
      {sheet.weekend ? <p className="rounded-xl border border-line bg-surface-muted/60 px-4 py-3 text-sm text-ink-soft">{t("This day is a weekend day. Mark only the people who worked.")}</p> : null}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {ATTENDANCE.map(([status, label]) => <span key={status} className="rounded-full border border-line px-3 py-1"><span className="text-ink-soft">{t(label)}</span> <span className="font-semibold tabular-nums">{count(status)}</span></span>)}
        <span className="rounded-full border border-line px-3 py-1"><span className="text-ink-soft">{t("On leave")}</span> <span className="font-semibold tabular-nums">{sheet.rows.length - working.length}</span></span>
        <span className={`rounded-full border px-3 py-1 ${unmarked ? "border-warning/50 bg-warning-soft/50" : "border-line"}`}><span className="text-ink-soft">{t("Not marked")}</span> <span className="font-semibold tabular-nums">{unmarked}</span></span>
        <span className="flex-1" />
        {editable && unmarked ? <Button variant="secondary" onClick={allPresent}><CheckCheck aria-hidden className="size-4" />{t("Mark the rest present")}</Button> : null}
      </div>
      <ErrorBanner error={save.error} />
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[60rem] text-sm">
          <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
            <tr>
              <th className="px-4 py-2.5 text-start font-medium">{t("Employee")}</th>
              <th className="px-4 py-2.5 text-start font-medium">{t("Attendance")}</th>
              <th className="px-3 py-2.5 text-start font-medium">{t("Time in")}</th>
              <th className="px-3 py-2.5 text-start font-medium">{t("Time out")}</th>
              <th className="px-4 py-2.5 text-start font-medium">{t("Note")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sheet.rows.map((row) => {
              const entry = entries[row.employee];
              return (
                <tr key={row.employee} className={row.on_leave ? "bg-surface-muted/40" : ""}>
                  <td className="px-4 py-2.5">
                    <span className="block font-medium">{row.name}</span>
                    <span className="block text-xs text-ink-soft">{[row.number, row.job_title, branch ? null : row.branch_name].filter(Boolean).join(" · ")}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {row.on_leave ? <Badge tone="neutral">{t("On leave")} · {row.on_leave}</Badge> : (
                      <div role="radiogroup" aria-label={`${t("Attendance")}: ${row.name}`} className="flex flex-wrap gap-1">
                        {ATTENDANCE.map(([status, label]) => (
                          <button key={status} type="button" role="radio" aria-checked={entry.status === status} disabled={!editable}
                            onClick={() => set(row.employee, { status: entry.status === status ? null : status })}
                            className={`h-8 rounded-full border px-3 text-xs font-medium transition-colors disabled:cursor-default ${entry.status === status ? CHOICE_STYLE[status] : "border-line-strong bg-surface hover:bg-surface-muted"}`}>
                            {t(label)}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">{!row.on_leave && entry.status && entry.status !== "absent" ? <input type="time" aria-label={`${t("Time in")}: ${row.name}`} disabled={!editable} value={entry.check_in} onChange={(e) => set(row.employee, { check_in: e.target.value })} className="h-9 rounded-lg border border-line-strong bg-surface px-2 tabular-nums" /> : null}</td>
                  <td className="px-3 py-2.5">{!row.on_leave && entry.status && entry.status !== "absent" ? <input type="time" aria-label={`${t("Time out")}: ${row.name}`} disabled={!editable} value={entry.check_out} onChange={(e) => set(row.employee, { check_out: e.target.value })} className="h-9 rounded-lg border border-line-strong bg-surface px-2 tabular-nums" /> : null}</td>
                  <td className="px-4 py-2.5">{!row.on_leave && entry.status ? <input aria-label={`${t("Note")}: ${row.name}`} disabled={!editable} value={entry.note} onChange={(e) => set(row.employee, { note: e.target.value })} placeholder={entry.status === "absent" ? t("Reason, if known") : ""} className="h-9 w-full min-w-40 rounded-lg border border-line-strong bg-surface px-2" /> : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editable ? (
        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-line bg-surface/95 py-3 backdrop-blur">
          <span className="text-sm text-ink-soft">{changed.length ? `${changed.length} ${t("changed")}` : t("No changes")}</span>
          <Button disabled={!changed.length} pending={save.pending} onClick={submit}>{t("Save attendance")}</Button>
        </div>
      ) : null}
    </div>
  );
}

export default function AttendancePage() {
  const { branches, company, name, t } = useWorkspace();
  // Empty = today where the company is; the server says which day that is.
  const [chosen, setDay] = useState("");
  const [branch, setBranch] = useState("");
  const [version, setVersion] = useState(0);
  const sheet = useResource<AttendanceSheet>(withQuery("/hr/attendance/register", { company: company.id, date: chosen, branch }));
  const today = sheet.data?.today ?? new Date().toLocaleDateString("en-CA");
  const day = chosen || sheet.data?.date || today;
  return (
    <>
      <PageHeader title={t("Attendance")} description="Mark who came in, who was late or on a half day, and who was absent. People on approved leave are shown as on leave." />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex items-end gap-1">
          <Button variant="secondary" className="h-10 px-3" aria-label={t("Previous day")} onClick={() => setDay(shift(day, -1))}><ChevronLeft aria-hidden className="size-4 rtl:-scale-x-100" /></Button>
          <div className="w-44"><TextField label={t("Date")} type="date" max={today} value={day} onChange={(e) => e.target.value && setDay(e.target.value)} /></div>
          <Button variant="secondary" className="h-10 px-3" aria-label={t("Next day")} disabled={day >= today} onClick={() => setDay(shift(day, 1))}><ChevronRight aria-hidden className="size-4 rtl:-scale-x-100" /></Button>
          {day !== today ? <Button variant="ghost" className="h-10" onClick={() => setDay("")}>{t("Today")}</Button> : null}
        </div>
        <div className="w-56"><SelectField label={t("Store")} value={branch} onChange={(e) => setBranch(e.target.value)}><option value="">{t("All")}</option>{branches.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}</SelectField></div>
      </div>
      <ErrorBanner error={sheet.error} />
      {!sheet.data ? (sheet.error ? null : <Loading label={t("Loading…")} />) : (
        <Sheet key={`${sheet.data.date}-${branch}-${version}`} sheet={sheet.data} branch={branch} onSaved={async () => { await sheet.mutate(); setVersion((v) => v + 1); }} />
      )}
    </>
  );
}
