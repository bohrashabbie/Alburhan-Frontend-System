"use client";

import { Printer } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { Button, ErrorBanner, Loading } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import { decimalsOf, formatAmount } from "@/lib/money";
import type { Company, Customer, DeliveryLine, DeliveryNote, Invoice, Quotation, SalesLine } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

type Kind = "quotation" | "invoice" | "delivery";
const ENDPOINT: Record<Kind, string> = { quotation: "/sales/quotations", invoice: "/sales/invoices", delivery: "/sales/deliveries" };
const TITLE: Record<Kind, [string, string]> = {
  quotation: ["Quotation", "عرض سعر"],
  invoice: ["Invoice", "فاتورة"],
  delivery: ["Delivery note", "إذن تسليم"],
};

type Line = SalesLine & { product_image?: string | null };
const trim = (value: string | undefined) => {
  const n = Number(value ?? 0);
  return Number.isInteger(n) ? String(n) : String(n);
};

/**
 * A4 print of a sales document, opened in its own tab from the document. The browser's print
 * dialog opens straight away; "Save as PDF" there gives the PDF.
 */
export default function PrintDocument() {
  const { kind, id } = useParams<{ kind: Kind; id: string }>();
  const { company, locale } = useWorkspace();
  const doc = useResource<Quotation & Invoice & DeliveryNote>(ENDPOINT[kind] ? `${ENDPOINT[kind]}/${id}` : null);
  const firm = useResource<Company & { logo_url?: string | null; address?: string; phone?: string; tax_registration_number?: string }>(`/organization/companies/${company.id}`);
  const invoice = useResource<Invoice>(kind === "delivery" && doc.data ? `/sales/invoices/${doc.data.invoice}` : null);
  const customerId = kind === "delivery" ? invoice.data?.customer : doc.data?.customer;
  const customer = useResource<Customer>(customerId ? `/partners/customers/${customerId}` : null);
  const printed = useRef(false);
  const ready = doc.data && firm.data && (kind !== "delivery" || invoice.data);

  useEffect(() => {
    if (!ready || printed.current) return;
    printed.current = true;
    // Give photos a moment to load before the print dialog takes the page.
    const timer = window.setTimeout(() => window.print(), 900);
    return () => window.clearTimeout(timer);
  }, [ready]);

  if (!ENDPOINT[kind]) return <ErrorBanner error={{ message: "Unknown document." } as never} />;
  if (doc.error) return <div className="mx-auto max-w-3xl"><ErrorBanner error={doc.error} /></div>;
  if (!ready || !doc.data || !firm.data) return <Loading />;

  const d = doc.data;
  const decimals = decimalsOf(d.currency ?? company.currency);
  const money = (value: string | undefined) => formatAmount(value ?? "0", decimals);
  const [title, titleAr] = kind === "quotation" && d.is_proforma ? ["Pro-forma invoice", "فاتورة مبدئية"] : TITLE[kind];
  const lines: Line[] = kind === "delivery" ? [] : (d.lines as Line[]);
  const showPhotos = kind === "quotation" && lines.some((line) => line.product_image && line.product_type !== "service");
  const anyDiscount = lines.some((line) => Number(line.discount_percent) > 0);
  const anyTax = Number(d.tax_total ?? 0) > 0;
  const c = customer.data;

  return (
    <>
      <style>{`@page { size: A4; margin: 14mm; } @media print { body * { visibility: visible !important; } .no-print { display: none !important; } }`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-end gap-2 px-4">
        <Button onClick={() => window.print()}><Printer aria-hidden className="size-4" />Print / Save as PDF</Button>
      </div>
      <article className="mx-auto max-w-[210mm] bg-white px-[14mm] py-[12mm] text-[12.5px] leading-relaxed text-black shadow-sm print:max-w-none print:p-0 print:shadow-none" dir="ltr">
        {/* Letterhead */}
        <header className="flex items-start justify-between gap-6 border-b-2 border-black pb-4">
          <div className="flex items-start gap-4">
            {firm.data.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed S3 link
              <img src={firm.data.logo_url} alt="" className="h-16 w-16 object-contain" />
            ) : null}
            <div>
              <p className="text-lg font-bold">{firm.data.legal_name || firm.data.name}</p>
              {firm.data.name_ar ? <p dir="rtl" className="text-right">{firm.data.name_ar}</p> : null}
              <p className="text-[11px] whitespace-pre-line text-neutral-600">{[firm.data.address, firm.data.phone].filter(Boolean).join("\n")}</p>
              {firm.data.tax_registration_number ? <p className="text-[11px] text-neutral-600">Tax no. {firm.data.tax_registration_number}</p> : null}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tracking-tight uppercase">{title}</p>
            <p dir="rtl" className="text-base">{titleAr}</p>
            <p className="mt-1 font-mono text-sm">{d.number}</p>
          </div>
        </header>

        {/* Parties and dates */}
        <section className="mt-5 grid grid-cols-2 gap-6">
          <div>
            <p className="text-[10.5px] font-semibold tracking-wider text-neutral-500 uppercase">{kind === "delivery" ? "Deliver to" : "Bill to"}</p>
            <p className="mt-1 text-sm font-semibold">{kind === "delivery" ? d.customer_name : d.customer_name}</p>
            {c ? (
              <p className="text-[11.5px] whitespace-pre-line text-neutral-700">
                {[c.code, [c.address, c.area].filter(Boolean).join(", "), c.mobile || c.phone, c.tax_number ? `Tax no. ${c.tax_number}` : ""].filter(Boolean).join("\n")}
              </p>
            ) : null}
            {kind === "delivery" && (d.delivered_to || d.address) ? (
              <p className="mt-1 text-[11.5px] whitespace-pre-line text-neutral-700">{[d.delivered_to, d.address].filter(Boolean).join("\n")}</p>
            ) : null}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 self-start text-[12px]">
            <dt className="text-neutral-500">Date</dt><dd className="text-right">{formatDate(d.date, locale)}</dd>
            {kind === "quotation" && d.valid_until ? (<><dt className="text-neutral-500">Valid until</dt><dd className="text-right">{formatDate(d.valid_until, locale)}</dd></>) : null}
            {kind === "invoice" && d.due_date ? (<><dt className="text-neutral-500">Due date</dt><dd className="text-right">{formatDate(d.due_date, locale)}</dd></>) : null}
            {kind === "invoice" && d.quotation_number ? (<><dt className="text-neutral-500">Quotation</dt><dd className="text-right font-mono">{d.quotation_number}</dd></>) : null}
            {kind === "delivery" ? (<><dt className="text-neutral-500">Invoice</dt><dd className="text-right font-mono">{d.invoice_number}</dd><dt className="text-neutral-500">From</dt><dd className="text-right">{d.warehouse_name}</dd></>) : (<><dt className="text-neutral-500">Branch</dt><dd className="text-right">{d.branch_name}</dd></>)}
            {kind !== "delivery" && d.salesperson_name ? (<><dt className="text-neutral-500">Salesperson</dt><dd className="text-right">{d.salesperson_name}</dd></>) : null}
            {d.reference ? (<><dt className="text-neutral-500">Reference</dt><dd className="text-right">{d.reference}</dd></>) : null}
            {kind === "delivery" && d.driver ? (<><dt className="text-neutral-500">Driver</dt><dd className="text-right">{d.driver}</dd></>) : null}
          </dl>
        </section>

        {/* Lines */}
        {kind === "delivery" ? (
          <table className="mt-6 w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-y border-black text-left text-[10.5px] tracking-wider uppercase">
                <th className="py-2 pr-2 font-semibold">#</th>
                <th className="py-2 pr-2 font-semibold">Code</th>
                <th className="py-2 pr-2 font-semibold">Item</th>
                <th className="py-2 pr-2 text-right font-semibold">Ordered</th>
                <th className="py-2 text-right font-semibold">Delivered now</th>
              </tr>
            </thead>
            <tbody>
              {(d.lines as unknown as DeliveryLine[]).map((line, index) => (
                <tr key={line.id ?? index} className="border-b border-neutral-300 align-top">
                  <td className="py-2 pr-2 text-neutral-500">{index + 1}</td>
                  <td className="py-2 pr-2 font-mono text-[11px]">{line.sku}</td>
                  <td className="py-2 pr-2">{line.product_name}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{trim(line.ordered_quantity)} {line.uom}</td>
                  <td className="py-2 text-right font-semibold tabular-nums">{trim(line.quantity)} {line.uom}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="mt-6 w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-y border-black text-left text-[10.5px] tracking-wider uppercase">
                <th className="py-2 pr-2 font-semibold">#</th>
                {showPhotos ? <th className="py-2 pr-2 font-semibold">Photo</th> : null}
                <th className="py-2 pr-2 font-semibold">Item</th>
                <th className="py-2 pr-2 text-right font-semibold">Qty</th>
                <th className="py-2 pr-2 text-right font-semibold">Unit price</th>
                {anyDiscount ? <th className="py-2 pr-2 text-right font-semibold">Disc.</th> : null}
                {anyTax ? <th className="py-2 pr-2 text-right font-semibold">VAT</th> : null}
                <th className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.id ?? index} className="break-inside-avoid border-b border-neutral-300 align-top">
                  <td className="py-2 pr-2 text-neutral-500">{index + 1}</td>
                  {showPhotos ? (
                    <td className="py-2 pr-2">
                      {line.product_image && line.product_type !== "service" ? (
                        // eslint-disable-next-line @next/next/no-img-element -- signed S3 link
                        <img src={line.product_image} alt="" className="h-14 w-14 rounded border border-neutral-200 object-cover" />
                      ) : <span className="inline-block h-14 w-14" />}
                    </td>
                  ) : null}
                  <td className="py-2 pr-2">
                    <span className="font-mono text-[10.5px] text-neutral-500">{line.sku}</span>
                    <span className="block font-medium">{line.product_name}</span>
                    {line.description ? <span className="block text-[11px] text-neutral-600">{line.description}</span> : null}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">{trim(line.quantity)} {line.uom}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{money(line.unit_price)}</td>
                  {anyDiscount ? <td className="py-2 pr-2 text-right tabular-nums">{Number(line.discount_percent) ? `${trim(line.discount_percent)}%` : "—"}</td> : null}
                  {anyTax ? <td className="py-2 pr-2 text-right tabular-nums">{trim(line.tax_rate)}%</td> : null}
                  <td className="py-2 text-right font-medium tabular-nums">{money(line.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Totals */}
        {kind !== "delivery" ? (
          <section className="mt-4 flex justify-end">
            <dl className="grid w-72 grid-cols-[1fr_auto] gap-y-1 text-[12.5px] tabular-nums">
              <dt className="text-neutral-600">Subtotal</dt><dd className="text-right">{money(d.subtotal)}</dd>
              {anyTax ? (<><dt className="text-neutral-600">VAT</dt><dd className="text-right">{money(d.tax_total)}</dd></>) : null}
              <dt className="border-t border-black pt-1.5 text-sm font-bold">Total {d.currency}</dt>
              <dd className="border-t border-black pt-1.5 text-right text-sm font-bold">{money(d.total)}</dd>
              {kind === "invoice" && Number(d.amount_paid) > 0 ? (<><dt className="text-neutral-600">Paid</dt><dd className="text-right">{money(d.amount_paid)}</dd><dt className="font-semibold">Balance due</dt><dd className="text-right font-semibold">{money(d.amount_due)}</dd></>) : null}
            </dl>
          </section>
        ) : null}

        {d.notes ? <p className="mt-6 text-[11.5px] whitespace-pre-line text-neutral-700">{d.notes}</p> : null}

        {/* Signatures */}
        <footer className="mt-14 grid grid-cols-2 gap-10 text-[11px] text-neutral-600">
          <div className="border-t border-neutral-400 pt-1.5">{kind === "delivery" ? "Received by (name, signature, date)" : "Customer signature"}</div>
          <div className="border-t border-neutral-400 pt-1.5 text-right">For {firm.data.name}</div>
        </footer>
        <p className="mt-8 text-center text-[10px] text-neutral-400">{d.number} · printed {new Date().toLocaleString("en-GB")}</p>
      </article>
    </>
  );
}
