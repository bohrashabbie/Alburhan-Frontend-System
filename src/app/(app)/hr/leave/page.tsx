"use client";

import { useState } from "react";

import { DocumentList, Facts } from "@/components/document-list";
import { Button, Drawer, ErrorBanner, Loading, SelectField } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useAction, useResource } from "@/lib/hooks";
import { BalanceCards, DecisionButtons, days, EmailTrail, LEAVE_STATUSES, LeaveForm, leaveDates, LeaveStatusBadge, leaveTypeName } from "@/lib/hr";
import type { Employee, LeaveBalance, LeaveRequest, LeaveType, Page } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function Viewer({ doc, onDone }: { doc: LeaveRequest; onDone: () => void }) {
  const { can, locale, t } = useWorkspace();
  const live = useResource<LeaveRequest>(`/hr/leave/${doc.id}`);
  const item = live.data ?? doc;
  const cancel = useAction();
  return (
    <Drawer open large wide onClose={onDone} title={item.number} action={<LeaveStatusBadge status={item.status} />}>
      <div className="profile-section flex flex-col gap-6 pb-6">
        <Facts
          items={[
            [t("Employee"), item.employee_name],
            [t("Type"), `${leaveTypeName(item, locale)}${item.is_paid ? "" : ` · ${t("unpaid")}`}`],
            [t("Dates"), leaveDates(item.start_date, item.end_date, locale)],
            [t("Working days"), days(item.days)],
          ]}
        />
        {item.reason ? <p className="text-[15px] whitespace-pre-line">{item.reason}</p> : null}
        <section className="rounded-xl border border-line px-4 py-3 text-sm">
          {item.status === "pending" ? (
            <p>{t("Waiting for")} <span className="font-semibold">{item.approver_name ?? "HR"}</span>{item.approver_email ? ` (${item.approver_email})` : ""}.</p>
          ) : item.decided_by_name ? (
            <p>
              <span className="font-semibold">{item.status_label}</span> {t("by")} {item.decided_by_name} · {formatDate(item.decided_at, locale)} · {item.decided_via === "email" ? t("from the email link") : t("in the app")}
              {item.decision_note ? <span className="mt-1 block text-ink-soft">“{item.decision_note}”</span> : null}
            </p>
          ) : (
            <p className="font-semibold">{item.status_label}</p>
          )}
          {item.payroll_number ? <p className="mt-1 text-ink-soft">{t("Accounted in payroll")} <span className="font-mono text-ink">{item.payroll_number}</span></p> : null}
        </section>
        {item.status === "pending" && can("hr.leave.approve") ? (
          <DecisionButtons onDecide={async (decision, note) => { await api.post(`/hr/leave/${item.id}/decide`, { decision, note }); await live.mutate(); }} />
        ) : null}
        <section className="flex flex-col gap-2">
          <h3 className="text-base font-bold">{t("Emails")}</h3>
          <EmailTrail items={item.notifications} />
        </section>
        {(item.status === "pending" || item.status === "approved") && !item.payroll_number && can("hr.leave.update") ? (
          <div className="flex justify-start border-t border-line pt-5">
            <ErrorBanner error={cancel.error} />
            <Button variant="ghost" pending={cancel.pending} onClick={() => cancel.run(async () => { if (!window.confirm(t("Cancel this leave?"))) return; await api.post(`/hr/leave/${item.id}/cancel`); await live.mutate(); })}>{t("Cancel leave")}</Button>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}

/** HR files a request for someone (e.g. sick leave phoned in). */
function NewRequest({ onDone }: { onDone: () => void }) {
  const { company, t } = useWorkspace();
  const people = useResource<Page<Employee>>(`/hr/employees?company=${company.id}&is_active=true&page_size=500`);
  const types = useResource<Page<LeaveType>>(`/hr/leave-types?company=${company.id}&is_active=true`);
  const [employee, setEmployee] = useState("");
  const balance = useResource<{ weekend: number[]; balances: LeaveBalance[] }>(employee ? `/hr/employees/${employee}/balance` : null);
  return (
    <Drawer open large onClose={onDone} title={t("New leave request")}>
      <div className="profile-section flex flex-col gap-5 pb-6">
        <SelectField label={t("Employee")} value={employee} onChange={(e) => setEmployee(e.target.value)} required>
          <option value="">—</option>
          {(people.data?.results ?? []).map((item) => <option key={item.id} value={item.id}>{item.full_name}{item.job_title ? ` · ${item.job_title}` : ""}</option>)}
        </SelectField>
        {employee && balance.data && types.data ? (
          <>
            <BalanceCards balances={balance.data.balances} />
            <LeaveForm
              types={types.data.results}
              weekend={balance.data.weekend}
              submitLabel={t("Send to manager")}
              onCancel={onDone}
              onSubmit={async (body) => { await api.post("/hr/leave/submit", { ...body, employee: Number(employee) }); onDone(); }}
            />
          </>
        ) : employee ? <Loading /> : <p className="text-sm text-ink-soft">{t("Choose who the leave is for. Their manager gets the approval email.")}</p>}
      </div>
    </Drawer>
  );
}

export default function LeaveRequestsPage() {
  const { locale, t } = useWorkspace();
  return (
    <DocumentList<LeaveRequest>
      title="Leave requests"
      description="Every request: who asked, for when, and who approved it. Managers get an email to approve; HR gets a copy of everything."
      endpoint="/hr/leave"
      createPermission="hr.leave.create"
      newLabel="New request"
      statuses={LEAVE_STATUSES}
      columns={[
        { label: "Number", render: (row) => <span className="font-mono text-xs">{row.number}</span> },
        { label: "Employee", render: (row) => <span className="font-medium">{row.employee_name}</span> },
        { label: "Type", render: (row) => `${leaveTypeName(row, locale)}${row.is_paid ? "" : ` · ${t("unpaid")}`}` },
        { label: "Dates", render: (row) => <span className="tabular-nums">{leaveDates(row.start_date, row.end_date, locale)}</span> },
        { label: "Days", render: (row) => <span className="tabular-nums">{days(row.days)}</span>, align: "end" },
        { label: "Approver", render: (row) => row.decided_by_name || row.approver_name || "HR" },
        { label: "Status", render: (row) => <LeaveStatusBadge status={row.status} /> },
      ]}
      renderOpen={(open, close) => (open === "new" ? <NewRequest onDone={close} /> : <Viewer key={open.id} doc={open} onDone={close} />)}
    />
  );
}
