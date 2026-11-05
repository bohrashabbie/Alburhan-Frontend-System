"use client";

import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Badge } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import type { Page, Project, ProjectStatus, Technician, WorkOrderStatus } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export const PROJECT_STATUSES: [ProjectStatus, string][] = [
  ["lead", "Lead"],
  ["quoted", "Quoted"],
  ["won", "Won"],
  ["in_progress", "In progress"],
  ["completed", "Completed"],
  ["closed", "Closed"],
  ["lost", "Lost"],
];

/** Where a project can go next (mirrors the backend rules). */
export const NEXT_STATUS: Record<ProjectStatus, ProjectStatus[]> = {
  lead: ["won", "lost"],
  quoted: ["won", "lost"],
  won: ["in_progress", "lost"],
  in_progress: ["completed"],
  completed: ["closed", "in_progress"],
  closed: [],
  lost: ["lead"],
};

const TONES: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  lead: "neutral", quoted: "warning", won: "success", in_progress: "warning", completed: "success", closed: "neutral", lost: "danger",
  scheduled: "warning", cancelled: "danger",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { t } = useWorkspace();
  const label = PROJECT_STATUSES.find(([value]) => value === status)?.[1] ?? status;
  return <Badge tone={TONES[status] ?? "neutral"}>{t(label)}</Badge>;
}

export const JOB_STATUSES: [WorkOrderStatus, string][] = [
  ["scheduled", "Scheduled"],
  ["in_progress", "In progress"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
];

export function JobStatusBadge({ status }: { status: WorkOrderStatus }) {
  const { t } = useWorkspace();
  const label = JOB_STATUSES.find(([value]) => value === status)?.[1] ?? status;
  return <Badge tone={TONES[status] ?? "neutral"}>{t(label)}</Badge>;
}

export function useTechnicians() {
  const { company } = useWorkspace();
  const { data } = useResource<Page<Technician>>(`/installation/technicians?company=${company.id}&is_active=true&page_size=200`);
  return data?.results ?? [];
}

/** Search the company's projects and pick one. */
export function ProjectPicker({ label, value, onChange, error, customerId, activeOnly = false }: { label: string; value: Project | null; onChange: (project: Project | null) => void; error?: string; customerId?: number | null; activeOnly?: boolean }) {
  const { company, name, t } = useWorkspace();
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = useResource<Page<Project>>(
    open ? withQuery("/projects/projects", { company: company.id, search: query.trim(), customer: customerId ?? undefined, active: activeOnly ? "true" : undefined, page_size: 8 }) : null,
  );
  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);
  return (
    <div ref={box} className="relative flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
      {value ? (
        <div className="flex h-10 items-center justify-between gap-2 rounded-lg border border-line-strong bg-surface px-3 text-sm">
          <span className="min-w-0 truncate"><span className="font-mono text-xs">{value.number}</span><span className="ms-2 font-medium">{name(value)}</span><span className="ms-2 text-ink-soft">{value.customer_name}</span></span>
          <button type="button" aria-label={t("Clear")} onClick={() => onChange(null)} className="rounded-md p-0.5 text-ink-soft hover:bg-surface-muted"><X aria-hidden className="size-4" /></button>
        </div>
      ) : (
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-ink-faint" />
          <input id={id} type="search" autoComplete="off" placeholder={t("Choose a project")} value={query} aria-invalid={Boolean(error)} onFocus={() => setOpen(true)} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} className="h-10 w-full rounded-lg border border-line-strong bg-surface ps-9 pe-3 text-sm placeholder:text-ink-faint aria-invalid:border-danger" />
        </div>
      )}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {open && !value ? (
        <ul role="listbox" className="absolute top-[4.25rem] z-30 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-lg">
          {!results.data ? <li className="px-3 py-2 text-sm text-ink-soft">{t("Loading…")}</li> : results.data.results.length === 0 ? <li className="px-3 py-2 text-sm text-ink-soft">{t("No projects found.")}</li> : results.data.results.map((project) => (
            <li key={project.id}>
              <button type="button" role="option" aria-selected={false} onClick={() => { onChange(project); setQuery(""); setOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-start text-sm hover:bg-surface-muted">
                <span className="font-mono text-xs">{project.number}</span><span className="ms-2 font-medium">{name(project)}</span>
                <span className="block text-xs text-ink-soft">{project.customer_name} · {project.site_address || "—"}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
