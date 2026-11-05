"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { DocumentList } from "@/components/document-list";
import { Loading } from "@/components/ui";
import { WorkOrderEditor, WorkOrderViewer } from "@/components/work-order";
import { formatDate } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import { qty } from "@/lib/inventory";
import { JOB_STATUSES, JobStatusBadge } from "@/lib/projects";
import type { Project, WorkOrder } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

function Opened({ doc, onDone }: { doc: WorkOrder; onDone: () => void }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <WorkOrderEditor doc={doc} onDone={onDone} />;
  return <WorkOrderViewer doc={doc} onDone={onDone} onEdit={() => setEditing(true)} />;
}

function WorkOrdersList() {
  const { locale } = useWorkspace();
  const params = useSearchParams();
  const projectId = params.get("project");
  const openId = params.get("open");
  const preset = useResource<Project>(projectId ? `/projects/projects/${projectId}` : null);
  const requested = useResource<WorkOrder>(openId ? `/installation/work-orders/${openId}` : null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const starter = preset.data && dismissed !== `p${preset.data.id}` ? preset.data : null;
  const initial = requested.data && dismissed !== `o${requested.data.id}` ? requested.data : null;
  const clear = (key: string) => { setDismissed(key); window.history.replaceState(null, "", "/installation/work-orders"); };
  return (
    <>
      <DocumentList<WorkOrder>
        title="Work orders"
        description="Installation jobs for showroom sales and projects: who goes where and when, what was done, and what it cost."
        endpoint="/installation/work-orders"
        createPermission="installation.work_order.create"
        newLabel="New job"
        statuses={JOB_STATUSES}
        columns={[
          { label: "When", render: (row) => <span className="tabular-nums">{formatDate(row.scheduled_date, locale)}{row.scheduled_time ? ` · ${row.scheduled_time.slice(0, 5)}` : ""}</span> },
          { label: "Number", render: (row) => <span className="font-mono text-xs">{row.number}</span> },
          { label: "Job", render: (row) => <span><span className="block font-medium">{row.title}</span><span className="block text-xs text-ink-soft">{row.customer_name}{row.project_number ? ` · ${row.project_number}` : ""}</span></span> },
          { label: "Technicians", render: (row) => row.technician_names.join(", ") || <span className="text-ink-faint">—</span> },
          { label: "Hours", render: (row) => <span className="tabular-nums">{row.status === "completed" ? qty(row.labour_hours) : qty(row.duration_hours)}</span>, align: "end" },
          { label: "Status", render: (row) => <JobStatusBadge status={row.status} /> },
        ]}
        renderOpen={(open, close) => (open === "new" ? <WorkOrderEditor onDone={close} /> : <Opened key={open.id} doc={open} onDone={close} />)}
      />
      {starter ? <WorkOrderEditor key={`p-${starter.id}`} presetProject={starter} onDone={() => clear(`p${starter.id}`)} /> : null}
      {initial ? <Opened key={`o-${initial.id}`} doc={initial} onDone={() => clear(`o${initial.id}`)} /> : null}
    </>
  );
}

export default function WorkOrdersPage() {
  return (
    <Suspense fallback={<Loading />}>
      <WorkOrdersList />
    </Suspense>
  );
}
