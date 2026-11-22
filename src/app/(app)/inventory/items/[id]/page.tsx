"use client";

import { ArrowLeft, History, Lightbulb } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Badge, ButtonLink, Card, EmptyState, ErrorBanner, Loading, PageHeader } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import { qty } from "@/lib/inventory";
import { useWorkspace } from "@/lib/workspace";

type Row = { warehouse: number; name: string; code: string; branch: string | null; type: string; on_hand: string; reserved: string; free: string; on_order: string; in_transit: string };
type Incoming = { kind: "purchase" | "transfer"; document: string; document_id: number; from: string; to: string; ordered: string; received: string; remaining: string; expected_date: string | null; status: string };
type Move = { id: number; date: string; warehouse: string; move_type: string; status: string; quantity: string; reference: string };
type Item = {
  id: number; sku: string; name: string; name_ar: string; uom: string; category: string | null; image: string | null; barcode: string;
  price: string | null; price_list: string | null; currency: string;
  warehouses: Row[]; totals: Record<"on_hand" | "reserved" | "free" | "on_order" | "in_transit", string>; incoming: Incoming[]; moves: Move[];
};

/** One item across every location: what's there, what's held, what's coming, and what moved. */
export default function ItemPage() {
  const { id } = useParams<{ id: string }>();
  const { company, locale, name, t } = useWorkspace();
  const item = useResource<Item>(`/inventory/items/${id}?company=${company.id}`);
  if (item.error) return <ErrorBanner error={item.error} />;
  if (!item.data) return <Loading />;
  const d = item.data;
  const n = (value: string) => (Number(value) ? qty(value) : <span className="text-ink-faint">0</span>);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/inventory/stock" className="inline-flex w-fit items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft aria-hidden className="size-4 rtl:-scale-x-100" />{t("Stock levels")}
      </Link>
      <div className="flex flex-wrap items-start gap-6">
        {d.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed S3 link
          <img src={d.image} alt="" className="size-36 rounded-2xl border border-line bg-surface object-cover" />
        ) : (
          <span className="flex size-36 items-center justify-center rounded-2xl border border-line bg-surface-muted text-ink-faint"><Lightbulb className="size-12" strokeWidth={1.25} /></span>
        )}
        <div className="min-w-0 flex-1">
          <PageHeader title={name(d)} description={[d.sku, d.category].filter(Boolean).join(" · ")} actions={<ButtonLink href={`/inventory/moves?product=${d.id}`} variant="secondary"><History aria-hidden className="size-4" />{t("Full history")}</ButtonLink>} />
          <dl className="-mt-2 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [t("Code"), <span key="c" className="font-mono">{d.sku}</span>],
              [t("Unit"), d.uom],
              [t("Price"), d.price ? formatMoney(d.price, d.currency, locale) : "—"],
              [t("Barcode"), d.barcode || "—"],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-line bg-surface px-3 py-2">
                <dt className="text-xs text-ink-soft">{label}</dt>
                <dd className="mt-0.5 truncate font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          {d.price_list ? <p className="mt-2 text-xs text-ink-faint">{t("Price from")} {d.price_list}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          [t("On hand"), d.totals.on_hand, ""],
          [t("Reserved"), d.totals.reserved, "Held for projects and orders"],
          [t("Free to sell"), d.totals.free, ""],
          [t("On order"), d.totals.on_order, "Open purchase orders"],
          [t("In transit"), d.totals.in_transit, "Transfers on the way"],
        ].map(([label, value, hint], index) => (
          <div key={label} className={`rounded-xl border border-line p-4 ${index === 2 ? "bg-surface-muted/50" : "bg-surface"}`}>
            <p className="text-xs text-ink-soft">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{qty(value)} <span className="text-sm font-medium text-ink-soft">{d.uom}</span></p>
            {hint ? <p className="mt-0.5 text-xs text-ink-faint">{t(hint)}</p> : null}
          </div>
        ))}
      </div>

      <Card title={t("By location")}>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="text-xs tracking-wide text-ink-soft uppercase">
              <tr className="border-b border-line">
                <th className="px-2 py-2 text-start font-medium">{t("Location")}</th>
                <th className="px-2 py-2 text-end font-medium">{t("On hand")}</th>
                <th className="px-2 py-2 text-end font-medium">{t("Reserved")}</th>
                <th className="px-2 py-2 text-end font-medium">{t("Free")}</th>
                <th className="px-2 py-2 text-end font-medium">{t("On order")}</th>
                <th className="px-2 py-2 text-end font-medium">{t("In transit")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {d.warehouses.map((row) => (
                <tr key={row.warehouse}>
                  <td className="px-2 py-2.5"><span className="block font-medium">{row.name}</span><span className="block text-xs text-ink-soft">{row.branch ?? t("Company")}</span></td>
                  <td className="px-2 py-2.5 text-end">{n(row.on_hand)}</td>
                  <td className="px-2 py-2.5 text-end">{Number(row.reserved) ? <span className="text-warning">{qty(row.reserved)}</span> : n(row.reserved)}</td>
                  <td className="px-2 py-2.5 text-end font-semibold">{n(row.free)}</td>
                  <td className="px-2 py-2.5 text-end">{n(row.on_order)}</td>
                  <td className="px-2 py-2.5 text-end">{n(row.in_transit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={t("Coming in")}>
        {d.incoming.length === 0 ? (
          <p className="text-sm text-ink-soft">{t("Nothing on order or on the way.")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {d.incoming.map((row) => (
              <li key={`${row.kind}-${row.document_id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <Link href={row.kind === "purchase" ? `/purchasing/orders?open=${row.document_id}` : `/inventory/transfers?open=${row.document_id}`} className="font-mono text-xs text-link hover:underline">{row.document}</Link>
                  <span className="ms-2"><Badge>{t(row.kind === "purchase" ? "Purchase order" : "Transfer")}</Badge></span>
                  <p className="mt-0.5 text-ink-soft">{row.from} → {row.to}</p>
                </div>
                <div className="text-end tabular-nums">
                  <p className="font-semibold">{qty(row.remaining)} {d.uom} {t("to come")}</p>
                  <p className="text-xs text-ink-soft">{qty(row.received)} / {qty(row.ordered)} {t("received")}{row.expected_date ? ` · ${t("expected")} ${formatDate(row.expected_date, locale)}` : ""}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={t("Latest movements")}>
        {d.moves.length === 0 ? (
          <EmptyState title={t("No movements yet.")} description={t("Receipts, sales, transfers and counts will show here.")} />
        ) : (
          <ul className="divide-y divide-line text-sm">
            {d.moves.map((move) => (
              <li key={move.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="font-medium">{move.move_type}</span>
                  <span className="text-ink-soft"> · {move.warehouse}{move.status !== "available" ? ` (${move.status.replace("_", " ")})` : ""}</span>
                  <span className="block font-mono text-xs text-ink-faint">{move.reference} · {formatDate(move.date, locale)}</span>
                </span>
                <span className={`font-semibold tabular-nums ${Number(move.quantity) < 0 ? "text-danger" : ""}`}>{Number(move.quantity) > 0 ? "+" : ""}{qty(move.quantity)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3"><Link href={`/inventory/moves?product=${d.id}`} className="text-sm font-medium text-link hover:underline">{t("Open the full history")}</Link></div>
      </Card>
    </div>
  );
}
