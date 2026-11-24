"use client";

import { CalendarClock, Check, CheckCircle2, MapPin, PenLine, Play, Printer, Receipt, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CustomerPicker } from "@/components/customer-picker";
import { Facts } from "@/components/document-list";
import { PhoneField } from "@/components/phone-field";
import { ProductPicker } from "@/components/product-picker";
import { SignaturePad } from "@/components/signature-pad";
import { Button, Drawer, ErrorBanner, Modal, SelectField, TextAreaField, TextField } from "@/components/ui";
import { api, idOrNull, withQuery } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import { qty } from "@/lib/inventory";
import { JobStatusBadge, ProjectPicker, useTechnicians } from "@/lib/projects";
import { today } from "@/lib/sales";
import type { CalendarDay, Customer, Invoice, Product, Project, WorkOrder } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const LIVE = ["requested", "scheduled", "in_progress"];

export function whenText(doc: Pick<WorkOrder, "scheduled_date" | "scheduled_time">, locale: "en" | "ar") {
  if (!doc.scheduled_date) return "";
  return `${formatDate(doc.scheduled_date, locale)}${doc.scheduled_time ? ` · ${doc.scheduled_time.slice(0, 5)}` : ""}`;
}

export function stampText(value: string | null, locale: "en" | "ar") {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-KW-u-nu-latn" : "en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

/** Step 1: staff submit the request with the customer and site details. No date or technicians:
 * those are the installation supervisor's (the Schedule button). */
export function WorkOrderEditor({ doc, presetProject, onDone }: { doc?: WorkOrder; presetProject?: Project | null; onDone: () => void }) {
  const { company, branch, branches, can, name, t } = useWorkspace();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(doc?.customer ?? presetProject?.customer ?? null);
  const customerName = doc?.customer_name ?? presetProject?.customer_name ?? "";
  const [project, setProject] = useState<Project | null>(presetProject ?? null);
  const [form, setForm] = useState({
    title: doc?.title ?? (presetProject ? `${presetProject.name} · installation` : ""),
    branch: doc ? String(doc.branch) : presetProject ? String(presetProject.branch) : branch ? String(branch.id) : branches[0] ? String(branches[0].id) : "",
    site_address: doc?.site_address ?? presetProject?.site_address ?? "",
    contact_name: doc?.contact_name ?? "",
    contact_phone: doc?.contact_phone ?? "",
    location_link: doc?.location_link ?? "",
    requested_date: doc?.requested_date ?? "",
    description: doc?.description ?? "",
  });
  const save = useAction();
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });
  const pickCustomer = (picked: Customer | null) => {
    setCustomer(picked);
    setCustomerId(picked?.id ?? null);
    setProject(null);
    if (picked) setForm((now) => ({ ...now, contact_name: now.contact_name || picked.name, contact_phone: now.contact_phone || picked.mobile || "" }));
  };
  const payload = () => ({
    company: company.id, title: form.title, customer: customerId, project: project?.id ?? doc?.project ?? null, branch: idOrNull(form.branch),
    site_address: form.site_address, contact_name: form.contact_name, contact_phone: form.contact_phone, location_link: form.location_link.trim(),
    requested_date: form.requested_date || null, description: form.description,
  });
  const submit = () => save.run(async () => { if (doc) await api.patch(`/installation/work-orders/${doc.id}`, payload()); else await api.post("/installation/work-orders", payload()); onDone(); });
  const formId = "wo-form";
  return (
    <Drawer open large wide onClose={onDone} title={doc ? `${doc.number}` : t("New installation request")} action={doc ? <JobStatusBadge status={doc.status} /> : undefined}
      footer={<div className="flex items-center gap-2"><span className="flex-1" /><Button variant="secondary" onClick={onDone}>{t("Cancel")}</Button>{can(doc ? "installation.work_order.update" : "installation.work_order.create") ? <Button type="submit" form={formId} pending={save.pending}>{doc ? t("Save") : t("Submit request")}</Button> : null}</div>}
    >
      <form id={formId} onSubmit={onSubmit(submit)} className="profile-section flex flex-col gap-5 pb-6">
        {!doc ? <p className="rounded-xl bg-surface-muted/60 px-4 py-3 text-sm text-ink-soft">{t("The installation supervisor sets the date, time and technicians after the request is sent.")}</p> : null}
        <ErrorBanner error={save.error} />
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {customerId && !customer ? <div className="flex items-end gap-2"><div className="flex-1"><TextField label={t("Customer")} value={customerName} disabled /></div>{!doc ? <Button variant="secondary" onClick={() => { setCustomerId(null); setProject(null); }}>{t("Change customer")}</Button> : null}</div> : <CustomerPicker label={t("Customer")} value={customer} error={save.field("customer")} onChange={pickCustomer} />}
          </div>
          <div className="sm:col-span-2"><TextField label={t("What to install")} required value={form.title} onChange={set("title")} error={save.field("title")} placeholder="e.g. Install 24 downlights, villa in Salwa" /></div>
          <TextField label={t("Contact on site")} value={form.contact_name} onChange={set("contact_name")} />
          <PhoneField label={t("Contact phone")} value={form.contact_phone} onChange={(phone) => set("contact_phone")({ target: { value: phone } })} />
          <div className="sm:col-span-2"><TextAreaField label={t("Site address")} rows={2} required value={form.site_address} onChange={set("site_address")} error={save.field("site_address")} placeholder="Area, block, street, house / building, floor" /></div>
          <TextField label={`${t("Map link")} (${t("optional")})`} type="url" inputMode="url" value={form.location_link} onChange={set("location_link")} error={save.field("location_link")} placeholder="https://maps.google.com/…" />
          <TextField label={`${t("Preferred date")} (${t("optional")})`} type="date" value={form.requested_date} onChange={set("requested_date")} error={save.field("requested_date")} />
          <div className="sm:col-span-2"><TextAreaField label={t("Work to do")} rows={3} value={form.description} onChange={set("description")} placeholder="Products, quantities, ceiling type, anything the technician should know" /></div>
          <SelectField label={t("Branch")} value={form.branch} onChange={set("branch")} error={save.field("branch")}>{branches.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}</SelectField>
          <div>{doc && !project ? <TextField label={t("Project")} value={doc.project_number ? `${doc.project_number} · ${doc.project_name}` : "—"} disabled /> : <ProjectPicker label={`${t("Project")} (${t("optional")})`} value={project} onChange={setProject} customerId={customerId} error={save.field("project")} />}</div>
        </div>
      </form>
    </Drawer>
  );
}

