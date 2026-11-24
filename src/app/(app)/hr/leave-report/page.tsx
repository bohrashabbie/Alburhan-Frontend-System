"use client";

import { Download, Printer } from "lucide-react";
import { useState } from "react";

import { Button, EmptyState, ErrorBanner, Loading, PageHeader, SelectField } from "@/components/ui";
import { withQuery } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { days } from "@/lib/hr";
import type { Department, LeaveReportRow, Page } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const LOW = 5; // days left at or under this are highlighted

function csv(rows: LeaveReportRow[], year: number) {
  const head = ["Employee number", "PF number", "Name", "Job title", "Department", "Store", "Entitled", "Taken", "Pending", "Remaining", "Other leave", "Unpaid leave", "Absent", "Late", "Half days"];
  const cell = (value: string | number | null) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [head.map(cell).join(","), ...rows.map((row) => [row.number, row.pf_number, row.name, row.job_title, row.department_name, row.branch_name, row.entitled, row.annual_taken, row.annual_pending, row.remaining, row.other_leave, row.unpaid_leave, row.absent, row.late, row.half_day].map(cell).join(","))];
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
  link.download = `leave-and-absence-${year}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function LeaveReportPage() {
  const { branches, company, name, t } = useWorkspace();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [branch, setBranch] = useState("");
  const [department, setDepartment] = useState("");
  const departments = useResource<Page<Department>>(`/hr/departments?company=${company.id}&page_size=200`);
  const report = useResource<{ year: number; rows: LeaveReportRow[] }>(withQuery("/hr/leave-report", { company: company.id, year, branch, department }));
  const rows = report.data?.rows ?? [];
  const totals = {
    people: rows.length,
    taken: rows.reduce((sum, row) => sum + Number(row.annual_taken), 0),
    absent: rows.reduce((sum, row) => sum + row.absent, 0),
    low: rows.filter((row) => Number(row.remaining) <= LOW).length,
  };
  const num = "px-3 py-2.5 text-end tabular-nums";
  const dash = (value: string | number) => (Number(value) ? (typeof value === "number" ? value : days(value)) : <span className="text-ink-faint">—</span>);
  return (
    <>
      <PageHeader
        title={t("Leave and absence report")}
        description="Each employee's annual leave for the year (entitled, taken, waiting for approval, left), other leave taken, and the days marked absent, late or half day."
        actions={rows.length ? (
          <div className="flex gap-2 print:hidden">
            <Button variant="secondary" onClick={() => csv(rows, year)}><Download aria-hidden className="size-4" />{t("Excel / CSV")}</Button>
            <Button variant="secondary" onClick={() => window.print()}><Printer aria-hidden className="size-4" />{t("Print / PDF")}</Button>
          </div>
        ) : undefined}
      />
      <div className="mb-4 grid max-w-3xl gap-3 sm:grid-cols-3 print:hidden">
        <SelectField label={t("Year")} value={String(year)} onChange={(e) => setYear(Number(e.target.value))}>{[thisYear + 1, thisYear, thisYear - 1, thisYear - 2].map((item) => <option key={item} value={item}>{item}</option>)}</SelectField>
        <SelectField label={t("Store")} value={branch} onChange={(e) => setBranch(e.target.value)}><option value="">{t("All")}</option>{branches.map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}</SelectField>
        <SelectField label={t("Department")} value={department} onChange={(e) => setDepartment(e.target.value)}><option value="">{t("All")}</option>{(departments.data?.results ?? []).map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}</SelectField>
      </div>
      <ErrorBanner error={report.error} />
      {!report.data ? (report.error ? null : <Loading label={t("Loading…")} />) : rows.length === 0 ? (
        <EmptyState title={t("No employees here")} description={t("Add employees under HR → Employee.")} />
      ) : (
        <div className="print-sheet">
          <p className="mb-3 hidden text-lg font-semibold print:block">{t("Leave and absence report")} · {year}</p>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {([[t("Employees"), totals.people], [t("Annual leave taken"), days(String(totals.taken))], [t("Days absent"), totals.absent], [`${t("Low balance")} (≤ ${LOW})`, totals.low]] as [string, string | number][]).map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line bg-surface p-3"><p className="text-xs text-ink-soft">{label}</p><p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p></div>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[64rem] text-sm">
              <thead className="border-b border-line bg-surface-muted/60 text-xs tracking-wide text-ink-soft uppercase">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium" rowSpan={2}>{t("Employee")}</th>
                  <th className="px-3 py-2.5 text-start font-medium" rowSpan={2}>{t("Department")}</th>
                  <th className="border-s border-line px-3 pt-2.5 text-center font-medium" colSpan={4}>{t("Annual leave")} {year}</th>
                  <th className="border-s border-line px-3 pt-2.5 text-center font-medium" colSpan={2}>{t("Other leave")}</th>
                  <th className="border-s border-line px-3 pt-2.5 text-center font-medium" colSpan={3}>{t("Attendance")}</th>
                </tr>
                <tr>
                  <th className="border-s border-line px-3 pb-2.5 text-end font-medium">{t("Entitled")}</th>
                  <th className="px-3 pb-2.5 text-end font-medium">{t("Taken")}</th>
                  <th className="px-3 pb-2.5 text-end font-medium">{t("Pending")}</th>
                  <th className="px-3 pb-2.5 text-end font-medium">{t("Left")}</th>
                  <th className="border-s border-line px-3 pb-2.5 text-end font-medium">{t("Paid")}</th>
                  <th className="px-3 pb-2.5 text-end font-medium">{t("Unpaid")}</th>
                  <th className="border-s border-line px-3 pb-2.5 text-end font-medium">{t("Absent")}</th>
                  <th className="px-3 pb-2.5 text-end font-medium">{t("Late")}</th>
                  <th className="px-3 pb-2.5 text-end font-medium">{t("Half day")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => {
                  const left = Number(row.remaining);
                  return (
                    <tr key={row.employee}>
                      <td className="px-4 py-2.5">
                        <span className="block font-medium">{row.name}</span>
                        <span className="block text-xs text-ink-soft">{[row.number, row.pf_number ? `PF ${row.pf_number}` : null, row.job_title].filter(Boolean).join(" · ")}</span>
                      </td>
                      <td className="px-3 py-2.5"><span className="block">{row.department_name ?? "—"}</span><span className="block text-xs text-ink-soft">{row.branch_name}</span></td>
                      <td className={`${num} border-s border-line`} title={Number(row.adjustment) ? `${t("Adjusted")} ${Number(row.adjustment) > 0 ? "+" : ""}${days(row.adjustment)}` : undefined}>{days(row.entitled)}{Number(row.adjustment) ? <span className="text-xs text-ink-faint">*</span> : null}</td>
                      <td className={num}>{dash(row.annual_taken)}</td>
                      <td className={num}>{dash(row.annual_pending)}</td>
                      <td className={`${num} font-semibold ${left < 0 ? "text-danger" : left <= LOW ? "text-warning" : ""}`}>{days(row.remaining)}</td>
                      <td className={`${num} border-s border-line`}>{dash(row.other_leave)}</td>
                      <td className={num}>{dash(row.unpaid_leave)}</td>
                      <td className={`${num} border-s border-line ${row.absent ? "font-semibold text-danger" : ""}`}>{dash(row.absent)}</td>
                      <td className={num}>{dash(row.late)}</td>
                      <td className={num}>{dash(row.half_day)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink-soft">{t("* includes an adjustment (days carried over or used before the system). Pending leave is counted as used until it is decided.")}</p>
        </div>
      )}
    </>
  );
}
