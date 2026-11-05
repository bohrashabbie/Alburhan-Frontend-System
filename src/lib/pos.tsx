"use client";

import { Printer } from "lucide-react";
import { Fragment, useState } from "react";

import { Badge, Button, ErrorBanner, SelectField, TextAreaField, TextField } from "@/components/ui";
import { api, withQuery } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import { decimalsOf, fromMinor, toMinor } from "@/lib/money";
import type { Page, PosMethod, PosSale, Register, Shift } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export const POS_METHODS: [PosMethod, string][] = [
  ["cash", "Cash"],
  ["knet", "KNET"],
  ["card", "Card"],
];

/** Active registers of the current company, narrowed to the chosen branch. */
export function useRegisters() {
  const { company, branch } = useWorkspace();
  const list = useResource<Page<Register>>(
    withQuery("/pos/registers", { company: company.id, branch: branch?.id, is_active: "true", page_size: 100 }),
  );
  return { registers: list.data?.results ?? [], loading: !list.data && !list.error, error: list.error, refresh: list.mutate };
}

export function PosStatus({ status }: { status: string }) {
  const { t } = useWorkspace();
  const map: Record<string, [string, "neutral" | "success" | "warning" | "danger"]> = {
    open: ["Open", "success"],
    closed: ["Closed", "neutral"],
    completed: ["Completed", "success"],
    voided: ["Voided", "danger"],
  };
  const [label, tone] = map[status] ?? [status, "neutral"];
  return <Badge tone={tone}>{t(label)}</Badge>;
}

export function formatTime(value: string | null | undefined, locale: "en" | "ar") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-KW-u-nu-latn" : "en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

/** "12" for whole units, "2.5" for fractions. */
export function trimQty(value: string) {
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}

// --- Money maths for the cart (BigInt, mirrors the backend's half-up rounding) -----------------

/** n / d rounded half up, for n ≥ 0. */
function divRound(n: bigint, d: bigint) {
  return (n * 2n + d) / (d * 2n);
}

/** Net, VAT and total of one line in minor units. qty has 4 decimals, percents have 2. */
export function lineTotals(price: string, quantity: string, discount: string, taxRate: string, decimals: number) {
  const priceMinor = toMinor(price || "0", decimals);
  const qty = toMinor(quantity || "0", 4);
  const disc = toMinor(discount || "0", 2);
  const rate = toMinor(taxRate || "0", 2);
  const net = divRound(priceMinor * qty * (10000n - disc), 10000n * 10000n);
  const tax = divRound(net * rate, 10000n);
  return { net, tax, total: net + tax };
}

/** Rounds a minor amount up to the next multiple of `step` major units (for quick cash buttons). */
export function roundUpTo(minor: bigint, step: number, decimals: number) {
  const unit = BigInt(step) * 10n ** BigInt(decimals);
  return minor <= 0n ? unit : ((minor + unit - 1n) / unit) * unit;
}

export function minorToInput(minor: bigint, decimals: number) {
  return fromMinor(minor, decimals);
}

// --- Receipt slip -------------------------------------------------------------------------------

