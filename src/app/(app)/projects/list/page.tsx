"use client";

import { Boxes, FileText, Plus, Receipt, Trash2, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";

import { CustomerPicker } from "@/components/customer-picker";
import { DocumentList, Facts } from "@/components/document-list";
import { ProductPicker } from "@/components/product-picker";
import { Button, Drawer, ErrorBanner, IconButton, Loading, Modal, SelectField, TextAreaField, TextField } from "@/components/ui";
import { api, idOrNull } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import { LINE_INPUT, qty, useWarehouses } from "@/lib/inventory";
import { decimalsOf, formatAmount, toMinor } from "@/lib/money";
import { NEXT_STATUS, PROJECT_STATUSES, ProjectStatusBadge } from "@/lib/projects";
import type { BOQLine, BOQProgress, Customer, Invoice, Page, Product, Project, ProjectStatus, Quotation, User } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

type BOQDraft = { id?: number; product: Product | null; productId: number | null; label: string; description: string; quantity: string; unit_price: string; unit_cost: string; issued: string };

const emptyLine = (): BOQDraft => ({ product: null, productId: null, label: "", description: "", quantity: "1", unit_price: "", unit_cost: "", issued: "0" });

function fromBOQ(lines: BOQLine[]): BOQDraft[] {
  return lines.map((line) => ({ id: line.id, product: null, productId: line.product, label: `${line.sku} · ${line.product_name}`, description: line.description, quantity: qty(line.quantity), unit_price: line.unit_price, unit_cost: line.unit_cost, issued: line.issued_quantity ?? "0" }));
}

function boqTotals(lines: BOQDraft[], decimals: number) {
  let value = 0n;
  let cost = 0n;
  for (const line of lines) {
    if (!line.productId) continue;
    const quantity = toMinor(line.quantity || "0", 4);
    value += (quantity * toMinor(line.unit_price || "0", decimals)) / 10000n;
    cost += (quantity * toMinor(line.unit_cost || "0", decimals)) / 10000n;
  }
  return { value, cost };
}

function Editor({ doc, onDone }: { doc?: Project; onDone: () => void }) {
  const { company, branch, branches, can, locale, name, t } = useWorkspace();
  const router = useRouter();
  const warehouses = useWarehouses();
  const users = useResource<Page<User>>(`/users?company=${company.id}&page_size=200`);
  const live = useResource<Project>(doc ? `/projects/projects/${doc.id}` : null);
  const project = live.data ?? doc;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(doc?.customer ?? null);
  const [form, setForm] = useState({
    name: doc?.name ?? "", name_ar: doc?.name_ar ?? "", branch: doc ? String(doc.branch) : branch ? String(branch.id) : branches[0] ? String(branches[0].id) : "",
    manager: doc?.manager ? String(doc.manager) : "", site_address: doc?.site_address ?? "", start_date: doc?.start_date ?? "", end_date: doc?.end_date ?? "",
    contract_value: doc ? String(Number(doc.contract_value)) : "", retention_percent: doc ? String(Number(doc.retention_percent)) : "0", notes: doc?.notes ?? "",
  });
  const [lines, setLines] = useState<BOQDraft[]>(doc?.boq?.length ? fromBOQ(doc.boq) : [emptyLine()]);
  const [reserving, setReserving] = useState(false);
  const [invoicing, setInvoicing] = useState(false);
  const save = useAction();
  const action = useAction();
  const decimals = decimalsOf(company.currency);
  const sums = boqTotals(lines, decimals);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });
  const setLine = (index: number, patch: Partial<BOQDraft>) => setLines(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const locked = project ? project.status === "closed" || project.status === "lost" : false;

  const payload = () => ({
    company: company.id, customer: customerId, name: form.name, name_ar: form.name_ar, branch: idOrNull(form.branch), manager: form.manager ? Number(form.manager) : null,
    site_address: form.site_address, start_date: form.start_date || null, end_date: form.end_date || null, contract_value: form.contract_value || "0",
    retention_percent: form.retention_percent || "0", notes: form.notes,
    boq: lines.filter((line) => line.productId).map((line) => ({ id: line.id, product: line.productId, description: line.description, quantity: line.quantity || "1", unit_price: line.unit_price || "0", unit_cost: line.unit_cost || "0" })),
  });
  const persist = async () => (doc ? api.patch<Project>(`/projects/projects/${doc.id}`, payload()) : api.post<Project>("/projects/projects", payload()));
  const saveProject = () => save.run(async () => { await persist(); onDone(); });
  const move = (status: ProjectStatus) => action.run(async () => { await api.post(`/projects/projects/${doc!.id}/status`, { status }); await live.mutate(); });
  const quote = () => action.run(async () => { await persist(); const quotation = await api.post<Quotation>(`/projects/projects/${doc!.id}/quote`); onDone(); router.push(`/sales/quotations?open=${quotation.id}`); });
  const money = (value: string) => formatMoney(value, company.currency, locale);
  const summary = project?.summary;
  const statusLabel = (status: ProjectStatus) => PROJECT_STATUSES.find(([value]) => value === status)?.[1] ?? status;

  const formId = "project-form";
  return (
    <Drawer open large wide onClose={onDone} title={doc ? `${doc.number} · ${name(doc)}` : t("New project")} action={project ? <ProjectStatusBadge status={project.status} /> : undefined}
      footer={
        <div className="flex items-center gap-2">
          {doc && can("projects.project.delete") && (doc.status === "lead" || doc.status === "lost") ? <Button variant="danger" onClick={() => action.run(async () => { if (!window.confirm("Delete this lead?")) return; await api.delete(`/projects/projects/${doc.id}`); onDone(); })}>{t("Delete")}</Button> : null}
          <span className="flex-1" />
          <Button variant="secondary" onClick={onDone}>{t("Cancel")}</Button>
          {!locked && can(doc ? "projects.project.update" : "projects.project.create") ? <Button type="submit" form={formId} pending={save.pending}>{t("Save")}</Button> : null}
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit(saveProject)} className="profile-section flex flex-col gap-6 pb-6">
        <ErrorBanner error={save.error ?? action.error} />
        {project && summary ? (
          <>
            <Facts items={[[t("Customer"), project.customer_name], [t("Manager"), project.manager_name ?? "—"], [t("Start"), formatDate(project.start_date, locale)], [t("End"), formatDate(project.end_date, locale)]]} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[[t("Contract value"), money(project.contract_value)], [t("Invoiced"), money(summary.invoiced)], [t("Received"), money(summary.received)], [t("Outstanding"), money(summary.outstanding)], [t("BOQ value"), money(summary.boq_value)], [t("Materials cost"), money(summary.materials_cost)], [t("Labour cost"), money(summary.labour_cost)], [t("Margin"), `${money(summary.margin)}${summary.margin_percent ? ` · ${summary.margin_percent}%` : ""}`]].map(([label, value], index) => (
                <div key={label} className={`rounded-xl border border-line p-3 ${index === 7 ? "bg-surface-muted/40" : ""}`}><p className="text-xs text-ink-soft">{label}</p><p className={`mt-0.5 font-semibold tabular-nums ${index === 7 && Number(summary.margin) < 0 ? "text-danger" : ""}`}>{value}</p></div>
              ))}
            </div>
            {!locked ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface-muted/30 px-4 py-3">
                <span className="text-sm text-ink-soft">{t("Move to")}:</span>
                {NEXT_STATUS[project.status].map((status) => <Button key={status} variant={status === "lost" ? "danger" : "secondary"} className="h-9" pending={action.pending} onClick={() => move(status)}>{t(statusLabel(status))}</Button>)}
                <span className="flex-1" />
                {can("sales.quotation.create") && (project.status === "lead" || project.status === "quoted") ? <Button variant="secondary" className="h-9" pending={action.pending} onClick={quote}><FileText aria-hidden className="size-4" />{t("Quotation")}</Button> : null}
                {can("projects.project.update") && (project.status === "won" || project.status === "in_progress") ? <Button variant="secondary" className="h-9" onClick={() => setReserving(true)}><Boxes aria-hidden className="size-4" />{t("Reserve stock")}</Button> : null}
                {can("projects.issue.create") && (project.status === "won" || project.status === "in_progress") ? <Button variant="secondary" className="h-9" onClick={() => { onDone(); router.push(`/projects/issues?project=${project.id}`); }}>{t("Materials to site")}</Button> : null}
                {can("installation.work_order.create") && project.status !== "lead" && project.status !== "quoted" ? <Button variant="secondary" className="h-9" onClick={() => { onDone(); router.push(`/installation/work-orders?project=${project.id}`); }}><Wrench aria-hidden className="size-4" />{t("New job")}</Button> : null}
                {can("sales.invoice.create") && (project.status === "won" || project.status === "in_progress" || project.status === "completed") ? <Button className="h-9" onClick={() => setInvoicing(true)}><Receipt aria-hidden className="size-4" />{t("Progress invoice")}</Button> : null}
              </div>
            ) : null}
          </>
        ) : null}
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <TextField label={t("Project name")} required value={form.name} onChange={set("name")} error={save.field("name")} disabled={locked} />
          <TextField label={t("Name (Arabic)")} value={form.name_ar} onChange={set("name_ar")} disabled={locked} />
          <div className="sm:col-span-2">
            {doc && !customer ? <TextField label={t("Customer")} value={doc.customer_name} disabled /> : <CustomerPicker label={t("Customer")} value={customer} error={save.field("customer")} onChange={(picked) => { setCustomer(picked); setCustomerId(picked?.id ?? null); }} />}
          </div>
          <SelectField label={t("Branch")} value={form.branch} onChange={set("branch")} error={save.field("branch")} disabled={locked}>
            {branches.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
          </SelectField>
          <SelectField label={t("Project manager")} value={form.manager} onChange={set("manager")} error={save.field("manager")} disabled={locked}>
            <option value="">—</option>
            {(users.data?.results ?? []).map((item) => <option key={item.id} value={item.id}>{[item.first_name, item.last_name].filter(Boolean).join(" ") || item.email}</option>)}
          </SelectField>
          <TextField label={t("Start date")} type="date" value={form.start_date} onChange={set("start_date")} disabled={locked} />
          <TextField label={t("End date")} type="date" value={form.end_date} onChange={set("end_date")} error={save.field("end_date")} disabled={locked} />
          <TextField label={`${t("Contract value")} (${company.currency})`} inputMode="decimal" value={form.contract_value} onChange={set("contract_value")} error={save.field("contract_value")} disabled={locked} />
          <TextField label={t("Retention %")} inputMode="decimal" value={form.retention_percent} onChange={set("retention_percent")} hint="Held back by the client until handover." disabled={locked} />
          <div className="sm:col-span-2"><TextAreaField label={t("Site address")} rows={2} value={form.site_address} onChange={set("site_address")} disabled={locked} /></div>
          <div className="sm:col-span-2"><TextAreaField label={t("Notes")} rows={2} value={form.notes} onChange={set("notes")} disabled={locked} /></div>
        </div>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">{t("Bill of quantities")}</h3>
            {!locked ? <Button variant="secondary" onClick={() => setLines([...lines, emptyLine()])}><Plus aria-hidden className="size-4" />{t("Add line")}</Button> : null}
          </div>
          <div className="overflow-visible rounded-xl border border-line">
            <table className="w-full table-fixed text-sm">
              <colgroup><col className="w-[34%]" /><col className="w-[11%]" /><col className="w-[14%]" /><col className="w-[14%]" /><col /><col className="w-[10%]" /><col className="w-11" /></colgroup>
              <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
                <tr>
                  <th scope="col" className="px-3 py-2.5 text-start font-medium">{t("Item")}</th>
                  <th scope="col" className="px-2 py-2.5 text-end font-medium">{t("Quantity")}</th>
                  <th scope="col" className="px-2 py-2.5 text-end font-medium">{t("Unit price")}</th>
                  <th scope="col" className="px-2 py-2.5 text-end font-medium">{t("Unit cost")}</th>
                  <th scope="col" className="px-3 py-2.5 text-end font-medium">{t("Amount")}</th>
                  <th scope="col" className="px-2 py-2.5 text-end font-medium">{t("Issued")}</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lines.map((line, index) => (
                  <tr key={line.id ?? `new-${index}`} className="align-top">
                    <td className="px-2 py-2">
                      {line.productId && !line.product ? (
                        <div className="flex h-9 items-center justify-between gap-2 rounded-lg border border-line-strong bg-surface px-2.5 text-sm"><span className="truncate">{line.label}</span>{!locked && !line.id ? <button type="button" className="shrink-0 text-xs text-ink-soft hover:text-ink" onClick={() => setLine(index, { productId: null, label: "", product: null })}>{t("Change")}</button> : null}</div>
                      ) : (
                        <ProductPicker label="" value={line.product} onChange={(product) => setLine(index, { product, productId: product?.id ?? null, label: product ? `${product.sku} · ${product.name}` : "" })} />
                      )}
                      <input aria-label={`${t("Description")} ${index + 1}`} placeholder={t("Description (optional)")} value={line.description} onChange={(e) => setLine(index, { description: e.target.value })} disabled={locked} className="mt-1.5 h-8 w-full rounded-lg border border-transparent bg-transparent px-2.5 text-xs text-ink-soft placeholder:text-ink-faint hover:border-line focus:border-line-strong focus:bg-surface" />
                    </td>
                    <td className="px-1.5 py-2"><input aria-label={`${t("Quantity")} ${index + 1}`} inputMode="decimal" value={line.quantity} onChange={(e) => setLine(index, { quantity: e.target.value })} disabled={locked} className={`${LINE_INPUT} text-end tabular-nums`} /></td>
                    <td className="px-1.5 py-2"><input aria-label={`${t("Unit price")} ${index + 1}`} inputMode="decimal" value={line.unit_price} onChange={(e) => setLine(index, { unit_price: e.target.value })} disabled={locked} className={`${LINE_INPUT} text-end tabular-nums`} /></td>
                    <td className="px-1.5 py-2"><input aria-label={`${t("Unit cost")} ${index + 1}`} inputMode="decimal" value={line.unit_cost} onChange={(e) => setLine(index, { unit_cost: e.target.value })} disabled={locked} className={`${LINE_INPUT} text-end tabular-nums`} /></td>
                    <td className="px-3 py-2 pt-4 text-end font-medium tabular-nums">{line.productId ? formatAmount((toMinor(line.quantity || "0", 4) * toMinor(line.unit_price || "0", decimals)) / 10000n, decimals) : <span className="text-ink-faint">—</span>}</td>
                    <td className="px-2 py-2 pt-4 text-end text-ink-soft tabular-nums">{line.id ? qty(line.issued) : "—"}</td>
                    <td className="px-1 py-2 text-center">{!locked ? <IconButton label={t("Remove line")} disabled={lines.length <= 1 || Number(line.issued) > 0} onClick={() => setLines(lines.filter((_, i) => i !== index))}><Trash2 aria-hidden className="size-4" /></IconButton> : null}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-line bg-surface-muted/40 text-sm tabular-nums">
                <tr><td className="px-3 py-2 text-end text-ink-soft" colSpan={4}>{t("Estimated cost")}</td><td className="px-3 py-2 text-end">{formatAmount(sums.cost, decimals)}</td><td colSpan={2} /></tr>
                <tr className="font-semibold"><td className="px-3 py-2.5 text-end" colSpan={4}>{t("BOQ value")} · {company.currency}</td><td className="px-3 py-2.5 text-end text-base">{formatAmount(sums.value, decimals)}</td><td className="px-2 py-2.5 text-end text-xs font-normal text-ink-soft" colSpan={2}>{sums.value > 0n ? `${t("Margin")} ${formatAmount(sums.value - sums.cost, decimals)}` : ""}</td></tr>
              </tfoot>
            </table>
          </div>
          {save.field("boq") ? <p className="text-sm text-danger">{save.field("boq")}</p> : null}
        </section>
      </form>
      {reserving && doc ? (
        <Modal open onClose={() => setReserving(false)} title={t("Reserve stock")}>
          <ReserveForm projectId={doc.id} warehouses={warehouses.map((w) => [String(w.id), name(w)])} onDone={async () => { setReserving(false); await live.mutate(); }} />
        </Modal>
      ) : null}
      {invoicing && doc ? (
        <Modal open onClose={() => setInvoicing(false)} title={t("Progress invoice")}>
          <InvoiceForm projectId={doc.id} onDone={(invoice) => { setInvoicing(false); onDone(); router.push(`/sales/invoices?open=${invoice.id}`); }} />
        </Modal>
      ) : null}
    </Drawer>
  );
}

function ReserveForm({ projectId, warehouses, onDone }: { projectId: number; warehouses: [string, string][]; onDone: () => void }) {
  const { t } = useWorkspace();
  const [warehouse, setWarehouse] = useState(warehouses[0]?.[0] ?? "");
  const [result, setResult] = useState<number | null>(null);
  const action = useAction();
  return (
    <form onSubmit={onSubmit(() => action.run(async () => { const body = await api.post<{ reserved: number }>(`/projects/projects/${projectId}/reserve`, { warehouse: Number(warehouse) }); setResult(body.reserved); }))} className="flex flex-col gap-4">
      <ErrorBanner error={action.error} />
      <p className="text-sm text-ink-soft">{t("Holds free stock for every BOQ item not yet reserved or issued, so showroom sales can't take it.")}</p>
      <SelectField label={t("Warehouse")} value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>{warehouses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectField>
      {result !== null ? <p className="text-sm font-medium">{result} {t("reservations made.")}</p> : null}
      <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onDone}>{result !== null ? t("Done") : t("Cancel")}</Button>{result === null ? <Button type="submit" pending={action.pending}>{t("Reserve stock")}</Button> : null}</div>
    </form>
  );
}

function InvoiceForm({ projectId, onDone }: { projectId: number; onDone: (invoice: Invoice) => void }) {
  const { company, t } = useWorkspace();
  const progress = useResource<BOQProgress[]>(`/projects/projects/${projectId}/progress`);
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const action = useAction();
  const decimals = decimalsOf(company.currency);
  const rows = progress.data ?? [];
  const remaining = (row: BOQProgress) => Number(row.quantity) - Number(row.invoiced_quantity);
  const submit = () => action.run(async () => {
    const lines = Object.entries(quantities).filter(([, value]) => Number(value) > 0).map(([id, value]) => ({ boq_line: Number(id), quantity: value }));
    const invoice = await api.post<Invoice>(`/projects/projects/${projectId}/invoice`, { lines });
    onDone(invoice);
  });
  const fillAll = () => setQuantities(Object.fromEntries(rows.filter((row) => remaining(row) > 0).map((row) => [row.id, qty(String(remaining(row)))])));
  return (
    <form onSubmit={onSubmit(submit)} className="flex flex-col gap-4">
      <ErrorBanner error={action.error} />
      <div className="flex items-center justify-between"><p className="text-sm text-ink-soft">{t("Choose what to bill now. A draft invoice opens for review.")}</p><Button variant="ghost" className="h-8" onClick={fillAll}>{t("Bill everything left")}</Button></div>
      {!progress.data ? <Loading /> : (
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full table-fixed text-sm">
            <colgroup><col /><col className="w-[18%]" /><col className="w-[18%]" /><col className="w-[22%]" /></colgroup>
            <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase"><tr><th className="px-3 py-2 text-start font-medium">{t("Item")}</th><th className="px-2 py-2 text-end font-medium">{t("Billed")}</th><th className="px-2 py-2 text-end font-medium">{t("Price")}</th><th className="px-2 py-2 text-end font-medium">{t("Bill now")}</th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2"><span className="block truncate font-medium">{row.product_name}</span><span className="block text-xs text-ink-soft">{qty(row.quantity)} {row.uom}</span></td>
                  <td className="px-2 py-2 text-end text-ink-soft tabular-nums">{qty(row.invoiced_quantity)}</td>
                  <td className="px-2 py-2 text-end tabular-nums">{formatAmount(row.unit_price, decimals)}</td>
                  <td className="px-2 py-2"><input aria-label={`${t("Bill now")} ${row.sku}`} inputMode="decimal" value={quantities[row.id] ?? ""} placeholder={remaining(row) > 0 ? qty(String(remaining(row))) : "0"} onChange={(e) => setQuantities({ ...quantities, [row.id]: e.target.value })} className={`${LINE_INPUT} text-end tabular-nums`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-end gap-2"><Button type="submit" pending={action.pending} disabled={!Object.values(quantities).some((value) => Number(value) > 0)}>{t("Create draft invoice")}</Button></div>
    </form>
  );
}

function ProjectsList() {
  const { company, locale } = useWorkspace();
  const money = (value: string) => formatMoney(value, company.currency, locale);
  return (
    <>
      <DocumentList<Project>
        title="Projects"
        description="Villas, towers and fit-outs: a BOQ per project, stock reserved and issued to the site, progress invoices and the margin as it builds."
        endpoint="/projects/projects"
        createPermission="projects.project.create"
        newLabel="New project"
        statuses={PROJECT_STATUSES}
        columns={[
          { label: "Number", render: (row) => <span className="font-mono text-xs">{row.number}</span> },
          { label: "Project", render: (row) => <span><span className="block font-medium">{row.name}</span><span className="block text-xs text-ink-soft">{row.site_address || "—"}</span></span> },
          { label: "Customer", render: (row) => row.customer_name },
          { label: "Manager", render: (row) => row.manager_name ?? "—" },
          { label: "Start", render: (row) => <span className="tabular-nums">{formatDate(row.start_date, locale)}</span> },
          { label: "Contract value", render: (row) => <span className="tabular-nums">{money(row.contract_value)}</span>, align: "end" },
          { label: "BOQ value", render: (row) => <span className="tabular-nums">{money(row.boq_value)}</span>, align: "end" },
          { label: "Status", render: (row) => <ProjectStatusBadge status={row.status} /> },
        ]}
        renderOpen={(open, close) => (open === "new" ? <Editor onDone={close} /> : <ProjectLoader key={open.id} id={open.id} onDone={close} />)}
      />
    </>
  );
}

/** The list omits the BOQ and summary; fetch the full project before editing. */
function ProjectLoader({ id, onDone }: { id: number; onDone: () => void }) {
  const full = useResource<Project>(`/projects/projects/${id}`);
  const { t } = useWorkspace();
  if (!full.data) return <Drawer open large wide onClose={onDone} title={t("Loading…")}><Loading /></Drawer>;
  return <Editor doc={full.data} onDone={onDone} />;
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ProjectsList />
    </Suspense>
  );
}
