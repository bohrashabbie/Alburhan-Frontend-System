"use client";

import { CalendarDays, CheckCircle2, CircleAlert, XCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Brand } from "@/components/brand";
import { Button, ErrorBanner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { onSubmit, useAction } from "@/lib/hooks";
import type { LeaveDecision } from "@/lib/types";
import { useLocale, useT } from "@/lib/locale";

const n = (value: string) => (Number.isInteger(Number(value)) ? String(Number(value)) : Number(value).toFixed(1));

/**
 * Opened from the manager's email: shows the request and asks for the decision. No sign-in: the
 * link's signed token identifies the request and the manager. The decision is a button press
 * (not the link itself) so mail scanners that open links can't decide anything.
 */
export default function LeaveDecisionPage() {
  const { token } = useParams<{ token: string }>();
  const t = useT();
  const locale = useLocale();
  const [data, setData] = useState<LeaveDecision | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const action = useAction();

  useEffect(() => {
    api.get<LeaveDecision>(`/hr/leave-decision/${token}`).then(setData, (reason: ApiError) => setError(reason));
  }, [token]);

  const decide = (decision: "approve" | "reject") =>
    action.run(async () => {
      setData(await api.post<LeaveDecision>(`/hr/leave-decision/${token}`, { decision, note }));
    });

  const balance = data?.balances[0];
  return (
    <main className="flex flex-1 flex-col px-6 py-8 sm:px-12">
      <Brand large />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 py-10">
        {error ? (
          <div className="flex flex-col gap-3">
            <CircleAlert aria-hidden className="size-10 text-danger" />
            <h1 className="text-2xl font-bold tracking-tight">{t("This link can't be used")}</h1>
            <p className="text-ink-soft">{error.message}</p>
          </div>
        ) : !data ? (
          <p className="text-ink-soft">{t("Loading…")}</p>
        ) : (
          <>
            <div>
              <p className="text-sm font-medium text-ink-soft">{data.company} · {data.number}</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">{t("Leave request")}</h1>
            </div>
            <div className="rounded-2xl border border-line p-5">
              <p className="text-lg font-semibold">{data.employee}</p>
              <p className="text-sm text-ink-soft">{[data.job_title, data.employee_email].filter(Boolean).join(" · ")}</p>
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-surface-muted/60 p-3">
                <CalendarDays aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-soft" />
                <div>
                  <p className="font-semibold">{locale === "ar" && data.leave_type_ar ? data.leave_type_ar : data.leave_type}{data.is_paid ? "" : ` · ${t("unpaid")}`}</p>
                  <p className="text-sm tabular-nums">{data.start_date === data.end_date ? formatDate(data.start_date, locale) : `${formatDate(data.start_date, locale)} – ${formatDate(data.end_date, locale)}`} · {n(data.days)} {t("working days")}</p>
                  {balance && balance.remaining !== null ? <p className="mt-1 text-xs text-ink-soft tabular-nums">{t("Balance before this request")}: {n(String(Number(balance.remaining) + (data.status === "pending" ? Number(data.days) : 0)))} {t("days")}</p> : null}
                </div>
              </div>
              {data.reason ? <p className="mt-4 text-[15px] whitespace-pre-line">“{data.reason}”</p> : null}
            </div>

            {data.status !== "pending" ? (
              <div className="flex items-start gap-3 rounded-2xl border border-line p-5">
                {data.status === "approved" ? <CheckCircle2 aria-hidden className="size-6 shrink-0 text-link" /> : <XCircle aria-hidden className="size-6 shrink-0 text-danger" />}
                <div>
                  <p className="font-semibold">{t(data.status_label)}{data.decided_by_name ? ` · ${data.decided_by_name}` : ""}</p>
                  <p className="text-sm text-ink-soft">{data.decided_at ? formatDate(data.decided_at, locale) : ""}{data.decision_note ? ` · “${data.decision_note}”` : ""}</p>
                  <p className="mt-2 text-sm text-ink-soft">{t("The employee and HR have been emailed. You can close this page.")}</p>
                </div>
              </div>
            ) : rejecting ? (
              <form onSubmit={onSubmit(() => decide("reject"))} className="flex flex-col gap-3">
                <ErrorBanner error={action.error} />
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  {t("Why is it rejected?")}
                  <textarea autoFocus required rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-xl border border-line-strong bg-surface px-4 py-3 text-base font-normal" />
                </label>
                <div className="flex gap-2">
                  <Button variant="secondary" className="h-12 flex-1" onClick={() => setRejecting(false)}>{t("Back")}</Button>
                  <Button variant="danger" type="submit" className="h-12 flex-1" pending={action.pending} disabled={!note.trim()}>{t("Reject")}</Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-3">
                <ErrorBanner error={action.error} />
                <p className="text-sm text-ink-soft">{t("Approving lets HR plan for the absence; unpaid days are deducted in the month's payroll.")}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" className="h-12 flex-1" onClick={() => setRejecting(true)}><XCircle aria-hidden className="size-5" />{t("Reject")}</Button>
                  <Button className="h-12 flex-1" pending={action.pending} onClick={() => decide("approve")}><CheckCircle2 aria-hidden className="size-5" />{t("Approve")}</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
