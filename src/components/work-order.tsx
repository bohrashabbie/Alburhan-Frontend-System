"use client";

import { CheckCircle2, Play, Receipt, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CustomerPicker } from "@/components/customer-picker";
import { Facts } from "@/components/document-list";
import { ProductPicker } from "@/components/product-picker";
import { Button, Drawer, ErrorBanner, Modal, SelectField, TextAreaField, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import { qty } from "@/lib/inventory";
import { JobStatusBadge, ProjectPicker, useTechnicians } from "@/lib/projects";
import { today } from "@/lib/sales";
import type { Customer, Invoice, Product, Project, WorkOrder } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export function WorkOrderEditor({ doc, presetProject, onDone }: { doc?: WorkOrder; presetProject?: Project | null; onDone: () => void }) {
  const { company, branch, branches, can, name, t } = useWorkspace();
  const technicians = useTechnicians();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(doc?.customer ?? presetProject?.customer ?? null);
  const customerName = doc?.customer_name ?? presetProject?.customer_name ?? "";
  const [project, setProject] = useState<Project | null>(presetProject ?? null);
  const [form, setForm] = useState({
    title: doc?.title ?? (presetProject ? `${presetProject.name} · installation` : ""), branch: doc ? String(doc.branch) : presetProject ? String(presetProject.branch) : branch ? String(branch.id) : branches[0] ? String(branches[0].id) : "",
    site_address: doc?.site_address ?? presetProject?.site_address ?? "", contact_name: doc?.contact_name ?? "", contact_phone: doc?.contact_phone ?? "",
    scheduled_date: doc?.scheduled_date ?? today(), scheduled_time: doc?.scheduled_time?.slice(0, 5) ?? "09:00", duration_hours: doc ? qty(doc.duration_hours) : "2", description: doc?.description ?? "",
  });
  const [chosen, setChosen] = useState<number[]>(doc?.technicians ?? []);
  const save = useAction();
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });
  const toggle = (id: number) => setChosen(chosen.includes(id) ? chosen.filter((item) => item !== id) : [...chosen, id]);
  const payload = () => ({
    company: company.id, title: form.title, customer: customerId, project: project?.id ?? doc?.project ?? null, branch: Number(form.branch), site_address: form.site_address,
    contact_name: form.contact_name, contact_phone: form.contact_phone, scheduled_date: form.scheduled_date, scheduled_time: form.scheduled_time || null,
    duration_hours: form.duration_hours || "1", technicians: chosen, description: form.description,
  });
  const submit = () => save.run(async () => { if (doc) await api.patch(`/installation/work-orders/${doc.id}`, payload()); else await api.post("/installation/work-orders", payload()); onDone(); });
  const formId = "wo-form";
  return (
    <Drawer open large wide onClose={onDone} title={doc ? `${doc.number}` : t("New job")} action={doc ? <JobStatusBadge status={doc.status} /> : undefined}
      footer={<div className="flex items-center gap-2"><span className="flex-1" /><Button variant="secondary" onClick={onDone}>{t("Cancel")}</Button>{can(doc ? "installation.work_order.update" : "installation.work_order.create") ? <Button type="submit" form={formId} pending={save.pending}>{t("Save")}</Button> : null}</div>}
    >
      <form id={formId} onSubmit={onSubmit(submit)} className="profile-section flex flex-col gap-5 pb-6">
        <ErrorBanner error={save.error} />
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <div className="sm:col-span-2"><TextField label={t("Job")} required value={form.title} onChange={set("title")} error={save.field("title")} placeholder="e.g. Install 24 downlights, villa in Salwa" /></div>
          <div className="sm:col-span-2">
            {customerId && !customer ? <div className="flex items-end gap-2"><div className="flex-1"><TextField label={t("Customer")} value={customerName} disabled /></div>{!doc ? <Button variant="secondary" onClick={() => { setCustomerId(null); setProject(null); }}>{t("Change customer")}</Button> : null}</div> : <CustomerPicker label={t("Customer")} value={customer} error={save.field("customer")} onChange={(picked) => { setCustomer(picked); setCustomerId(picked?.id ?? null); setProject(null); }} />}
          </div>
          <div className="sm:col-span-2">{doc && !project ? <TextField label={t("Project")} value={doc.project_number ? `${doc.project_number} · ${doc.project_name}` : "—"} disabled /> : <ProjectPicker label={`${t("Project")} (${t("optional")})`} value={project} onChange={setProject} customerId={customerId} error={save.field("project")} />}</div>
          <SelectField label={t("Branch")} value={form.branch} onChange={set("branch")} error={save.field("branch")}>{branches.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}</SelectField>
          <div className="grid grid-cols-3 gap-3">
            <TextField label={t("Date")} type="date" required value={form.scheduled_date} onChange={set("scheduled_date")} error={save.field("scheduled_date")} />
            <TextField label={t("Time")} type="time" value={form.scheduled_time} onChange={set("scheduled_time")} />
            <TextField label={t("Hours")} inputMode="decimal" value={form.duration_hours} onChange={set("duration_hours")} error={save.field("duration_hours")} />
          </div>
          <TextField label={t("Contact on site")} value={form.contact_name} onChange={set("contact_name")} />
          <TextField label={t("Contact phone")} value={form.contact_phone} onChange={set("contact_phone")} />
          <div className="sm:col-span-2"><TextAreaField label={t("Site address")} rows={2} value={form.site_address} onChange={set("site_address")} /></div>
          <div className="sm:col-span-2"><TextAreaField label={t("Work to do")} rows={3} value={form.description} onChange={set("description")} /></div>
        </div>
        <section className="flex flex-col gap-2">
          <h3 className="text-base font-bold">{t("Technicians")}</h3>
          {technicians.length === 0 ? <p className="text-sm text-ink-soft">{t("Add technicians under Installation → Technicians.")}</p> : (
            <div className="flex flex-wrap gap-2">
              {technicians.map((tech) => (
                <button key={tech.id} type="button" onClick={() => toggle(tech.id)} className={`inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors ${chosen.includes(tech.id) ? "border-accent bg-accent text-white" : "border-line-strong bg-surface hover:bg-surface-muted"}`}>
                  {name(tech)}{tech.open_jobs ? <span className={`rounded-full px-1.5 text-xs ${chosen.includes(tech.id) ? "bg-white/20" : "bg-surface-muted text-ink-soft"}`}>{tech.open_jobs}</span> : null}
                </button>
              ))}
            </div>
          )}
          {save.field("technicians") ? <p className="text-sm text-danger">{save.field("technicians")}</p> : null}
        </section>
      </form>
    </Drawer>
  );
}

