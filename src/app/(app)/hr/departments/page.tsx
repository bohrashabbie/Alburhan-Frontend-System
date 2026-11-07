"use client";

import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import type { Department } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export default function DepartmentsPage() {
  const { company, name } = useWorkspace();
  return (
    <ResourcePage<Department>
      title="Departments"
      description="Groups of employees, e.g. Showrooms, Warehouse, Projects, Accounts."
      endpoint="/hr/departments"
      permission="hr.department"
      noun="department"
      query={{ company: company.id }}
      columns={[
        { label: "Name", render: (row) => <span className="font-medium">{name(row)}</span> },
        { label: "Employees", render: (row) => <span className="tabular-nums">{row.employee_count}</span> },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "name_ar", label: "Name (Arabic)" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={(row) => ({ name: row?.name ?? "", name_ar: row?.name_ar ?? "", is_active: row?.is_active ?? true })}
      toPayload={() => ({ company: company.id })}
    />
  );
}