/** Where the job is in its steps, with who did each and when. */
function JobSteps({ doc }: { doc: WorkOrder }) {
  const { locale, t } = useWorkspace();
  if (doc.status === "cancelled") return null;
  const signed = Boolean(doc.signed_at);
  const reached = { requested: 1, scheduled: 2, in_progress: 3, completed: signed ? 5 : 4, cancelled: 0 }[doc.status];
  const steps: [string, string][] = [
    [t("Requested"), [doc.requested_by_name, formatDate(doc.created_at.slice(0, 10), locale)].filter(Boolean).join(" · ")],
    [t("Scheduled"), doc.scheduled_date ? `${whenText(doc, locale)} · ${doc.technician_names.join(", ")}` : t("Date and technicians to be set")],
    [t("On site"), doc.started_at ? stampText(doc.started_at, locale) : ""],
    [t("Completed"), doc.completed_at ? [doc.completed_by_name, stampText(doc.completed_at, locale)].filter(Boolean).join(" · ") : ""],
    [t("Signed by customer"), signed ? `${doc.signed_by} · ${stampText(doc.signed_at, locale)}` : ""],
  ];
  return (
    <ol className="grid gap-2 sm:grid-cols-5">
      {steps.map(([label, detail], index) => {
        const done = index < reached;
        const current = index === reached;
        return (
          <li key={label} className={`flex gap-2 rounded-xl border p-2.5 ${current ? "border-link bg-link/5" : "border-line"}`}>
            <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${done ? "bg-accent text-white" : current ? "bg-link text-white" : "bg-surface-muted text-ink-soft"}`}>{done ? <Check aria-hidden className="size-3" /> : index + 1}</span>
            <span className="min-w-0">
              <span className={`block text-sm font-medium ${done || current ? "" : "text-ink-soft"}`}>{label}</span>
              {detail ? <span className="block text-xs break-words text-ink-soft">{detail}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function WorkOrderViewer({ doc: initial, onDone, onEdit }: { doc: WorkOrder; onDone: () => void; onEdit?: () => void }) {
  const { company, can, locale, t } = useWorkspace();
  const router = useRouter();
  const live = useResource<WorkOrder>(`/installation/work-orders/${initial.id}`);
  const doc = live.data ?? initial;
  const [mode, setMode] = useState<"schedule" | "complete" | "sign" | "cancel" | "bill" | null>(null);
  const action = useAction();
  const money = (value: string) => formatMoney(value, company.currency, locale);
  const run = async (fn: () => Promise<unknown>, next: typeof mode = null) => action.run(async () => { await fn(); await live.mutate(); setMode(next); });
  const open = LIVE.includes(doc.status);
  const working = doc.status === "scheduled" || doc.status === "in_progress";
  const supervisor = can("installation.work_order.schedule");
  const technician = can("installation.work_order.complete");
  return (
    <Drawer open large wide onClose={onDone} title={doc.number} action={<JobStatusBadge status={doc.status} awaitingSignature={doc.awaiting_signature} />}>
      <div className="profile-section flex flex-col gap-6 pb-6">
        <h3 className="text-lg font-semibold">{doc.title}</h3>
        <JobSteps doc={doc} />
        <Facts items={[
          [t("Customer"), doc.customer_name],
          [t("When"), doc.scheduled_date ? `${whenText(doc, locale)} · ${qty(doc.duration_hours)} h` : <span className="text-ink-soft">{t("Not scheduled yet")}</span>],
          [t("Technicians"), doc.technician_names.join(", ") || "—"],
          [t("Branch"), doc.branch_name],
        ]} />
        <section className="flex flex-col gap-2 rounded-xl border border-line p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-medium whitespace-pre-line">{doc.site_address || "—"}</p>
            {doc.location_link ? <a href={doc.location_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-link hover:underline"><MapPin aria-hidden className="size-4" />{t("Open map")}</a> : null}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-ink-soft">
            {doc.contact_name || doc.contact_phone ? <span>{t("Contact on site")}: <span className="text-ink">{doc.contact_name}</span> {doc.contact_phone ? <a href={`tel:${doc.contact_phone}`} className="text-link tabular-nums hover:underline">{doc.contact_phone}</a> : null}</span> : null}
            {doc.requested_date && !doc.scheduled_date ? <span>{t("Preferred date")}: <span className="text-ink">{formatDate(doc.requested_date, locale)}</span></span> : null}
            {doc.project_number ? <span>{t("Project")}: <span className="font-mono text-ink">{doc.project_number}</span> {doc.project_name}</span> : null}
            {doc.source_invoice_number ? <span>{t("Invoice")}: <span className="font-mono text-ink">{doc.source_invoice_number}</span></span> : null}
          </div>
        </section>
        {doc.description ? <p className="text-[15px] whitespace-pre-line">{doc.description}</p> : null}
        {doc.status === "completed" ? (
          <section className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              {[[t("Labour hours"), `${qty(doc.labour_hours)} h`], [t("Labour cost"), money(doc.labour_cost)]].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-line p-3"><p className="text-xs text-ink-soft">{label}</p><p className="mt-0.5 font-semibold tabular-nums">{value}</p></div>
              ))}
            </div>
            {doc.completion_notes ? <p className="text-sm whitespace-pre-line text-ink-soft">{doc.completion_notes}</p> : null}
            {doc.signature_url ? (
              <div className="flex flex-wrap items-end gap-4 rounded-xl border border-line p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- a signed, short-lived link */}
                <img src={doc.signature_url} alt={t("Customer signature")} className="h-20 w-56 rounded-lg bg-white object-contain p-1" />
                <p className="text-sm"><span className="block font-medium">{doc.signed_by}</span><span className="text-ink-soft">{stampText(doc.signed_at, locale)}</span></p>
              </div>
            ) : (
              <p className="rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning">{t("The customer has not signed the completion form yet.")}</p>
            )}
            {doc.invoice_numbers.length ? <p className="text-sm text-ink-soft">{t("Billed on")}: <span className="font-mono text-ink">{doc.invoice_numbers.join(", ")}</span></p> : null}
          </section>
        ) : null}
        {doc.status === "cancelled" ? <p className="rounded-xl border border-danger/30 bg-danger-soft/40 px-4 py-3 text-sm"><span className="font-semibold text-danger">{t("Cancelled")}</span> · {doc.cancel_reason}</p> : null}
        <ErrorBanner error={action.error} />
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-5">
          {open && can("installation.work_order.update") ? <Button variant="ghost" onClick={() => setMode("cancel")}><XCircle aria-hidden className="size-4" />{t("Cancel job")}</Button> : null}
          {open && onEdit && can("installation.work_order.update") ? <Button variant="secondary" onClick={onEdit}>{t("Edit")}</Button> : null}
          {doc.status === "completed" ? <Link href={`/installation/form?id=${doc.id}`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-surface-muted"><Printer aria-hidden className="size-4" />{t("Completion form")}</Link> : null}
          <span className="flex-1" />
          {(doc.status === "requested" || doc.status === "scheduled") && supervisor ? <Button variant={doc.status === "requested" ? "primary" : "secondary"} onClick={() => setMode("schedule")}><CalendarClock aria-hidden className="size-4" />{doc.status === "requested" ? t("Schedule") : t("Reschedule")}</Button> : null}
          {doc.status === "scheduled" && technician ? <Button variant="secondary" pending={action.pending} onClick={() => run(() => api.post(`/installation/work-orders/${doc.id}/start`))}><Play aria-hidden className="size-4" />{t("Start")}</Button> : null}
          {working && technician ? <Button onClick={() => setMode("complete")}><CheckCircle2 aria-hidden className="size-4" />{t("Mark completed")}</Button> : null}
          {doc.awaiting_signature && technician ? <Button onClick={() => setMode("sign")}><PenLine aria-hidden className="size-4" />{t("Customer sign-off")}</Button> : null}
          {doc.status === "completed" && can("sales.invoice.create") ? <Button variant={doc.awaiting_signature ? "secondary" : "primary"} onClick={() => setMode("bill")}><Receipt aria-hidden className="size-4" />{t("Bill")}</Button> : null}
        </div>
      </div>
      {mode === "schedule" ? <Modal open onClose={() => setMode(null)} title={doc.status === "requested" ? t("Schedule the installation") : t("Reschedule")}><ScheduleForm doc={doc} pending={action.pending} error={action.field} onSubmit={(body) => run(() => api.post(`/installation/work-orders/${doc.id}/schedule`, body))} onCancel={() => setMode(null)} /></Modal> : null}
      {mode === "complete" ? <Modal open onClose={() => setMode(null)} title={t("Mark the job completed")}><CompleteForm pending={action.pending} onSubmit={(body) => run(() => api.post(`/installation/work-orders/${doc.id}/complete`, body), "sign")} onCancel={() => setMode(null)} /></Modal> : null}
      {mode === "sign" ? <Modal open onClose={() => setMode(null)} title={t("Customer sign-off")}><SignForm doc={doc} pending={action.pending} error={action.field} onSubmit={(body) => run(() => api.post(`/installation/work-orders/${doc.id}/sign`, body))} onCancel={() => setMode(null)} /></Modal> : null}
      {mode === "cancel" ? <Modal open onClose={() => setMode(null)} title={t("Cancel job")}><ReasonForm pending={action.pending} onSubmit={(reason) => run(() => api.post(`/installation/work-orders/${doc.id}/cancel`, { reason }))} onCancel={() => setMode(null)} /></Modal> : null}
      {mode === "bill" ? <Modal open onClose={() => setMode(null)} title={t("Bill the job")}><BillForm pending={action.pending} hours={doc.labour_hours} onSubmit={async (body) => action.run(async () => { const invoice = await api.post<Invoice>(`/installation/work-orders/${doc.id}/bill`, body); onDone(); router.push(`/sales/invoices?open=${invoice.id}`); })} onCancel={() => setMode(null)} /></Modal> : null}
    </Drawer>
  );
}

/** Steps 2-3: the supervisor sets the date and time and chooses the technicians. Shows what each
 * technician already has that day, so nobody is booked twice by mistake. */
function ScheduleForm({ doc, pending, error, onSubmit: submit, onCancel }: { doc: WorkOrder; pending: boolean; error: (field: string) => string | undefined; onSubmit: (body: { scheduled_date: string; scheduled_time: string | null; duration_hours: string; technicians: number[] }) => void; onCancel: () => void }) {
  const { company, locale, name, t } = useWorkspace();
  const technicians = useTechnicians();
  const [date, setDate] = useState(doc.scheduled_date ?? doc.requested_date ?? today());
  const [time, setTime] = useState(doc.scheduled_time?.slice(0, 5) ?? "09:00");
  const [hours, setHours] = useState(qty(doc.duration_hours) || "2");
  const [chosen, setChosen] = useState<number[]>(doc.technicians);
  const day = useResource<CalendarDay[]>(date ? withQuery("/installation/work-orders/calendar", { company: company.id, from: date, to: date }) : null);
  const booked = (techId: number) => (day.data?.[0]?.jobs ?? []).filter((job) => job.id !== doc.id && job.technician_ids.includes(techId));
  const toggle = (id: number) => setChosen(chosen.includes(id) ? chosen.filter((item) => item !== id) : [...chosen, id]);
  return (
    <form onSubmit={onSubmit(() => submit({ scheduled_date: date, scheduled_time: time || null, duration_hours: hours || "2", technicians: chosen }))} className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <TextField label={t("Date")} type="date" required autoFocus value={date} onChange={(e) => setDate(e.target.value)} error={error("scheduled_date")} />
        <TextField label={t("Time")} type="time" value={time} onChange={(e) => setTime(e.target.value)} error={error("scheduled_time")} />
        <TextField label={t("Hours")} inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} error={error("duration_hours")} />
      </div>
      {doc.requested_date && doc.requested_date !== date ? <p className="-mt-2 text-xs text-ink-soft">{t("The customer asked for")} {formatDate(doc.requested_date, locale)}</p> : null}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t("Technicians")}</legend>
        {technicians.length === 0 ? <p className="text-sm text-ink-soft">{t("Add technicians under Installation → Technicians.")}</p> : (
          <div className="flex flex-col gap-1.5">
            {technicians.map((tech) => {
              const jobs = booked(tech.id);
              const on = chosen.includes(tech.id);
              return (
                <label key={tech.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${on ? "border-accent bg-accent/5" : "border-line hover:bg-surface-muted/60"}`}>
                  <input type="checkbox" checked={on} onChange={() => toggle(tech.id)} className="size-4 accent-accent" />
                  <span className="flex-1"><span className="font-medium">{name(tech)}</span>{tech.skills ? <span className="block text-xs text-ink-soft">{tech.skills}</span> : null}</span>
                  {jobs.length ? <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs text-warning">{t("Busy")} {jobs.map((job) => job.time ?? "—").join(", ")}</span> : <span className="text-xs text-ink-faint">{t("Free that day")}</span>}
                </label>
              );
            })}
          </div>
        )}
        {error("technicians") ? <p className="text-sm text-danger">{error("technicians")}</p> : null}
      </fieldset>
      <p className="text-xs text-ink-soft">{t("Technicians with a login get a note under the bell.")}</p>
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onCancel}>{t("Cancel")}</Button><Button type="submit" pending={pending} disabled={!chosen.length}>{t("Save schedule")}</Button></div>
    </form>
  );
}