/** The 80 mm till receipt. Wrap it in `.print-area` and call window.print() to print only it. */
export function ReceiptSlip({ sale }: { sale: PosSale }) {
  const { company, locale, t } = useWorkspace();
  const money = (value: string) => formatMoney(value, sale.currency, locale);
  const label = (line: { name: string; name_ar: string }) => (locale === "ar" && line.name_ar ? line.name_ar : line.name);
  const paid = sale.payments.filter((payment) => Number(payment.amount) > 0);
  return (
    <div className="receipt-slip mx-auto w-full max-w-[320px] rounded-xl border border-line bg-surface px-5 py-6 font-mono text-[13px] leading-5 text-ink">
      <div className="text-center">
        <div className="text-base font-bold tracking-tight">{company.name}</div>
        <div className="text-xs text-ink-soft">{sale.branch_name}</div>
        {sale.receipt_header ? <div className="mt-2 text-xs whitespace-pre-line">{sale.receipt_header}</div> : null}
      </div>
      {sale.status === "voided" ? (
        <div className="mt-3 rounded-md border border-danger/40 bg-danger-soft py-1 text-center text-xs font-bold tracking-widest text-danger uppercase">{t("Voided")}</div>
      ) : null}
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        <dt className="text-ink-soft">{t("Receipt")}</dt>
        <dd className="text-end font-semibold">{sale.number}</dd>
        <dt className="text-ink-soft">{t("Date")}</dt>
        <dd className="text-end tabular-nums">{formatDate(sale.date, locale)} {formatTime(sale.created_at, locale)}</dd>
        <dt className="text-ink-soft">{t("Cashier")}</dt>
        <dd className="text-end">{sale.cashier ?? "—"}</dd>
        <dt className="text-ink-soft">{t("Customer")}</dt>
        <dd className="text-end">{sale.customer_name}</dd>
      </dl>
      <div className="my-3 border-t border-dashed border-line-strong" />
      <table className="w-full text-xs">
        <tbody>
          {sale.lines.map((line) => (
            <tr key={`${line.product}-${line.quantity}`} className="align-top">
              <td className="py-0.5 pe-2">
                <div>{label(line)}</div>
                <div className="text-ink-soft tabular-nums">
                  {trimQty(line.quantity)} × {money(line.unit_price)}
                  {Number(line.discount_percent) > 0 ? ` −${trimQty(line.discount_percent)}%` : ""}
                </div>
              </td>
              <td className="py-0.5 text-end tabular-nums whitespace-nowrap">{money(line.total_amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="my-3 border-t border-dashed border-line-strong" />
      <dl className="grid grid-cols-[1fr_auto] gap-y-0.5 text-xs tabular-nums">
        <dt className="text-ink-soft">{t("Subtotal")}</dt>
        <dd className="text-end">{money(sale.subtotal)}</dd>
        {Number(sale.tax_total) > 0 ? (
          <>
            <dt className="text-ink-soft">{t("VAT")}</dt>
            <dd className="text-end">{money(sale.tax_total)}</dd>
          </>
        ) : null}
        <dt className="text-sm font-bold">{t("Total")}</dt>
        <dd className="text-end text-sm font-bold">{money(sale.total)}</dd>
        {paid.map((payment) => (
          <Fragment key={payment.id}>
            <dt className="text-ink-soft">
              {t(payment.method_label)}
              {payment.reference ? <span className="ms-1 text-ink-faint">{payment.reference}</span> : null}
            </dt>
            <dd className="text-end">{money(payment.amount)}</dd>
          </Fragment>
        ))}
        {Number(sale.change_given) > 0 ? (
          <>
            <dt className="text-ink-soft">{t("Change")}</dt>
            <dd className="text-end">{money(sale.change_given)}</dd>
          </>
        ) : null}
      </dl>
      {sale.receipt_footer ? <div className="mt-4 text-center text-xs whitespace-pre-line text-ink-soft">{sale.receipt_footer}</div> : null}
      <div className="mt-3 text-center text-[11px] text-ink-faint">{t("Invoice")} {sale.number}</div>
    </div>
  );
}

export function PrintButton({ className = "" }: { className?: string }) {
  const { t } = useWorkspace();
  return (
    <Button variant="secondary" className={className} onClick={() => window.print()}>
      <Printer aria-hidden className="size-4" />
      {t("Print")}
    </Button>
  );
}

// --- Shift forms (shared by the till and the Shifts page) -------------------------------------

export function OpenShiftForm({ registers, presetRegister, onDone, onCancel }: { registers: Register[]; presetRegister?: Register | null; onDone: (shift: Shift) => void; onCancel: () => void }) {
  const { company, name, t } = useWorkspace();
  const free = registers.filter((item) => !item.open_shift);
  const [registerId, setRegisterId] = useState(presetRegister ? String(presetRegister.id) : free[0] ? String(free[0].id) : "");
  const [openingCash, setOpeningCash] = useState("0");
  const action = useAction();
  const submit = () =>
    action.run(async () => {
      const shift = await api.post<Shift>("/pos/shifts/open", { register: Number(registerId), opening_cash: openingCash || "0" });
      onDone(shift);
    });
  return (
    <form onSubmit={onSubmit(submit)} className="flex flex-col gap-4">
      <ErrorBanner error={action.error} />
      <SelectField label={t("Register")} value={registerId} onChange={(e) => setRegisterId(e.target.value)} error={action.field("register")} required>
        {registers.map((item) => (
          <option key={item.id} value={item.id} disabled={Boolean(item.open_shift)}>
            {item.code} · {name(item)}{item.open_shift ? ` (${t("open")})` : ""}
          </option>
        ))}
      </SelectField>
      <TextField label={`${t("Opening float")} (${company.currency})`} inputMode="decimal" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} error={action.field("opening_cash")} hint={t("Cash in the drawer before the first sale.")} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>{t("Cancel")}</Button>
        <Button type="submit" pending={action.pending} disabled={!registerId}>{t("Open shift")}</Button>
      </div>
    </form>
  );
}

export function CloseShiftForm({ shift, onDone, onCancel }: { shift: Shift; onDone: (shift: Shift) => void; onCancel: () => void }) {
  const { company, locale, t } = useWorkspace();
  const decimals = decimalsOf(company.currency);
  const [closingCash, setClosingCash] = useState("");
  const [notes, setNotes] = useState("");
  const action = useAction();
  const expected = toMinor(shift.totals.expected_cash, decimals);
  const counted = closingCash === "" ? null : toMinor(closingCash, decimals);
  const difference = counted === null ? null : counted - expected;
  const submit = () =>
    action.run(async () => {
      const closed = await api.post<Shift>(`/pos/shifts/${shift.id}/close`, { closing_cash: closingCash || "0", notes });
      onDone(closed);
    });
  return (
    <form onSubmit={onSubmit(submit)} className="flex flex-col gap-4">
      <ErrorBanner error={action.error} />
      <div className="rounded-xl border border-line bg-surface-muted/40 px-4 py-3 text-sm">
        <div className="flex items-center justify-between"><span className="text-ink-soft">{t("Expected cash in drawer")}</span><span className="font-semibold tabular-nums">{formatMoney(shift.totals.expected_cash, company.currency, locale)}</span></div>
        <div className="mt-1 text-xs text-ink-faint">{t("Opening float")} {formatMoney(shift.opening_cash, company.currency, locale)} + {t("cash sales")} {formatMoney(shift.totals.by_method.cash, company.currency, locale)}</div>
      </div>
      <TextField label={`${t("Cash counted")} (${company.currency})`} inputMode="decimal" autoFocus required value={closingCash} onChange={(e) => setClosingCash(e.target.value)} error={action.field("closing_cash")} />
      {difference !== null ? (
        <p className={`text-sm font-medium tabular-nums ${difference === 0n ? "text-ink-soft" : difference < 0n ? "text-danger" : "text-warning"}`}>
          {difference === 0n ? t("Drawer balances.") : difference < 0n ? `${t("Short by")} ${formatMoney(fromMinor(-difference, decimals), company.currency, locale)}` : `${t("Over by")} ${formatMoney(fromMinor(difference, decimals), company.currency, locale)}`}
        </p>
      ) : null}
      <TextAreaField label={t("Notes")} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>{t("Cancel")}</Button>
        <Button type="submit" pending={action.pending} disabled={closingCash === ""}>{t("Close shift")}</Button>
      </div>
    </form>
  );
}
