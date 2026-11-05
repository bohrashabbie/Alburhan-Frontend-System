"use client";

import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import { Badge } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import type { Technician } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export default function TechniciansPage() {
  const { company, branches, locale, name, t } = useWorkspace();
  return (
    <ResourcePage<Technician>
      title="Technicians"
      description="The installation crew. Their hourly cost gives each completed job its labour cost."
      endpoint="/installation/technicians"
      permission="installation.technician"
      noun="technician"
      query={{ company: company.id }}
      columns={[
        { label: "Name", render: (row) => <span><span className="block font-medium">{name(row)}</span><span className="block text-xs text-ink-soft">{row.phone || "—"}</span></span> },
        { label: "Branch", render: (row) => row.branch_name ?? <span className="text-ink-faint">{t("Company")}</span> },
        { label: "Skills", render: (row) => row.skills || "—" },
        { label: "Hourly cost", render: (row) => <span className="tabular-nums">{formatMoney(row.hourly_cost, company.currency, locale)}</span> },
        { label: "Open jobs", render: (row) => (row.open_jobs ? <Badge tone="warning">{row.open_jobs}</Badge> : <span className="text-ink-faint">0</span>) },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "name_ar", label: "Name (Arabic)" },
        { name: "phone", label: "Phone" },
        { name: "branch", label: "Branch", type: "select", nullable: true, options: [["", t("Company")], ...branches.map((item): [string, string] => [String(item.id), name(item)])] },
        { name: "skills", label: "Skills", hint: "e.g. electrical, magnetic track, outdoor" },
        { name: "hourly_cost", label: `Hourly cost (${company.currency})`, type: "number", hint: "Internal cost, not what the customer pays." },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={(row) => ({
        name: row?.name ?? "",
        name_ar: row?.name_ar ?? "",
        phone: row?.phone ?? "",
        branch: row?.branch ? String(row.branch) : "",
        skills: row?.skills ?? "",
        hourly_cost: row ? String(Number(row.hourly_cost)) : "0",
        is_active: row?.is_active ?? true,
      })}
      toPayload={() => ({ company: company.id })}
    />
  );
}
