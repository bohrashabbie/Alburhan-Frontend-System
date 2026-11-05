"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";

import { Button, ErrorBanner, Loading, PageHeader, SelectField } from "@/components/ui";
import { WorkOrderEditor, WorkOrderViewer } from "@/components/work-order";
import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { qty } from "@/lib/inventory";
import { JobStatusBadge, useTechnicians } from "@/lib/projects";
import type { CalendarDay, WorkOrder } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const DAY = 24 * 60 * 60 * 1000;
const iso = (date: Date) => date.toLocaleDateString("en-CA");

function mondayOf(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  return copy;
}

export default function SchedulePage() {
  const { company, can, locale, name, t } = useWorkspace();
  const [start, setStart] = useState(() => mondayOf(new Date()));
  const [technician, setTechnician] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const technicians = useTechnicians();
  const end = new Date(start.getTime() + 13 * DAY);
  const days = useResource<CalendarDay[]>(withQuery("/installation/work-orders/calendar", { company: company.id, from: iso(start), to: iso(end) }));
  const opened = useResource<WorkOrder>(openId ? `/installation/work-orders/${openId}` : null);
  const byDate = Object.fromEntries((days.data ?? []).map((day) => [day.date, day.jobs]));
  const todayIso = iso(new Date());
  const techName = technicians.find((item) => String(item.id) === technician);
  const close = () => { setOpenId(null); setCreating(false); days.mutate(); };
  const weekLabel = (from: Date) => `${new Intl.DateTimeFormat(locale === "ar" ? "ar-KW-u-nu-latn" : "en-GB", { day: "numeric", month: "short" }).format(from)} – ${new Intl.DateTimeFormat(locale === "ar" ? "ar-KW-u-nu-latn" : "en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(from.getTime() + 6 * DAY))}`;

  return (
    <>
      <PageHeader title={t("Schedule")} description="Two weeks of installation jobs. Click a job to start, complete or bill it." actions={can("installation.work_order.create") ? <Button onClick={() => setCreating(true)}><Plus aria-hidden className="size-5" />{t("New job")}</Button> : null} />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1">
          <Button variant="secondary" className="h-10 px-3" aria-label={t("Previous week")} onClick={() => setStart(new Date(start.getTime() - 7 * DAY))}><ChevronLeft aria-hidden className="size-4 rtl:-scale-x-100" /></Button>
          <Button variant="secondary" className="h-10" onClick={() => setStart(mondayOf(new Date()))}>{t("This week")}</Button>
          <Button variant="secondary" className="h-10 px-3" aria-label={t("Next week")} onClick={() => setStart(new Date(start.getTime() + 7 * DAY))}><ChevronRight aria-hidden className="size-4 rtl:-scale-x-100" /></Button>
        </div>
        <div className="w-56"><SelectField label={t("Technician")} value={technician} onChange={(e) => setTechnician(e.target.value)}><option value="">{t("All")}</option>{technicians.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}</SelectField></div>
      </div>
      <ErrorBanner error={days.error} />
      {!days.data ? <Loading label={t("Loading…")} /> : (
        <div className="flex flex-col gap-4">
          {[0, 1].map((week) => {
            const from = new Date(start.getTime() + week * 7 * DAY);
            return (
              <section key={week} className="rounded-xl border border-line bg-surface">
                <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">{weekLabel(from)}</h2>
                <div className="grid grid-cols-2 divide-line sm:grid-cols-4 lg:grid-cols-7 lg:divide-x">
                  {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                    const date = new Date(from.getTime() + offset * DAY);
                    const key = iso(date);
                    const jobs = (byDate[key] ?? []).filter((job) => !techName || job.technicians.includes(techName.name));
                    const isToday = key === todayIso;
                    return (
                      <div key={key} className={`flex min-h-36 flex-col gap-1.5 p-2 ${offset >= 5 ? "bg-surface-muted/30" : ""}`}>
                        <div className={`flex items-baseline justify-between text-xs ${isToday ? "font-bold text-link" : "text-ink-soft"}`}>
                          <span>{new Intl.DateTimeFormat(locale === "ar" ? "ar-KW-u-nu-latn" : "en-GB", { weekday: "short" }).format(date)}</span>
                          <span className={`tabular-nums ${isToday ? "rounded-full bg-link px-1.5 text-white" : ""}`}>{date.getDate()}</span>
                        </div>
                        {jobs.map((job) => (
                          <button key={job.id} type="button" onClick={() => setOpenId(job.id)} className={`rounded-lg border p-2 text-start text-xs transition-colors hover:border-link ${job.status === "completed" ? "border-line bg-surface-muted/60 text-ink-soft" : job.status === "in_progress" ? "border-warning/40 bg-warning-soft" : "border-line bg-surface"}`}>
                            <span className="flex items-center justify-between gap-1"><span className="font-semibold tabular-nums">{job.time ?? "—"}</span><span className="text-ink-faint tabular-nums">{qty(job.duration_hours)} h</span></span>
                            <span className="mt-0.5 line-clamp-2 font-medium text-ink">{job.title}</span>
                            <span className="block truncate text-ink-soft">{job.customer_name}</span>
                            {job.technicians.length ? <span className="block truncate text-ink-faint">{job.technicians.join(", ")}</span> : null}
                            {job.status !== "scheduled" ? <span className="mt-1 block"><JobStatusBadge status={job.status} /></span> : null}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {creating ? <WorkOrderEditor onDone={close} /> : null}
      {openId && opened.data ? <WorkOrderViewer key={openId} doc={opened.data} onDone={close} /> : null}
    </>
  );
}
