"use client";

import { Banknote, CreditCard, Lightbulb, Minus, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import { type KeyboardEvent, useDeferredValue, useRef, useState } from "react";

import { CustomerPicker } from "@/components/customer-picker";
import { Button, ButtonLink, EmptyState, ErrorBanner, IconButton, Loading, Modal, SelectField, TextField } from "@/components/ui";
import { api, withQuery } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useAction, useResource } from "@/lib/hooks";
import { decimalsOf, fromMinor, toMinor } from "@/lib/money";
import { CloseShiftForm, formatTime, lineTotals, OpenShiftForm, POS_METHODS, PrintButton, ReceiptSlip, roundUpTo, trimQty, useRegisters } from "@/lib/pos";
import type { Customer, PosCatalog, PosMethod, PosProduct, PosSale, Register, Shift } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

type CartLine = { product: PosProduct; quantity: string; discount: string };
type Payment = { method: PosMethod; amount: string; reference: string };

const METHOD_ICONS: Record<PosMethod, typeof Banknote> = { cash: Banknote, knet: CreditCard, card: CreditCard };

// --- Page: register + shift, then the till ------------------------------------------------------

export default function TillPage() {
  const { can, name, t } = useWorkspace();
  const { registers, loading, error, refresh } = useRegisters();
  const [choice, setChoice] = useState<number | null>(null);
  const register = registers.find((item) => item.id === choice) ?? registers.find((item) => item.open_shift) ?? registers[0] ?? null;
  const open = register?.open_shift ?? null;
  const live = useResource<Shift>(open ? `/pos/shifts/${open.id}` : null);
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);

  if (loading) return <Loading label={t("Loading…")} />;
  if (error) return <ErrorBanner error={error} />;
  if (!register) {
    return (
      <EmptyState
        title={t("No registers in this branch yet.")}
        description="Add a register under POS → Registers: it needs a warehouse, a price list, the cash and card journals and a walk-in customer."
        action={can("pos.register.create") ? <ButtonLink href="/pos/registers">{t("Registers")}</ButtonLink> : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ShiftBar registers={registers} register={register} shift={live.data ?? null} onPick={setChoice} onOpen={() => setOpening(true)} onClose={() => setClosing(true)} />
      {!open ? (
        <EmptyState
          title={t("No shift open")}
          description={t("Open a shift on this register to start selling.")}
          action={can("pos.shift.open") ? <Button onClick={() => setOpening(true)}>{t("Open shift")}</Button> : undefined}
        />
      ) : (
        <Till key={register.id} register={register} shiftId={open.id} onSold={() => live.mutate()} />
      )}
      {opening ? (
        <Modal open onClose={() => setOpening(false)} title={`${t("Open shift")} · ${name(register)}`}>
          <OpenShiftForm registers={registers} presetRegister={register} onDone={() => { setOpening(false); refresh(); }} onCancel={() => setOpening(false)} />
        </Modal>
      ) : null}
      {closing && live.data ? (
        <Modal open onClose={() => setClosing(false)} title={`${t("Close shift")} · ${live.data.number}`}>
          <CloseShiftForm shift={live.data} onDone={() => { setClosing(false); refresh(); }} onCancel={() => setClosing(false)} />
        </Modal>
      ) : null}
    </div>
  );
}

function ShiftBar({ registers, register, shift, onPick, onOpen, onClose }: { registers: Register[]; register: Register; shift: Shift | null; onPick: (id: number) => void; onOpen: () => void; onClose: () => void }) {
  const { company, locale, can, name, t } = useWorkspace();
  const money = (value: string) => formatMoney(value, company.currency, locale);
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-line bg-surface px-4 py-3">
      <div className="min-w-[14rem]">
        {registers.length > 1 ? (
          <SelectField label={t("Register")} value={String(register.id)} onChange={(e) => onPick(Number(e.target.value))}>
            {registers.map((item) => <option key={item.id} value={item.id}>{item.code} · {name(item)}</option>)}
          </SelectField>
        ) : (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{t("Register")}</span>
            <span className="text-base font-bold tracking-tight">{register.code} · {name(register)}</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 text-sm">
        <span className="font-medium">{t("Shift")}</span>
        {shift ? (
          <span className="text-ink-soft">
            <span className="font-semibold text-ink">{shift.number}</span> · {t("Opened")} {formatTime(shift.opened_at, locale)} · {shift.opened_by_name}
          </span>
        ) : (
          <span className="text-ink-faint">{t("No shift open")}</span>
        )}
      </div>
      {shift ? (
        <dl className="flex gap-6 text-sm">
          <div><dt className="text-ink-soft">{t("Sales count")}</dt><dd className="font-semibold tabular-nums">{shift.totals.sales_count}</dd></div>
          <div><dt className="text-ink-soft">{t("Net sales")}</dt><dd className="font-semibold tabular-nums">{money(shift.totals.net_total)}</dd></div>
          <div><dt className="text-ink-soft">{t("Expected cash in drawer")}</dt><dd className="font-semibold tabular-nums">{money(shift.totals.expected_cash)}</dd></div>
        </dl>
      ) : null}
      <span className="flex-1" />
      {shift ? (can("pos.shift.close") ? <Button variant="secondary" onClick={onClose}>{t("Close shift")}</Button> : null) : can("pos.shift.open") ? <Button onClick={onOpen}>{t("Open shift")}</Button> : null}
    </div>
  );
}

// --- The till: catalogue on the start side, cart on the end side -------------------------------

function Till({ register, shiftId, onSold }: { register: Register; shiftId: number; onSold: () => void }) {
  const { company, locale, name, t } = useWorkspace();
  const decimals = decimalsOf(company.currency);
  const settings = useResource<{ default_tax_rate: string }>(`/sales/settings/${company.id}`);
  const taxRate = settings.data?.default_tax_rate ?? "0";
  const [search, setSearch] = useState("");
  const deferred = useDeferredValue(search);
  const [category, setCategory] = useState<number | null>(null);
  const catalog = useResource<PosCatalog>(withQuery(`/pos/registers/${register.id}/catalog`, { search: deferred.trim(), category, limit: 120 }));
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [pickingCustomer, setPickingCustomer] = useState(false);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState<PosSale | null>(null);
  const searchBox = useRef<HTMLInputElement>(null);
  const money = (minor: bigint) => formatMoney(fromMinor(minor, decimals), company.currency, locale);

  const products = catalog.data?.products ?? [];
  const categories = catalog.data?.categories ?? [];
  const inCart = (product: PosProduct) => cart.find((line) => line.product.id === product.id);
  const soldOut = (product: PosProduct) => product.stock !== null && Number(product.stock) <= 0;

  const add = (product: PosProduct) => {
    if (soldOut(product)) return;
    setCart((lines) => {
      const existing = lines.find((line) => line.product.id === product.id);
      if (!existing) return [...lines, { product, quantity: "1", discount: "" }];
      return lines.map((line) => (line === existing ? { ...line, quantity: String(Number(line.quantity) + 1) } : line));
    });
  };
  const update = (product: PosProduct, patch: Partial<CartLine>) => setCart((lines) => lines.map((line) => (line.product.id === product.id ? { ...line, ...patch } : line)));
  const remove = (product: PosProduct) => setCart((lines) => lines.filter((line) => line.product.id !== product.id));
  const step = (line: CartLine, delta: number) => {
    const next = Number(line.quantity || "0") + delta;
    if (next <= 0) remove(line.product);
    else update(line.product, { quantity: String(next) });
  };

  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const term = search.trim();
    if (!term) return;
    const hit = products.find((item) => item.barcode === term || item.sku.toLowerCase() === term.toLowerCase()) ?? (products.length === 1 ? products[0] : null);
    if (hit) {
      add(hit);
      setSearch("");
    }
  };

  const totals = cart.reduce(
    (sum, line) => {
      const amounts = lineTotals(line.product.price, line.quantity, line.discount, taxRate, decimals);
      return { net: sum.net + amounts.net, tax: sum.tax + amounts.tax, total: sum.total + amounts.total };
    },
    { net: 0n, tax: 0n, total: 0n },
  );
  const itemCount = cart.reduce((sum, line) => sum + Number(line.quantity || "0"), 0);

  const finished = (sale: PosSale) => {
    setDone(sale);
    setCart([]);
    setCustomer(null);
    setPickingCustomer(false);
    setPaying(false);
    onSold();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* Catalogue */}
      <section className="flex min-w-0 flex-col gap-3">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 start-3.5 size-5 -translate-y-1/2 text-ink-faint" />
          <input
            ref={searchBox}
            type="search"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder={t("Scan or search")}
            aria-label={t("Scan or search")}
            className="h-12 w-full rounded-xl border border-line-strong bg-surface ps-11 pe-4 text-base text-ink placeholder:text-ink-faint"
          />
        </div>
        {categories.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Chip active={category === null} onClick={() => setCategory(null)}>{t("All")}</Chip>
            {categories.map((item) => (
              <Chip key={item.id} active={category === item.id} onClick={() => setCategory(category === item.id ? null : item.id)}>
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed S3 link
                  <img src={item.image} alt="" className="size-6 rounded-full object-cover" />
                ) : null}
                {name(item)}
              </Chip>
            ))}
          </div>
        ) : null}
        <ErrorBanner error={catalog.error} />
        {!catalog.data ? (
          <Loading label={t("Loading…")} />
        ) : !catalog.data.price_list ? (
          <EmptyState title={t("No prices yet.")} description="This register has no valid price list. Set one on the register, or mark a price list as the company default." />
        ) : products.length === 0 ? (
          <EmptyState title={t("No products match.")} description={search ? "Try another word, the SKU or scan the barcode again." : "Add prices to the register's price list to sell products here."} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {products.map((product) => {
              const line = inCart(product);
              const out = soldOut(product);
              const low = product.stock !== null && !out && Number(product.stock) <= 3;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => add(product)}
                  disabled={out}
                  className={`pos-tile group relative flex flex-col overflow-hidden rounded-xl border bg-surface p-2 text-start hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 ${line ? "border-link ring-2 ring-link/20" : "border-line hover:border-line-strong"}`}
                >
                  {line ? <span className="absolute top-3 end-3 z-10 inline-flex min-w-7 items-center justify-center rounded-full bg-link px-2 py-0.5 text-xs font-bold text-white tabular-nums">{trimQty(line.quantity)}</span> : null}
                  {product.stock !== null ? (
                    <span className={`absolute top-3 start-3 z-10 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap tabular-nums shadow-sm ${out ? "bg-danger-soft text-danger" : low ? "bg-warning-soft text-warning" : "bg-surface/90 text-ink-soft"}`}>
                      {out ? t("Out of stock") : `${product.stock} ${t("in stock")}`}
                    </span>
                  ) : null}
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed S3 link
                    <img src={product.image} alt="" className="aspect-square w-full rounded-lg border border-line bg-surface object-cover" />
                  ) : (
                    <span aria-hidden className="flex aspect-square w-full items-center justify-center rounded-lg bg-surface-muted text-ink-faint">
                      <Lightbulb className="size-10" strokeWidth={1.25} />
                    </span>
                  )}
                  <span className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 font-medium">{name(product)}</span>
                  <span className="font-mono text-[11px] text-ink-soft">{product.sku}</span>
                  <span className="mt-1.5 text-base font-bold tabular-nums">{formatMoney(product.price, company.currency, locale)}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Cart */}
      <aside className="flex flex-col rounded-xl border border-line bg-surface lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6.5rem)]">
        <div className="border-b border-line px-4 py-3">
          {pickingCustomer ? (
            <div className="flex items-end gap-2">
              <div className="flex-1"><CustomerPicker label={t("Customer")} value={customer} onChange={(picked) => { setCustomer(picked); if (picked) setPickingCustomer(false); }} /></div>
              <Button variant="secondary" onClick={() => setPickingCustomer(false)}>{t("Cancel")}</Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-soft"><UserRound aria-hidden className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{customer ? name(customer) : name({ name: register.walk_in_customer_name, name_ar: register.walk_in_customer_name_ar })}</span>
                <span className="block text-xs text-ink-soft">{customer ? customer.code : t("Walk-in customer")}</span>
              </span>
              {customer ? (
                <IconButton label={t("Clear")} onClick={() => setCustomer(null)}><X aria-hidden className="size-4" /></IconButton>
              ) : (
                <Button variant="ghost" onClick={() => setPickingCustomer(true)}>{t("Change customer")}</Button>
              )}
            </div>
          )}
        </div>

        <div className="min-h-[12rem] flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 px-4 py-10 text-center">
              <span className="text-base font-bold">{t("Cart is empty")}</span>
              <span className="text-sm text-ink-soft">{t("Tap a product to add it.")}</span>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {cart.map((line) => {
                const amounts = lineTotals(line.product.price, line.quantity, line.discount, taxRate, decimals);
                return (
                  <li key={line.product.id} className="flex flex-col gap-2 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{name(line.product)}</span>
                        <span className="block text-xs text-ink-soft tabular-nums">{formatMoney(line.product.price, company.currency, locale)} / {line.product.uom}</span>
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{money(amounts.total)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-lg border border-line-strong">
                        <button type="button" aria-label={t("Less")} onClick={() => step(line, -1)} className="flex size-9 items-center justify-center rounded-s-lg hover:bg-surface-muted"><Minus aria-hidden className="size-4" /></button>
                        <input
                          aria-label={t("Quantity")}
                          inputMode={line.product.allow_decimal ? "decimal" : "numeric"}
                          value={line.quantity}
                          onChange={(e) => update(line.product, { quantity: e.target.value })}
                          className="h-9 w-14 border-x border-line-strong bg-surface text-center text-sm tabular-nums"
                        />
                        <button type="button" aria-label={t("More")} onClick={() => step(line, 1)} className="flex size-9 items-center justify-center rounded-e-lg hover:bg-surface-muted"><Plus aria-hidden className="size-4" /></button>
                      </span>
                      <label className="ms-auto flex items-center gap-1 text-xs text-ink-soft">
                        {t("Disc.")}
                        <input inputMode="decimal" value={line.discount} onChange={(e) => update(line.product, { discount: e.target.value })} placeholder="0" className="h-9 w-14 rounded-lg border border-line-strong bg-surface px-2 text-end text-sm tabular-nums" />
                        %
                      </label>
                      <IconButton label={t("Remove")} onClick={() => remove(line.product)}><Trash2 aria-hidden className="size-4" /></IconButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-line px-4 py-3">
          <dl className="flex flex-col gap-1 text-sm tabular-nums">
            <div className="flex justify-between text-ink-soft"><dt>{t("Subtotal")} · {itemCount} {t("items")}</dt><dd>{money(totals.net)}</dd></div>
            {totals.tax > 0n ? <div className="flex justify-between text-ink-soft"><dt>{t("VAT")} {trimQty(taxRate)}%</dt><dd>{money(totals.tax)}</dd></div> : null}
            <div className="flex justify-between text-lg font-bold"><dt>{t("Total")}</dt><dd>{money(totals.total)}</dd></div>
          </dl>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" className="h-14 px-4" disabled={cart.length === 0} onClick={() => setCart([])} aria-label={t("Clear cart")}><Trash2 aria-hidden className="size-5" /></Button>
            <Button className="h-14 flex-1 text-base" disabled={cart.length === 0 || totals.total <= 0n} onClick={() => setPaying(true)}>
              {t("Charge")} {money(totals.total)}
            </Button>
          </div>
        </div>
      </aside>

      {paying ? (
        <PayModal
          total={totals.total}
          decimals={decimals}
          onCancel={() => setPaying(false)}
          onPay={async (payments) => {
            const sale = await api.post<PosSale>("/pos/sales/checkout", {
              shift: shiftId,
              customer: customer?.id ?? null,
              lines: cart.map((line) => ({ product: line.product.id, quantity: line.quantity || "1", discount_percent: line.discount || "0" })),
              payments: payments.map((payment) => ({ method: payment.method, amount: payment.amount, reference: payment.reference })),
            });
            finished(sale);
          }}
        />
      ) : null}
      {done ? (
        <Modal open onClose={() => setDone(null)} title={t("Sale complete")}>
          <div className="flex flex-col gap-4">
            <div className="print-area"><ReceiptSlip sale={done} /></div>
            {Number(done.change_given) > 0 ? (
              <div className="flex items-center justify-between rounded-xl border border-line bg-surface-muted/50 px-4 py-3">
                <span className="text-sm font-medium">{t("Change")}</span>
                <span className="text-2xl font-bold tabular-nums">{formatMoney(done.change_given, company.currency, locale)}</span>
              </div>
            ) : null}
            <div className="flex gap-2">
              <PrintButton className="h-12 flex-1" />
              <Button autoFocus className="h-12 flex-1" onClick={() => { setDone(null); searchBox.current?.focus(); }}>{t("New sale")}</Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors ${active ? "border-accent bg-accent text-white" : "border-line-strong bg-surface text-ink hover:bg-surface-muted"}`}
    >
      {children}
    </button>
  );
}

// --- Payment -----------------------------------------------------------------------------------

function PayModal({ total, decimals, onCancel, onPay }: { total: bigint; decimals: number; onCancel: () => void; onPay: (payments: Payment[]) => Promise<void> }) {
  const { company, locale, t } = useWorkspace();
  const money = (minor: bigint) => formatMoney(fromMinor(minor, decimals), company.currency, locale);
  const [payments, setPayments] = useState<Payment[]>([{ method: "cash", amount: fromMinor(total, decimals), reference: "" }]);
  const action = useAction();

  const amountOf = (payment: Payment) => (payment.amount.trim() ? toMinor(payment.amount, decimals) : 0n);
  const paid = payments.reduce((sum, payment) => sum + amountOf(payment), 0n);
  const nonCash = payments.filter((payment) => payment.method !== "cash").reduce((sum, payment) => sum + amountOf(payment), 0n);
  const remaining = total - paid;
  const change = paid > total ? paid - total : 0n;
  const cardOver = nonCash > total;
  const ready = remaining <= 0n && !cardOver && payments.every((payment) => amountOf(payment) > 0n);

  const set = (index: number, patch: Partial<Payment>) => setPayments((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const addRow = () => setPayments((rows) => [...rows, { method: rows.some((row) => row.method === "knet") ? "cash" : "knet", amount: remaining > 0n ? fromMinor(remaining, decimals) : "", reference: "" }]);
  const quick = [1, 5, 10, 20].map((stepSize) => roundUpTo(total, stepSize, decimals)).filter((value, index, all) => all.indexOf(value) === index && value > total);

  return (
    <Modal open onClose={onCancel} title={t("Charge")}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          action.run(() => onPay(payments));
        }}
        className="flex flex-col gap-4"
      >
        <ErrorBanner error={action.error} />
        <div className="flex items-baseline justify-between rounded-xl bg-panel px-4 py-3 text-panel-ink">
          <span className="text-sm text-panel-ink-soft">{t("Total")}</span>
          <span className="text-3xl font-bold tracking-tight tabular-nums">{money(total)}</span>
        </div>
        <div className="flex flex-col gap-3">
          {payments.map((payment, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-xl border border-line p-3">
              <div className="flex gap-2">
                <div className="inline-flex flex-1 rounded-lg border border-line-strong p-0.5">
                  {POS_METHODS.map(([method, label]) => {
                    const Icon = METHOD_ICONS[method];
                    return (
                      <button key={method} type="button" onClick={() => set(index, { method })} className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors ${payment.method === method ? "bg-accent text-white" : "text-ink hover:bg-surface-muted"}`}>
                        <Icon aria-hidden className="size-4" />
                        {t(label)}
                      </button>
                    );
                  })}
                </div>
                {payments.length > 1 ? <IconButton label={t("Remove")} className="size-11" onClick={() => setPayments((rows) => rows.filter((_, i) => i !== index))}><X aria-hidden className="size-4" /></IconButton> : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <TextField label={payment.method === "cash" ? t("Amount tendered") : t("Amount")} inputMode="decimal" autoFocus={index === payments.length - 1} value={payment.amount} onChange={(e) => set(index, { amount: e.target.value })} onFocus={(e) => e.target.select()} />
                {payment.method !== "cash" ? <TextField label={t("Reference")} value={payment.reference} onChange={(e) => set(index, { reference: e.target.value })} placeholder={payment.method === "knet" ? "KNET ref." : "Auth. code"} /> : null}
              </div>
              {payment.method === "cash" ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" className="h-9" onClick={() => set(index, { amount: fromMinor(total - (paid - amountOf(payment)) > 0n ? total - (paid - amountOf(payment)) : 0n, decimals) })}>{t("Exact")}</Button>
                  {quick.map((value) => (
                    <Button key={String(value)} variant="secondary" className="h-9 tabular-nums" onClick={() => set(index, { amount: fromMinor(value, decimals) })}>{money(value)}</Button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {payments.length < 3 ? <Button variant="ghost" className="self-start" onClick={addRow}><Plus aria-hidden className="size-4" />{t("Add payment")}</Button> : null}
        </div>
        <dl className="flex flex-col gap-1 rounded-xl border border-line px-4 py-3 text-sm tabular-nums">
          <div className="flex justify-between"><dt className="text-ink-soft">{t("Paid")}</dt><dd className="font-medium">{money(paid)}</dd></div>
          {cardOver ? (
            <div className="flex justify-between text-danger"><dt>{t("KNET / card can't be more than the total.")}</dt><dd>{money(nonCash)}</dd></div>
          ) : remaining > 0n ? (
            <div className="flex justify-between text-danger"><dt>{t("Remaining")}</dt><dd className="font-semibold">{money(remaining)}</dd></div>
          ) : (
            <div className="flex justify-between text-lg font-bold"><dt>{t("Change")}</dt><dd>{money(change)}</dd></div>
          )}
        </dl>
        <div className="flex gap-2">
          <Button variant="secondary" className="h-12" onClick={onCancel}>{t("Cancel")}</Button>
          <Button type="submit" className="h-12 flex-1 text-base" pending={action.pending} disabled={!ready}>{t("Complete sale")}</Button>
        </div>
      </form>
    </Modal>
  );
}
