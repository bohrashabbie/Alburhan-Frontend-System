"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge, Button, ErrorBanner, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import { days } from "@/lib/hr";
import type { AbsenceDay, AttendanceStatus, Employee, LeaveAdjustment } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export const ATTENDANCE: [AttendanceStatus, string][] = [
  ["present", "Present"],
  ["late", "Late"],
  ["half_day", "Half day"],
  ["absent", "Absent"],
];

const TONE: Record<AttendanceStatus, "neutral" | "success" | "warning" | "danger"> = { present: "success", late: "warning", half_day: "warning", absent: "danger" };

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const { t } = useWorkspace();
  return <Badge tone={TONE[status]}>{t(ATTENDANCE.find(([value]) => value === status)?.[1] ?? status)}</Badge>;
}

/** Under an employee's leave balance: days added or taken off this year's annual leave (carried
 * over, or used before the system), and the days marked absent, late or half day. */
export function EmployeeLeaveExtras({ employee, onChange }: { employee: Employee; onChange: () => void }) {
  const { can, company, locale, t } = useWorkspace();
  const year = new Date().getFullYear();
  const adjustments = useResource<{ results: LeaveAdjustment[] }>(`/hr/leave-adjustments?company=${company.id}&employee=${employee.id}&year=${year}`);
  const absences = useResource<AbsenceDay[]>(can("hr.attendance.view") ? `/hr/employees/${employee.id}/absences?year=${year}` : null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ days: "", reason: "" });
  const save = useAction();
  const editable = can("hr.employee.update");
  const refresh = async () => { await adjustments.mutate(); onChange(); };
  const add = () => save.run(async () => {
    await api.post("/hr/leave-adjustments", { company: company.id, employee: employee.id, year, days: form.days, reason: form.reason });
    setForm({ days: "", reason: "" });
    setAdding(false);
    await refresh();
  });
  const remove = (id: number) => save.run(async () => { await api.delete(`/hr/leave-adjustments/${id}`); await refresh(); });
  const rows = adjustments.data?.results ?? [];
  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">{t("Annual leave adjustments")} {year}</h4>
          {editable && !adding ? <Button variant="secondary" className="h-8 px-3 text-sm" onClick={() => setAdding(true)}><Plus aria-hidden className="size-4" />{t("Adjust")}</Button> : null}
        </div>
        {rows.length === 0 && !adding ? <p className="text-sm text-ink-soft">{t("None. Add days carried over from last year, or days already taken before the system.")}</p> : null}
        {rows.length ? (
          <ul className="divide-y divide-line rounded-xl border border-line text-sm">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center gap-3 px-3 py-2">
                <span className={`w-16 font-semibold tabular-nums ${Number(row.days) < 0 ? "text-danger" : ""}`}>{Number(row.days) > 0 ? "+" : ""}{days(row.days)}</span>
                <span className="flex-1">{row.reason}</span>
                {editable ? <Button variant="ghost" className="h-8 px-2" aria-label={t("Delete")} onClick={() => remove(row.id)}><Trash2 aria-hidden className="size-4" /></Button> : null}
              </li>
            ))}
          </ul>
        ) : null}
        {adding ? (
          <form onSubmit={onSubmit(add)} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
            <TextField label={t("Days")} inputMode="decimal" required autoFocus value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} error={save.field("days")} hint="Minus to take off." />
            <TextField label={t("Reason")} required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} error={save.field("reason")} placeholder="e.g. Carried over from 2025" />
            <div className="flex gap-2"><Button variant="secondary" onClick={() => setAdding(false)}>{t("Cancel")}</Button><Button type="submit" pending={save.pending}>{t("Save")}</Button></div>
          </form>
        ) : null}
        <ErrorBanner error={save.error} />
      </div>
      {absences.data ? (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold">{t("Absences and late days")} {year}</h4>
          {absences.data.length === 0 ? <p className="text-sm text-ink-soft">{t("None marked.")}</p> : (
            <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-xl border border-line text-sm">
              {absences.data.map((row) => (
                <li key={row.date} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-28 tabular-nums">{formatDate(row.date, locale)}</span>
                  <AttendanceBadge status={row.status} />
                  {row.check_in ? <span className="text-ink-soft tabular-nums">{row.check_in}</span> : null}
                  <span className="flex-1 truncate text-ink-soft">{row.note}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
