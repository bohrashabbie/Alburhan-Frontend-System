"use client";

import { Printer } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { stampText, whenText } from "@/components/work-order";
import { Button, EmptyState, ErrorBanner, Loading, PageHeader } from "@/components/ui";
import { useResource } from "@/lib/hooks";
import { qty } from "@/lib/inventory";
import type { WorkOrder } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

/** The installation completion form: what was done, by whom, and the customer's signature.
 * Opened from a completed job; prints on one A4 page (or saves as PDF). */
function CompletionForm() {
  const { company, locale, name, t } = useWorkspace();
  const id = useSearchParams().get("id");
  const job = useResource<WorkOrder>(id ? `/installation/work-orders/${id}` : null);
  const doc = job.data;
  if (!id) return <EmptyState title={t("No job chosen")} description={t("Open a completed job and choose Completion form.")} />;
  const row = "grid grid-cols-[9rem_1fr] gap-3 border-b border-gray-200 py-2 text-sm";
  return (
    <>
      <PageHeader title={t("Installation completion form")} description={doc ? `${doc.number} · ${doc.customer_name}` : ""} actions={doc ? <Button variant="secondary" className="print:hidden" onClick={() => window.print()}><Printer aria-hidden className="size-4" />{t("Print / PDF")}</Button> : undefined} />
      <ErrorBanner error={job.error} />
      {!doc ? (job.error ? null : <Loading label={t("Loading…")} />) : (
        <div className="print-sheet mx-auto w-full max-w-3xl rounded-xl border border-line bg-white p-8 text-gray-900 print:max-w-none print:rounded-none print:border-0">
          <header className="flex items-start justify-between gap-4 border-b-2 border-gray-900 pb-4">
            <div>
              <p className="text-lg font-bold">{name(company)}</p>
              <p className="text-sm text-gray-600">{t("Installation completion form")}</p>
            </div>
            <div className="text-end text-sm">
              <p className="font-mono font-semibold">{doc.number}</p>
              <p className="text-gray-600">{whenText(doc, locale)}</p>
            </div>
          </header>
          <section className="mt-4">
            <div className={row}><span className="text-gray-600">{t("Customer")}</span><span className="font-medium">{doc.customer_name}</span></div>
            <div className={row}><span className="text-gray-600">{t("Site address")}</span><span className="whitespace-pre-line">{doc.site_address || "—"}</span></div>
            <div className={row}><span className="text-gray-600">{t("Contact on site")}</span><span>{[doc.contact_name, doc.contact_phone].filter(Boolean).join(" · ") || "—"}</span></div>
            <div className={row}><span className="text-gray-600">{t("Job")}</span><span className="font-medium">{doc.title}</span></div>
            {doc.description ? <div className={row}><span className="text-gray-600">{t("Work to do")}</span><span className="whitespace-pre-line">{doc.description}</span></div> : null}
            <div className={row}><span className="text-gray-600">{t("Technicians")}</span><span>{doc.technician_names.join(", ") || "—"}</span></div>
            <div className={row}><span className="text-gray-600">{t("Completed")}</span><span>{stampText(doc.completed_at, locale) || "—"}{Number(doc.labour_hours) ? ` · ${qty(doc.labour_hours)} h` : ""}</span></div>
            {doc.completion_notes ? <div className={row}><span className="text-gray-600">{t("What was done")}</span><span className="whitespace-pre-line">{doc.completion_notes}</span></div> : null}
          </section>
          <section className="mt-8 rounded-lg border border-gray-300 p-4">
            <p className="text-sm">{t("I confirm that the installation described above has been completed.")}</p>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
              <div>
                <div className="flex h-24 items-end border-b border-gray-400">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a signed, short-lived link */}
                  {doc.signature_url ? <img src={doc.signature_url} alt={t("Customer signature")} className="max-h-24 max-w-full object-contain" /> : null}
                </div>
                <p className="mt-1 text-xs text-gray-600">{t("Customer signature")}</p>
              </div>
              <div className="text-sm">
                <p><span className="text-gray-600">{t("Name")}: </span><span className="font-medium">{doc.signed_by || "________________"}</span></p>
                <p className="mt-2"><span className="text-gray-600">{t("Date")}: </span>{stampText(doc.signed_at, locale) || "________________"}</p>
              </div>
            </div>
          </section>
          {!doc.signature_url ? <p className="mt-4 text-sm text-amber-700 print:hidden">{t("The customer has not signed the completion form yet.")}</p> : null}
        </div>
      )}
    </>
  );
}

export default function CompletionFormPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CompletionForm />
    </Suspense>
  );
}
