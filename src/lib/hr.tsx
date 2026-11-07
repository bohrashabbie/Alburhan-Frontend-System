"use client";

import { CheckCircle2, Mail, MailWarning, XCircle } from "lucide-react";
import { useState } from "react";

import { Badge, Button, ErrorBanner, SelectField, TextAreaField, TextField } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { onSubmit, useAction } from "@/lib/hooks";
import type { HRNotification, LeaveBalance, LeaveRequest, LeaveStatus, LeaveType } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export const LEAVE_STATUSES: [LeaveStatus, string][] = [
  ["pending", "Waiting for approval"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["cancelled", "Cancelled"],
];

const TONES: Record<LeaveStatus, "warning" | "success" | "danger" | "neutral"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral",
};

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  const { t } = useWorkspace();
  const label = LEAVE_STATUSES.find(([value]) => value === status)?.[1] ?? status;
  return <Badge tone={TONES[status]}>{t(label)}</Badge>;
}

export const days = (value: string | number) => {
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
};

/** "Sun 8 – Thu 12 Nov 2026" or a single day. */
export function leaveDates(start: string, end: string, locale: "en" | "ar") {
  return start === end ? formatDate(start, locale) : `${formatDate(start, locale)} – ${formatDate(end, locale)}`;
}

/** Count working days on the client so the form can show it while typing. */
export function workingDays(start: string, end: string, weekend: number[]) {
  if (!start || !end || end < start) return 0;
  let count = 0;
  const day = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (day <= last) {
    // JS: 0 = Sunday; Python (the server): 0 = Monday.
    const python = (day.getDay() + 6) % 7;
    if (!weekend.includes(python)) count += 1;
    day.setDate(day.getDate() + 1);
  }
  return count;
}

export function BalanceCards({ balances }: { balances: LeaveBalance[] }) {
  const { locale, t } = useWorkspace();
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {balances.map((row) => (
        <div key={row.leave_type} className="rounded-xl border border-line p-4">
          <p className="truncate text-sm text-ink-soft">{locale === "ar" && row.name_ar ? row.name_ar : row.name}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
            {row.remaining === null ? "—" : days(row.remaining)}
            <span className="ms-1 text-sm font-medium text-ink-soft">{row.remaining === null ? t("no limit") : t("days left")}</span>
          </p>
          <p className="mt-1 text-xs text-ink-faint tabular-nums">
            {row.entitled === null ? "" : `${days(row.entitled)} ${t("a year")} · `}
            {days(row.taken)} {t("taken")}
            {Number(row.pending) > 0 ? ` · ${days(row.pending)} ${t("waiting")}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

export function LeaveForm({
  types,
  weekend,
  onSubmit: submit,
  onCancel,
  submitLabel,
}: {
  types: LeaveType[];
  weekend: number[];
  onSubmit: (body: { leave_type: number; start_date: string; end_date: string; reason: string }) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const { name, t } = useWorkspace();
  const [type, setType] = useState(types[0] ? String(types[0].id) : "");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const action = useAction();
  const count = workingDays(start, end || start, weekend);
  return (
    <form
      onSubmit={onSubmit(() => action.run(() => submit({ leave_type: Number(type), start_date: start, end_date: end || start, reason })))}
      className="flex flex-col gap-4"
    >
      <ErrorBanner error={action.error} hideFields />
      <SelectField label={t("Type of leave")} value={type} onChange={(e) => setType(e.target.value)} error={action.field("leave_type")} required>
        {types.map((item) => (
          <option key={item.id} value={item.id}>{name(item)}{item.is_paid ? "" : ` · ${t("unpaid")}`}</option>
        ))}
      </SelectField>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label={t("First day")} type="date" required value={start} onChange={(e) => { setStart(e.target.value); if (!end || e.target.value > end) setEnd(e.target.value); }} error={action.field("start_date")} />
        <TextField label={t("Last day")} type="date" required value={end} min={start} onChange={(e) => setEnd(e.target.value)} error={action.field("end_date")} />
      </div>
      {start ? (
        <p className="text-sm text-ink-soft">
          <span className="font-semibold text-ink tabular-nums">{count}</span> {t(count === 1 ? "working day" : "working days")} · {t("weekends are not counted")}
        </p>
      ) : null}
      <TextAreaField label={t("Reason")} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} hint={t("Optional. Your manager sees it in the email.")} />
      <div className="flex justify-end gap-2">
        {onCancel ? <Button variant="secondary" onClick={onCancel}>{t("Cancel")}</Button> : null}
        <Button type="submit" pending={action.pending} disabled={!type || !start}>{submitLabel}</Button>
      </div>
    </form>
  );
}

/** Approve, or reject with a reason. */
export function DecisionButtons({ onDecide }: { onDecide: (decision: "approve" | "reject", note: string) => Promise<void> }) {
  const { t } = useWorkspace();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const action = useAction();
  if (rejecting) {
    return (
      <form onSubmit={onSubmit(() => action.run(() => onDecide("reject", note)))} className="flex flex-col gap-3">
        <ErrorBanner error={action.error} />
        <TextField label={t("Why is it rejected?")} autoFocus required value={note} onChange={(e) => setNote(e.target.value)} hint={t("The employee sees this.")} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRejecting(false)}>{t("Back")}</Button>
          <Button variant="danger" type="submit" pending={action.pending} disabled={!note.trim()}><XCircle aria-hidden className="size-4" />{t("Reject")}</Button>
        </div>
      </form>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <ErrorBanner error={action.error} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => setRejecting(true)}><XCircle aria-hidden className="size-4" />{t("Reject")}</Button>
        <Button pending={action.pending} onClick={() => action.run(() => onDecide("approve", ""))}><CheckCircle2 aria-hidden className="size-4" />{t("Approve")}</Button>
      </div>
    </div>
  );
}

const KINDS: Record<string, string> = {
  approval: "Asked to approve",
  hr_copy: "Copy to HR",
  received: "Confirmation to employee",
  approved: "Approval to employee",
  rejected: "Rejection to employee",
  hr_approved: "Approval to HR",
  hr_rejected: "Rejection to HR",
  cancelled: "Cancellation",
};

/** The emails a request produced, so HR can see who was told what. */
export function EmailTrail({ items }: { items: HRNotification[] }) {
  const { locale, t } = useWorkspace();
  if (!items.length) return <p className="text-sm text-ink-soft">{t("No emails yet. Add an email address to the employee and their manager.")}</p>;
  return (
    <ul className="divide-y divide-line rounded-xl border border-line text-sm">
      {[...items].reverse().map((item) => (
        <li key={item.id} className="flex items-start gap-3 px-4 py-2.5">
          {item.sent ? <Mail aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-soft" /> : <MailWarning aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />}
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{t(KINDS[item.kind] ?? item.kind)} · <span className="font-normal text-ink-soft">{item.to}</span></span>
            <span className="block truncate text-xs text-ink-faint">{item.subject}{item.error ? ` · ${item.error}` : ""}</span>
          </span>
          <span className="shrink-0 text-xs text-ink-faint tabular-nums">{formatDate(item.created_at, locale)}</span>
        </li>
      ))}
    </ul>
  );
}

export function leaveTypeName(request: LeaveRequest, locale: "en" | "ar") {
  return locale === "ar" && request.leave_type_name_ar ? request.leave_type_name_ar : request.leave_type_name;
}
