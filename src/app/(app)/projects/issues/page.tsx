"use client";

import { Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { DocumentList, Facts } from "@/components/document-list";
import { ProductPicker } from "@/components/product-picker";
import { Button, Drawer, ErrorBanner, IconButton, Loading, SelectField, TextAreaField, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { onSubmit, useAction, useResource } from "@/lib/hooks";
import { LINE_INPUT, qty, useWarehouses } from "@/lib/inventory";
import { ProjectPicker } from "@/lib/projects";
import { PurchaseStatus } from "@/lib/purchasing";
import { today } from "@/lib/sales";
import type { BOQProgress, MaterialIssue, Product, Project } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

type Row = { boq_line: number | null; product: number; label: string; uom: string; remaining: string | null; quantity: string };

function Editor({ doc, presetProject, onDone }: { doc?: MaterialIssue; presetProject?: Project | null; onDone: () => void }) {
  const { company, can, name, t } = useWorkspace();
  const warehouses = useWarehouses();
  const [project, setProject] = useState<Project | null>(presetProject ?? null);
  const [warehouse, setWarehouse] = useState(doc?.warehouse ? String(doc.warehouse) : "");
  const [date, setDate] = useState(doc?.date ?? today());
  const [issuedTo, setIssuedTo] = useState(doc?.issued_to ?? "");
  const [notes, setNotes] = useState(doc?.notes ?? "");
  const [rows, setRows] = useState<Row[]>(doc ? doc.lines.map((line) => ({ boq_line: line.boq_line, product: line.product, label: `${line.sku} · ${line.product_name}`, uom: line.uom ?? "", remaining: null, quantity: qty(line.quantity) })) : []);
  const [extra, setExtra] = useState<Product | null>(null);
  const progress = useResource<BOQProgress[]>(!doc && project ? `/projects/projects/${project.id}/progress` : null);
  const save = useAction();
  const remove = useAction();
  const warehouseValue = warehouse || (warehouses[0] ? String(warehouses[0].id) : "");
  const shown = rows.length || !progress.data ? rows : progress.data.filter((row) => row.product_type === "stock").map((row) => {
    const remaining = Number(row.quantity) - Number(row.issued_quantity);
    return { boq_line: row.id, product: row.product, label: `${row.sku} · ${row.product_name}`, uom: row.uom ?? "", remaining: qty(String(Math.max(remaining, 0))), quantity: remaining > 0 ? qty(String(remaining)) : "0" };
  });
  const update = (index: number, value: string) => setRows(shown.map((row, i) => (i === index ? { ...row, quantity: value } : row)));
  const addExtra = (product: Product | null) => { setExtra(null); if (product) setRows([...shown, { boq_line: null, product: product.id, label: `${product.sku} · ${product.name}`, uom: product.uom_code, remaining: null, quantity: "1" }]); };

  const payload = () => ({
    company: company.id, date, project: project?.id ?? doc?.project, warehouse: Number(warehouseValue), issued_to: issuedTo, notes,
    lines: shown.filter((row) => Number(row.quantity) > 0).map((row) => ({ boq_line: row.boq_line, product: row.product, quantity: row.quantity })),
  });
  const persist = async () => (doc ? api.patch<MaterialIssue>(`/projects/issues/${doc.id}`, payload()) : api.post<MaterialIssue>("/projects/issues", payload()));
  const saveDraft = () => save.run(async () => { await persist(); onDone(); });
  const saveAndPost = () => save.run(async () => { const saved = await persist(); await api.post(`/projects/issues/${saved.id}/post`); onDone(); });
  const destroy = () => remove.run(async () => { if (!doc || !window.confirm("Delete this draft?")) return; await api.delete(`/projects/issues/${doc.id}`); onDone(); });

  const formId = "issue-form";
  return (
    <Drawer open large wide onClose={onDone} title={doc ? t("Draft material issue") : t("Materials to site")}
      footer={
        <div className="flex items-center gap-2">
          {doc && can("projects.issue.delete") ? <Button variant="danger" pending={remove.pending} onClick={destroy}>{t("Delete")}</Button> : null}
          <span className="flex-1" />
          <Button variant="secondary" onClick={onDone}>{t("Cancel")}</Button>
          <Button variant="secondary" type="submit" form={formId} pending={save.pending}>{t("Save draft")}</Button>
          {can("projects.issue.post") ? <Button pending={save.pending} onClick={saveAndPost} disabled={shown.length === 0}>{t("Issue to site")}</Button> : null}
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit(saveDraft)} className="profile-section flex flex-col gap-5 pb-6">
        <ErrorBanner error={save.error ?? remove.error} />
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <div className="sm:col-span-2">{doc ? <TextField label={t("Project")} value={`${doc.project_number} · ${doc.project_name}`} disabled /> : <ProjectPicker label={t("Project")} value={project} onChange={(picked) => { setProject(picked); setRows([]); }} error={save.field("project")} activeOnly />}</div>
          <SelectField label={t("From warehouse")} value={warehouseValue} onChange={(e) => setWarehouse(e.target.value)} error={save.field("warehouse")}>{warehouses.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}</SelectField>
          <TextField label={t("Date")} type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={save.field("date")} />
          <TextField label={t("Issued to")} value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)} hint="Site engineer or foreman." />
          <div className="sm:col-span-2"><TextAreaField label={t("Notes")} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-bold">{t("Materials")}</h3>
            <div className="w-72"><ProductPicker label="" value={extra} onChange={addExtra} /></div>
          </div>
          {shown.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line-strong px-4 py-5 text-center text-sm text-ink-soft">{project ? t("Nothing left on the BOQ to issue; search a product above to add one.") : t("Choose a project to list its BOQ stock items.")}</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full table-fixed text-sm">
                <colgroup><col className="w-[52%]" /><col /><col className="w-[18%]" /><col className="w-11" /></colgroup>
                <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase"><tr><th className="px-3 py-2.5 text-start font-medium">{t("Product")}</th><th className="px-3 py-2.5 text-end font-medium">{t("Left on BOQ")}</th><th className="px-3 py-2.5 text-end font-medium">{t("Issue now")}</th><th /></tr></thead>
                <tbody className="divide-y divide-line">
                  {shown.map((row, index) => (
                    <tr key={`${row.boq_line ?? "x"}-${row.product}-${index}`}>
                      <td className="px-3 py-2.5"><span className="font-medium">{row.label}</span>{row.boq_line === null ? <span className="ms-2 text-xs text-ink-soft">{t("not on BOQ")}</span> : null}</td>
                      <td className="px-3 py-2.5 text-end text-ink-soft tabular-nums">{row.remaining ?? "—"} {row.uom}</td>
                      <td className="px-2 py-2"><input aria-label={`${t("Issue now")} ${row.label}`} inputMode="decimal" value={row.quantity} onChange={(e) => update(index, e.target.value)} className={`${LINE_INPUT} text-end tabular-nums`} /></td>
                      <td className="px-1 py-2 text-center"><IconButton label={t("Remove line")} onClick={() => setRows(shown.filter((_, i) => i !== index))}><Trash2 aria-hidden className="size-4" /></IconButton></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {save.field("lines") ? <p className="text-sm text-danger">{save.field("lines")}</p> : null}
          <p className="text-xs text-ink-faint"><Plus aria-hidden className="inline size-3" /> {t("Issuing takes reserved stock first and books the cost to Installation materials.")}</p>
        </section>
      </form>
    </Drawer>
  );
}

function Viewer({ doc, onDone }: { doc: MaterialIssue; onDone: () => void }) {
  const { company, locale, t } = useWorkspace();
  return (
    <Drawer open large wide onClose={onDone} title={doc.number} action={<PurchaseStatus status={doc.status} posted="Issued" />}>
      <div className="profile-section flex flex-col gap-6 pb-6">
        <Facts items={[[t("Project"), `${doc.project_number} · ${doc.project_name}`], [t("Customer"), doc.customer_name], [t("Date"), formatDate(doc.date, locale)], [t("From warehouse"), doc.warehouse_name]]} />
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-soft">
          <span>{t("Cost")}: <span className="font-semibold text-ink tabular-nums">{formatMoney(doc.cost_total, company.currency, locale)}</span></span>
          {doc.issued_to ? <span>{t("Issued to")}: <span className="text-ink">{doc.issued_to}</span></span> : null}
          {doc.journal_number ? <span>{t("Journal entry")}: <span className="font-mono text-ink">{doc.journal_number}</span></span> : null}
        </div>
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase"><tr><th className="px-4 py-2.5 text-start font-medium">{t("Product")}</th><th className="px-3 py-2.5 text-end font-medium">{t("Quantity")}</th><th className="px-3 py-2.5 text-end font-medium">{t("Unit cost")}</th><th className="px-4 py-2.5 text-end font-medium">{t("Value")}</th></tr></thead>
            <tbody className="divide-y divide-line">
              {doc.lines.map((line) => (
                <tr key={line.id}><td className="px-4 py-2.5"><span className="font-mono text-xs text-ink-soft">{line.sku}</span> <span className="font-medium">{line.product_name}</span></td><td className="px-3 py-2.5 text-end font-semibold tabular-nums">{qty(line.quantity)} {line.uom}</td><td className="px-3 py-2.5 text-end tabular-nums">{formatMoney(line.unit_cost ?? "0", company.currency, locale)}</td><td className="px-4 py-2.5 text-end tabular-nums">{formatMoney(line.value ?? "0", company.currency, locale)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {doc.notes ? <p className="text-sm whitespace-pre-line">{doc.notes}</p> : null}
      </div>
    </Drawer>
  );
}

function IssuesList() {
  const { company, locale } = useWorkspace();
  const params = useSearchParams();
  const projectId = params.get("project");
  const preset = useResource<Project>(projectId ? `/projects/projects/${projectId}` : null);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const starter = preset.data && preset.data.id !== dismissed ? preset.data : null;
  return (
    <>
      <DocumentList<MaterialIssue>
        title="Materials to site"
        description="Stock taken from a warehouse to a project site. Posting takes the goods out of stock at average cost and books them as project material cost."
        endpoint="/projects/issues"
        createPermission="projects.issue.create"
        newLabel="New issue"
        statuses={[["draft", "Draft"], ["posted", "Issued"]]}
        columns={[
          { label: "Date", render: (row) => <span className="tabular-nums">{formatDate(row.date, locale)}</span> },
          { label: "Number", render: (row) => <span className="font-mono text-xs">{row.number || "—"}</span> },
          { label: "Project", render: (row) => <span><span className="block font-medium">{row.project_name}</span><span className="block font-mono text-xs text-ink-soft">{row.project_number}</span></span> },
          { label: "Warehouse", render: (row) => row.warehouse_name },
          { label: "Lines", render: (row) => row.lines.length, align: "end" },
          { label: "Cost", render: (row) => <span className="tabular-nums">{formatMoney(row.cost_total, company.currency, locale)}</span>, align: "end" },
          { label: "Status", render: (row) => <PurchaseStatus status={row.status} posted="Issued" /> },
        ]}
        renderOpen={(open, close) => (open === "new" ? <Editor onDone={close} /> : open.status === "draft" ? <Editor key={open.id} doc={open} onDone={close} /> : <Viewer key={open.id} doc={open} onDone={close} />)}
      />
      {starter ? <Editor key={`from-${starter.id}`} presetProject={starter} onDone={() => { setDismissed(starter.id); window.history.replaceState(null, "", "/projects/issues"); }} /> : null}
    </>
  );
}

export default function IssuesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <IssuesList />
    </Suspense>
  );
}
