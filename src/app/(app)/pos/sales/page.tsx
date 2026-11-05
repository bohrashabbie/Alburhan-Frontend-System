"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DocumentList, Facts } from "@/components/document-list";
import { Button, Drawer, ErrorBanner, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import { formatTime, PosStatus, PrintButton, ReceiptSlip } from "@/lib/pos";
import type { PosSale } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function SaleDrawer({ sale: initial, onDone }: { sale: PosSale; onDone: () => void }) {
  const { company, locale, can, t } = useWorkspace();
  const live = useResource<PosSale>(`/pos/sales/${initial.id}`);
  const sale = live.data ?? initial;
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const action = useAction();
  const money = (value: string) => formatMoney(value, company.currency, locale);
  const voidSale = () =>
    action.run(async () => {
      await api.post(`/pos/sales/${sale.id}/void`, { reason });
      await live.mutate();
      setVoiding(false);
    });

  return (
    <Drawer open large wide onClose={onDone} title={sale.number} action={<PosStatus status={sale.status} />}>
      <div className="profile-section flex flex-col gap-5 pb-8">
        <Facts
          items={[
            [t("Register"), `${sale.register_code} · ${sale.register_name}`],
            [t("Shift"), sale.shift_number],
            [t("Cashier"), sale.cashier ?? "—"],
            [t("Date"), `${formatDate(sale.date, locale)} ${formatTime(sale.created_at, locale)}`],
          ]}
        />
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            <section className="grid gap-3 sm:grid-cols-3">
              <Tile label={t("Total")} value={money(sale.total)} strong />
              <Tile label={t("Paid")} value={money(sale.tendered)} />
              <Tile label={t("Change")} value={money(sale.change_given)} />
            </section>
            {sale.status === "voided" ? (
              <section className="rounded-xl border border-danger/30 bg-danger-soft/40 px-4 py-3 text-sm">
                <div className="font-semibold text-danger">{t("Voided")} · {sale.credit_note_number}</div>
                <div className="mt-1 text-ink-soft">{sale.void_reason}</div>
                <div className="mt-1 text-xs text-ink-faint">{formatDate(sale.voided_at, locale)} {formatTime(sale.voided_at, locale)}</div>
              </section>
            ) : can("pos.sale.void") ? (
              <section className="rounded-xl border border-line p-4">
                {voiding ? (
                  <form onSubmit={onSubmit(voidSale)} className="flex flex-col gap-3">
                    <ErrorBanner error={action.error} />
                    <TextField label={t("Reason")} autoFocus required value={reason} onChange={(e) => setReason(e.target.value)} error={action.field("reason")} hint={t("Goods go back to stock and the money is refunded the way it was paid. Only while the shift is open.")} />
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => setVoiding(false)}>{t("Cancel")}</Button>
                      <Button variant="danger" type="submit" pending={action.pending} disabled={!reason.trim()}>{t("Void sale")}</Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-ink-soft">{t("Made a mistake? Void the sale to return the goods and refund the customer.")}</p>
                    <div className="flex gap-2">
                      <PrintButton />
                      <Button variant="danger" onClick={() => setVoiding(true)}>{t("Void")}</Button>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <div className="flex justify-end"><PrintButton /></div>
            )}
          </div>
          <div className="print-area">
            <ReceiptSlip sale={sale} />
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function Tile({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border border-line px-3 py-3">
      <div className="truncate text-xs tracking-wide text-ink-soft uppercase">{label}</div>
      <div className={`mt-1 text-base tabular-nums ${strong ? "font-bold" : "font-semibold"}`}>{value}</div>
    </div>
  );
}

/** "New" on this list means: go to the till. */
function GoToTill() {
  const router = useRouter();
  useEffect(() => {
    router.push("/pos/till");
  }, [router]);
  return null;
}

export default function PosSalesPage() {
  const { company, locale, t } = useWorkspace();
  const money = (value: string) => formatMoney(value, company.currency, locale);
  return (
    <DocumentList<PosSale>
      title="Sales"
      description="Every till receipt. Each one is a posted invoice, delivery and receipt in Sales and Accounts."
      endpoint="/pos/sales"
      createPermission="pos.sale.create"
      newLabel="Sell"
      statuses={[["completed", "Completed"], ["voided", "Voided"]]}
      columns={[
        { label: "Receipt", render: (row) => <span className="font-medium">{row.number}</span> },
        { label: "Time", render: (row) => <span className="tabular-nums">{formatDate(row.date, locale)} {formatTime(row.created_at, locale)}</span> },
        { label: "Register", render: (row) => row.register_name },
        { label: "Customer", render: (row) => row.customer_name },
        { label: "Items", align: "end", render: (row) => row.lines.length },
        { label: "Total", align: "end", render: (row) => <span className="font-medium">{money(row.total)}</span> },
        { label: "Paid by", render: (row) => [...new Set(row.payments.filter((p) => Number(p.amount) > 0).map((p) => t(p.method_label)))].join(" + ") },
        { label: "Status", render: (row) => <PosStatus status={row.status} /> },
      ]}
      renderOpen={(open, close) => (open === "new" ? <GoToTill /> : <SaleDrawer sale={open} onDone={close} />)}
    />
  );
}
