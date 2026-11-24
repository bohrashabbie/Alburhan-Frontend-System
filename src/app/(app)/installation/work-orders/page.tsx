"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { DocumentList } from "@/components/document-list";
import { Loading, SelectField } from "@/components/ui";
import { WorkOrderEditor, WorkOrderViewer, whenText } from "@/components/work-order";
import { formatDate } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import { JOB_STATUSES, JobStatusBadge } from "@/lib/projects";
import type { Project, WorkOrder } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const VIEWS: Record<string, [string, Record<string, string>]> = {
  "": ["All requests", {}],
  open: ["Still open", { open: "true" }],
  mine: ["My jobs", { mine: "true", open: "true" }],
  sign: ["Awaiting signature", { awaiting_signature: "true" }],
};

function Opened({ doc, onDone }: { doc: WorkOrder; onDone: () => void }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <WorkOrderEditor doc={doc} onDone={onDone} />;
  return <WorkOrderViewer doc={doc} onDone={onDone} onEdit={() => setEditing(true)} />;
}

function RequestsList() {
  const { can, locale, t } = useWorkspace();
  const params = useSearchParams();
  const projectId = params.get("project");
  const preset = useResource<Project>(projectId ? `/projects/projects/${projectId}` : null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [view, setView] = useState(params.get("view") ?? "");
  const starter = preset.data && dismissed !== `p${preset.data.id}` ? preset.data : null;
  const clear = (key: string) => { setDismissed(key); window.history.replaceState(null, "", "/installation/work-orders"); };
  const views = Object.entries(VIEWS).filter(([key]) => key !== "mine" || can("installation.work_order.complete"));
  return (
    <>
      <DocumentList<WorkOrder>
        title="Installation requests"
        description="Staff send a request with the customer and site; the installation supervisor sets the date, time and technicians; the technician completes it and the customer signs."
        endpoint="/installation/work-orders"
        createPermission="installation.work_order.create"
        newLabel="New request"
        statuses={JOB_STATUSES}
        query={VIEWS[view]?.[1]}
        extraFilters={<SelectField label={t("Show")} value={view} onChange={(e) => setView(e.target.value)}>{views.map(([key, [label]]) => <option key={key} value={key}>{t(label)}</option>)}</SelectField>}
        columns={[
          { label: "Number", render: (row) => <span className="font-mono text-xs">{row.number}</span> },
          { label: "Job", render: (row) => <span><span className="block font-medium">{row.title}</span><span className="block text-xs text-ink-soft">{row.customer_name}{row.site_address ? ` · ${row.site_address.split("\n")[0]}` : ""}</span></span> },
          { label: "When", render: (row) => row.scheduled_date ? <span className="tabular-nums">{whenText(row, locale)}</span> : <span className="text-ink-soft">{t("Not scheduled yet")}{row.requested_date ? <span className="block text-xs">{t("Preferred")}: {formatDate(row.requested_date, locale)}</span> : null}</span> },
          { label: "Technicians", render: (row) => row.technician_names.join(", ") || <span className="text-ink-faint">—</span> },
          { label: "Status", render: (row) => <JobStatusBadge status={row.status} awaitingSignature={row.awaiting_signature} /> },
        ]}
        renderOpen={(open, close) => (open === "new" ? <WorkOrderEditor onDone={close} /> : <Opened key={open.id} doc={open} onDone={close} />)}
      />
      {starter ? <WorkOrderEditor key={`p-${starter.id}`} presetProject={starter} onDone={() => clear(`p${starter.id}`)} /> : null}
    </>
  );
}

export default function InstallationRequestsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <RequestsList />
    </Suspense>
  );
}