export function WorkOrderViewer({ doc: initial, onDone, onEdit }: { doc: WorkOrder; onDone: () => void; onEdit?: () => void }) {
  const { company, can, locale, t } = useWorkspace();
  const router = useRouter();
  const live = useResource<WorkOrder>(`/installation/work-orders/${initial.id}`);
  const doc = live.data ?? initial;
  const [mode, setMode] = useState<"complete" | "cancel" | "bill" | null>(null);
  const action = useAction();
  const money = (value: string) => formatMoney(value, company.currency, locale);
  const run = async (fn: () => Promise<unknown>) => action.run(async () => { await fn(); await live.mutate(); setMode(null); });
  const open = doc.status === "scheduled" || doc.status === "in_progress";
  return (
    <Drawer open large wide onClose={onDone} title={doc.number} action={<JobStatusBadge status={doc.status} />}>
      <div className="profile-section flex flex-col gap-6 pb-6">
        <h3 className="text-lg font-semibold">{doc.title}</h3>
        <Facts items={[[t("Customer"), doc.customer_name], [t("When"), `${formatDate(doc.scheduled_date, locale)}${doc.scheduled_time ? ` · ${doc.scheduled_time.slice(0, 5)}` : ""} · ${qty(doc.duration_hours)} h`], [t("Technicians"), doc.technician_names.join(", ") || "—"], [t("Branch"), doc.branch_name]]} />
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-soft">
          {doc.project_number ? <span>{t("Project")}: <span className="font-mono text-ink">{doc.project_number}</span> {doc.project_name}</span> : null}
          {doc.source_invoice_number ? <span>{t("Invoice")}: <span className="font-mono text-ink">{doc.source_invoice_number}</span></span> : null}
          {doc.contact_name ? <span>{t("Contact on site")}: <span className="text-ink">{doc.contact_name} {doc.contact_phone}</span></span> : null}
        </div>
        {doc.site_address ? <p className="text-sm whitespace-pre-line">{doc.site_address}</p> : null}
        {doc.description ? <p className="text-[15px] whitespace-pre-line">{doc.description}</p> : null}
        {doc.status === "completed" ? (
          <section className="grid grid-cols-3 gap-3">
            {[[t("Labour hours"), `${qty(doc.labour_hours)} h`], [t("Labour cost"), money(doc.labour_cost)], [t("Signed by"), doc.signed_by || "—"]].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line p-3"><p className="text-xs text-ink-soft">{label}</p><p className="mt-0.5 font-semibold tabular-nums">{value}</p></div>
            ))}
            {doc.completion_notes ? <p className="col-span-3 text-sm whitespace-pre-line text-ink-soft">{doc.completion_notes}</p> : null}
            {doc.invoice_numbers.length ? <p className="col-span-3 text-sm text-ink-soft">{t("Billed on")}: <span className="font-mono text-ink">{doc.invoice_numbers.join(", ")}</span></p> : null}
          </section>
        ) : null}
        {doc.status === "cancelled" ? <p className="rounded-xl border border-danger/30 bg-danger-soft/40 px-4 py-3 text-sm"><span className="font-semibold text-danger">{t("Cancelled")}</span> · {doc.cancel_reason}</p> : null}
        <ErrorBanner error={action.error} />
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-5">
          {open && can("installation.work_order.update") ? <Button variant="ghost" onClick={() => setMode("cancel")}><XCircle aria-hidden className="size-4" />{t("Cancel job")}</Button> : null}
          {open && onEdit && can("installation.work_order.update") ? <Button variant="secondary" onClick={onEdit}>{t("Edit")}</Button> : null}
          <span className="flex-1" />
          {doc.status === "scheduled" && can("installation.work_order.update") ? <Button variant="secondary" pending={action.pending} onClick={() => run(() => api.post(`/installation/work-orders/${doc.id}/start`))}><Play aria-hidden className="size-4" />{t("Start")}</Button> : null}
          {open && can("installation.work_order.complete") ? <Button onClick={() => setMode("complete")}><CheckCircle2 aria-hidden className="size-4" />{t("Complete")}</Button> : null}
          {doc.status === "completed" && can("sales.invoice.create") ? <Button onClick={() => setMode("bill")}><Receipt aria-hidden className="size-4" />{t("Bill")}</Button> : null}
        </div>
      </div>
      {mode === "complete" ? <Modal open onClose={() => setMode(null)} title={t("Complete job")}><CompleteForm pending={action.pending} onSubmit={(body) => run(() => api.post(`/installation/work-orders/${doc.id}/complete`, body))} onCancel={() => setMode(null)} /></Modal> : null}
      {mode === "cancel" ? <Modal open onClose={() => setMode(null)} title={t("Cancel job")}><ReasonForm pending={action.pending} onSubmit={(reason) => run(() => api.post(`/installation/work-orders/${doc.id}/cancel`, { reason }))} onCancel={() => setMode(null)} /></Modal> : null}
      {mode === "bill" ? <Modal open onClose={() => setMode(null)} title={t("Bill the job")}><BillForm pending={action.pending} hours={doc.labour_hours} onSubmit={async (body) => action.run(async () => { const invoice = await api.post<Invoice>(`/installation/work-orders/${doc.id}/bill`, body); onDone(); router.push(`/sales/invoices?open=${invoice.id}`); })} onCancel={() => setMode(null)} /></Modal> : null}
    </Drawer>
  );
}

function CompleteForm({ pending, onSubmit: submit, onCancel }: { pending: boolean; onSubmit: (body: { labour_hours: string; signed_by: string; completion_notes: string }) => void; onCancel: () => void }) {
  const { t } = useWorkspace();
  const [hours, setHours] = useState("");
  const [signed, setSigned] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <form onSubmit={onSubmit(() => submit({ labour_hours: hours || "0", signed_by: signed, completion_notes: notes }))} className="flex flex-col gap-4">
      <TextField label={t("Hours worked")} inputMode="decimal" autoFocus required value={hours} onChange={(e) => setHours(e.target.value)} hint="Multiplied by the technicians' hourly cost." />
      <TextField label={t("Signed by")} value={signed} onChange={(e) => setSigned(e.target.value)} hint="Who accepted the work on site." />
      <TextAreaField label={t("Notes")} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onCancel}>{t("Cancel")}</Button><Button type="submit" pending={pending}>{t("Complete")}</Button></div>
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
