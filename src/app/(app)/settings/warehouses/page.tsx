"use client";

import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import type { Warehouse, WarehouseType } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const WAREHOUSE_TYPES: [WarehouseType, string][] = [
  ["main", "Main warehouse"],
  ["showroom", "Showroom stock"],
  ["transit", "In transit"],
  ["project_site", "Project site"],
];

export default function WarehousesPage() {
  const { company, branches, name } = useWorkspace();
  const typeName = Object.fromEntries(WAREHOUSE_TYPES);
  const branchName = (id: number | null) => {
    const branch = branches.find((item) => item.id === id);
    return branch ? name(branch) : "—";
  };

  return (
    <ResourcePage<Warehouse>
      title="Warehouses"
      description={`Places that hold stock for ${name(company)}, including goods in transit.`}
      endpoint="/organization/warehouses"
      permission="organization.warehouse"
      noun="warehouse"
      query={{ company: company.id }}
      columns={[
        { label: "Code", render: (row) => <span className="font-mono text-xs">{row.code}</span> },
        { label: "Name", render: (row) => <span className="font-medium">{name(row)}</span> },
        { label: "Type", render: (row) => typeName[row.warehouse_type] },
        { label: "Branch", render: (row) => branchName(row.branch) },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "code", label: "Code", required: true, lockOnEdit: true },
        { name: "warehouse_type", label: "Type", type: "select", required: true, options: WAREHOUSE_TYPES },
        { name: "name", label: "Name", required: true },
        { name: "name_ar", label: "Name (Arabic)" },
        {
          name: "branch",
          label: "Branch",
          type: "select",
          nullable: true,
          options: branches.map((item) => [String(item.id), name(item)]),
          hint: "Leave empty for a company-level warehouse.",
        },
        { name: "address", label: "Address", type: "textarea" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={(row) => ({
        code: row?.code ?? "",
        warehouse_type: row?.warehouse_type ?? "main",
        name: row?.name ?? "",
        name_ar: row?.name_ar ?? "",
        branch: row?.branch ? String(row.branch) : "",
        address: row?.address ?? "",
        is_active: row?.is_active ?? true,
      })}
      toPayload={() => ({ company: company.id })}
    />
  );
}