/** Step 5: the technician marks the job done. */
function CompleteForm({ pending, onSubmit: submit, onCancel }: { pending: boolean; onSubmit: (body: { labour_hours: string; completion_notes: string }) => void; onCancel: () => void }) {
  const { t } = useWorkspace();
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <form onSubmit={onSubmit(() => submit({ labour_hours: hours || "0", completion_notes: notes }))} className="flex flex-col gap-4">
      <TextField label={t("Hours worked")} inputMode="decimal" autoFocus required value={hours} onChange={(e) => setHours(e.target.value)} hint="Multiplied by the technicians' hourly cost." />
      <TextAreaField label={t("What was done")} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. 24 downlights fitted and tested, old fittings taken away" />
      <p className="text-xs text-ink-soft">{t("Next, the customer signs the completion form on this screen.")}</p>
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onCancel}>{t("Cancel")}</Button><Button type="submit" pending={pending}>{t("Mark completed")}</Button></div>
    </form>
  );
}

/** Step 6: the customer signs to confirm the installation is complete. */
function SignForm({ doc, pending, error, onSubmit: submit, onCancel }: { doc: WorkOrder; pending: boolean; error: (field: string) => string | undefined; onSubmit: (body: { signed_by: string; signature: string }) => void; onCancel: () => void }) {
  const { t } = useWorkspace();
  const [signedBy, setSignedBy] = useState(doc.contact_name || doc.customer_name);
  const [signature, setSignature] = useState<string | null>(null);
  return (
    <form onSubmit={onSubmit(() => signature && submit({ signed_by: signedBy, signature }))} className="flex flex-col gap-4">
      <div className="rounded-xl bg-surface-muted/60 px-4 py-3 text-sm">
        <p className="font-medium">{doc.number} · {doc.title}</p>
        {doc.completion_notes ? <p className="mt-1 whitespace-pre-line text-ink-soft">{doc.completion_notes}</p> : null}
        <p className="mt-2">{t("I confirm that the installation described above has been completed.")}</p>
      </div>
      <TextField label={t("Name of the person signing")} required value={signedBy} onChange={(e) => setSignedBy(e.target.value)} error={error("signed_by")} />
      <SignaturePad label={t("Signature")} onChange={setSignature} error={error("signature")} />
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onCancel}>{t("Later")}</Button><Button type="submit" pending={pending} disabled={!signature || !signedBy.trim()}>{t("Confirm and sign")}</Button></div>
    </form>
  );
}

