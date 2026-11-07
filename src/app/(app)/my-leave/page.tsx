"use client";

import { CalendarPlus } from "lucide-react";
import { useState } from "react";

import { Button, Card, EmptyState, ErrorBanner, Loading, Modal, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useAction, useResource } from "@/lib/hooks";
import { BalanceCards, DecisionButtons, days, LeaveForm, leaveDates, LeaveStatusBadge, leaveTypeName } from "@/lib/hr";
import type { LeaveRequest, MyHR } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

/** Self-service leave for everyone with an employee record, and approvals for managers. */
export default function MyLeavePage() {
  const { locale, t } = useWorkspace();
  const data = useResource<MyHR>("/hr/me");
  const [asking, setAsking] = useState(false);
  const [sent, setSent] = useState<LeaveRequest | null>(null);
  const cancel = useAction();
  const me = data.data;

  if (data.error) return <ErrorBanner error={data.error} />;
  if (!me) return <Loading />;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        title={t("My leave")}
        description={me.employee ? `${me.employee.name}${me.employee.job_title ? ` · ${me.employee.job_title}` : ""}${me.employee.manager ? ` · ${t("Manager")}: ${me.employee.manager}` : ""}` : t("Ask for leave and see what is left this year.")}
        actions={me.employee ? <Button onClick={() => setAsking(true)}><CalendarPlus aria-hidden className="size-5" />{t("Ask for leave")}</Button> : undefined}
      />

      {me.approvals.length ? (
        <Card title={`${t("Waiting for your approval")} · ${me.approvals.length}`}>
          <ul className="flex flex-col gap-3">
            {me.approvals.map((item) => (
              <li key={item.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.employee_name} <span className="font-normal text-ink-soft">· {leaveTypeName(item, locale)}</span></p>
                    <p className="mt-0.5 text-sm text-ink-soft tabular-nums">{leaveDates(item.start_date, item.end_date, locale)} · {days(item.days)} {t("working days")}{item.is_paid ? "" : ` · ${t("unpaid")}`}</p>
                    {item.reason ? <p className="mt-2 text-sm">{item.reason}</p> : null}
                  </div>
                  <span className="font-mono text-xs text-ink-faint">{item.number}</span>
                </div>
                <div className="mt-3 border-t border-line pt-3">
                  <DecisionButtons onDecide={async (decision, note) => { await api.post(`/hr/me/approvals/${item.id}`, { decision, note }); await data.mutate(); }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {!me.employee ? (
        <EmptyState title={t("Your login isn't linked to an employee record.")} description={t("Ask HR to link it under HR → Employees; then you can ask for leave here.")} />
      ) : (
        <>
          <BalanceCards balances={me.balances} />
          {sent ? (
            <p role="status" className="rounded-xl border border-line bg-surface-muted/50 px-4 py-3 text-sm">
              <span className="font-semibold">{sent.number}</span> {t("was sent to")} {sent.approver_name ?? "HR"}. {t("You'll get an email when it is decided.")}
            </p>
          ) : null}
          <Card title={t("My requests")}>
            <ErrorBanner error={cancel.error} />
            {me.requests.length === 0 ? (
              <EmptyState title={t("No leave requests yet.")} description={t("Ask for leave and your manager gets an email to approve it.")} />
            ) : (
              <ul className="divide-y divide-line">
                {me.requests.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">{leaveTypeName(item, locale)} <span className="font-normal text-ink-soft tabular-nums">· {leaveDates(item.start_date, item.end_date, locale)} · {days(item.days)} {t("days")}</span></p>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {item.number}
                        {item.decided_by_name ? ` · ${item.decided_by_name}, ${formatDate(item.decided_at, locale)}` : item.approver_name ? ` · ${t("with")} ${item.approver_name}` : ""}
                        {item.decision_note ? ` · “${item.decision_note}”` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <LeaveStatusBadge status={item.status} />
                      {(item.status === "pending" || item.status === "approved") && !item.payroll_number ? (
                        <Button variant="ghost" className="h-8" pending={cancel.pending} onClick={() => cancel.run(async () => { if (!window.confirm(t("Cancel this leave?"))) return; await api.post(`/hr/me/leave/${item.id}/cancel`); await data.mutate(); })}>{t("Cancel")}</Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {asking && me.employee ? (
        <Modal open onClose={() => setAsking(false)} title={t("Ask for leave")}>
          <LeaveForm
            types={me.leave_types}
            weekend={me.weekend}
            submitLabel={t("Send request")}
            onCancel={() => setAsking(false)}
            onSubmit={async (body) => {
              const created = await api.post<LeaveRequest>("/hr/me/leave", body);
              setSent(created);
              setAsking(false);
              await data.mutate();
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}
