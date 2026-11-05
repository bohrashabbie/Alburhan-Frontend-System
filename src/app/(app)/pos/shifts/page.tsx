"use client";

import { useState } from "react";

import { DocumentList, Facts } from "@/components/document-list";
import { Button, Drawer, Loading, Modal } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import { CloseShiftForm, formatTime, OpenShiftForm, POS_METHODS, PosStatus, useRegisters } from "@/lib/pos";
import type { Shift } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function ShiftDrawer({ shift: initial, onDone }: { shift: Shift; onDone: () => void }) {
  const { company, locale, can, t } = useWorkspace();
  const live = useResource<Shift>(`/pos/shifts/${initial.id}`);
  const shift = live.data ?? initial;
  const [closing, setClosing] = useState(false);
  const money = (value: string) => formatMoney(value, company.currency, locale);
  const totals = shift.totals;
  const difference = Number(shift.cash_difference);

  return (
    <Drawer open large wide onClose={onDone} title={shift.number} action={<PosStatus status={shift.status} />}>
      <div className="profile-section flex flex-col gap-5 pb-8">
        <Facts
          items={[
            [t("Register"), `${shift.register_code} · ${shift.register_name}`],
            [t("Opened"), `${formatDate(shift.opened_at, locale)} ${formatTime(shift.opened_at, locale)}`],
            [t("Opened by"), shift.opened_by_name ?? "—"],
            [t("Opening float"), money(shift.opening_cash)],
          ]}
        />
        <section className="grid gap-3 sm:grid-cols-3">
          <Tile label={t("Sales count")} value={`${totals.sales_count}${Number(totals.voided_count) > 0 ? ` (${totals.voided_count} ${t("Voided").toLowerCase()})` : ""}`} />
          <Tile label={t("Net sales")} value={money(totals.net_total)} strong />
          <Tile label={t("Expected cash in drawer")} value={money(totals.expected_cash)} />
        </section>
        <section className="rounded-xl border border-line">
          <h3 className="border-b border-line px-4 py-3 text-base font-bold">{t("By method")}</h3>
          <dl className="divide-y divide-line text-sm">
            {POS_METHODS.map(([method, label]) => (
              <div key={method} className="flex items-center justify-between px-4 py-2.5">
                <dt className="text-ink-soft">{t(label)}</dt>
                <dd className="font-medium tabular-nums">{money(totals.by_method[method])}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-2.5">
              <dt className="text-ink-soft">{t("Gross sales")}</dt>
              <dd className="tabular-nums">{money(totals.sales_total)}</dd>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <dt className="text-ink-soft">{t("Refunds")}</dt>
              <dd className="tabular-nums">{money(totals.refunds_total)}</dd>
            </div>
          </dl>
        </section>
        {shift.status === "closed" ? (
          <section className="rounded-xl border border-line">
            <h3 className="border-b border-line px-4 py-3 text-base font-bold">{t("Close shift")}</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 text-sm sm:grid-cols-4">
              <Fact label={t("Closed")} value={`${formatDate(shift.closed_at, locale)} ${formatTime(shift.closed_at, locale)}`} />
              <Fact label={t("Closed by")} value={shift.closed_by_name ?? "—"} />
              <Fact label={t("Cash counted")} value={money(shift.closing_cash)} />
              <Fact label={t("Cash difference")} value={<span className={difference < 0 ? "text-danger" : difference > 0 ? "text-warning" : ""}>{money(shift.cash_difference)}</span>} />
            </dl>
            {shift.notes ? <p className="border-t border-line px-4 py-3 text-sm whitespace-pre-line text-ink-soft">{shift.notes}</p> : null}
          </section>
        ) : can("pos.shift.close") ? (
          <section className="rounded-xl border border-line p-4">
            {closing ? (
              <CloseShiftForm shift={shift} onDone={() => onDone()} onCancel={() => setClosing(false)} />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-soft">{t("Count the drawer and close the shift at the end of the day.")}</p>
                <Button onClick={() => setClosing(true)}>{t("Close shift")}</Button>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </Drawer>
  );
}

function Tile({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-line px-4 py-3">
      <div className="text-xs tracking-wide text-ink-soft uppercase">{label}</div>
      <div className={`mt-1 tabular-nums ${strong ? "text-xl font-bold" : "text-base font-semibold"}`}>{value}</div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-ink-soft">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function NewShift({ onDone }: { onDone: () => void }) {
  const { t } = useWorkspace();
  const { registers, loading } = useRegisters();
  return (
    <Modal open onClose={onDone} title={t("Open shift")}>
      {loading ? <Loading /> : <OpenShiftForm registers={registers} onDone={onDone} onCancel={onDone} />}
    </Modal>
  );
}

export default function ShiftsPage() {
  const { company, locale } = useWorkspace();
  const money = (value: string) => formatMoney(value, company.currency, locale);
  return (
    <DocumentList<Shift>
      title="Shifts"
      description="Every cashier session: who opened the till, what was sold, and whether the drawer balanced."
      endpoint="/pos/shifts"
      createPermission="pos.shift.open"
      newLabel="Open shift"
      statuses={[["open", "Open"], ["closed", "Closed"]]}
      columns={[
        { label: "Number", render: (row) => <span className="font-medium">{row.number}</span> },
        { label: "Register", render: (row) => <span><span className="block">{row.register_name}</span><span className="block text-xs text-ink-soft">{row.branch_name}</span></span> },
        { label: "Opened", render: (row) => <span className="tabular-nums">{formatDate(row.opened_at, locale)} {formatTime(row.opened_at, locale)}</span> },
        { label: "Opened by", render: (row) => row.opened_by_name ?? "—" },
        { label: "Closed", render: (row) => (row.closed_at ? <span className="tabular-nums">{formatDate(row.closed_at, locale)} {formatTime(row.closed_at, locale)}</span> : <span className="text-ink-faint">—</span>) },
        { label: "Net sales", align: "end", render: (row) => money(row.status === "closed" ? String(Number(row.sales_total) - Number(row.refunds_total)) : row.totals.net_total) },
        { label: "Cash difference", align: "end", render: (row) => (row.status === "closed" ? <span className={Number(row.cash_difference) < 0 ? "text-danger" : Number(row.cash_difference) > 0 ? "text-warning" : ""}>{money(row.cash_difference)}</span> : <span className="text-ink-faint">—</span>) },
        { label: "Status", render: (row) => <PosStatus status={row.status} /> },
      ]}
      renderOpen={(open, close) => (open === "new" ? <NewShift onDone={close} /> : <ShiftDrawer shift={open} onDone={close} />)}
    />
  );
}