function ReasonForm({ pending, onSubmit: submit, onCancel }: { pending: boolean; onSubmit: (reason: string) => void; onCancel: () => void }) {
  const { t } = useWorkspace();
  const [reason, setReason] = useState("");
  return (
    <form onSubmit={onSubmit(() => submit(reason))} className="flex flex-col gap-4">
      <TextField label={t("Reason")} autoFocus required value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onCancel}>{t("Back")}</Button><Button variant="danger" type="submit" pending={pending}>{t("Cancel job")}</Button></div>
    </form>
  );
}

function BillForm({ pending, hours, onSubmit: submit, onCancel }: { pending: boolean; hours: string; onSubmit: (body: { product: number; quantity: string; unit_price: string }) => void; onCancel: () => void }) {
  const { company, t } = useWorkspace();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(Number(hours) > 0 ? qty(hours) : "1");
  const [price, setPrice] = useState("");
  return (
    <form onSubmit={onSubmit(() => product && submit({ product: product.id, quantity: quantity || "1", unit_price: price || "0" }))} className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">{t("A draft invoice opens for review. Use a service product such as Installation.")}</p>
      <ProductPicker label={t("Service")} value={product} onChange={setProduct} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label={t("Quantity")} inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <TextField label={`${t("Unit price")} (${company.currency})`} inputMode="decimal" required value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onCancel}>{t("Cancel")}</Button><Button type="submit" pending={pending} disabled={!product}>{t("Create draft invoice")}</Button></div>
    </form>
  );
}
