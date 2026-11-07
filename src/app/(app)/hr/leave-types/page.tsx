"use client";

import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import { Badge } from "@/components/ui";
import { days } from "@/lib/hr";
import type { LeaveType } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export default function LeaveTypesPage() {
  const { company, name, t } = useWorkspace();
  return (
    <ResourcePage<LeaveType>
      title="Leave types"
      description="The kinds of leave people can ask for. Unpaid days are deducted in the month's payroll."
      endpoint="/hr/leave-types"
      permission="hr.leave_type"
      noun="leave type"
      query={{ company: company.id }}
      columns={[
        { label: "Name", render: (row) => <span className="font-medium">{name(row)}</span> },
        { label: "Pay", render: (row) => (row.is_paid ? <Badge tone="success">{t("Paid")}</Badge> : <Badge tone="warning">{t("Unpaid")}</Badge>) },
        { label: "Days a year", render: (row) => (row.uses_annual_balance ? t("From annual balance") : Number(row.days_per_year) > 0 ? days(row.days_per_year) : t("No limit")) },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "name_ar", label: "Name (Arabic)" },
        { name: "code", label: "Code", required: true, lockOnEdit: true, hint: "Short, e.g. hajj" },
        { name: "is_paid", label: "Paid", type: "checkbox", hint: "Unpaid leave is deducted from pay." },
        { name: "uses_annual_balance", label: "Uses the annual leave balance", type: "checkbox" },
        { name: "days_per_year", label: "Days a year", type: "number", hint: "Limit for this type; 0 = no limit." },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={(row) => ({
        name: row?.name ?? "",
        name_ar: row?.name_ar ?? "",
        code: row?.code ?? "",
        is_paid: row?.is_paid ?? true,
        uses_annual_balance: row?.uses_annual_balance ?? false,
        days_per_year: row ? String(Number(row.days_per_year)) : "0",
        is_active: row?.is_active ?? true,
      })}
      toPayload={() => ({ company: company.id })}
    />
  );
}
