"use client";

import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import type { Branch, BranchType } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const BRANCH_TYPES: [BranchType, string][] = [
  ["head_office", "Head office"],
  ["showroom", "Showroom"],
  ["projects", "Projects office"],
  ["warehouse", "Warehouse site"],
  ["factory", "Factory"],
  ["office", "Office"],
];

export default function BranchesPage() {
  const { company, name } = useWorkspace();
  const typeName = Object.fromEntries(BRANCH_TYPES);

  return (
    <ResourcePage<Branch>
      title="Branches"
      description={`Showrooms and offices of ${name(company)}.`}
      endpoint="/organization/branches"
      permission="organization.branch"
      noun="branch"
      query={{ company: company.id }}
      columns={[
        { label: "Code", render: (row) => <span className="font-mono text-xs">{row.code}</span> },
        { label: "Name", render: (row) => <span className="font-medium">{name(row)}</span> },
        { label: "Type", render: (row) => typeName[row.branch_type] },
        { label: "Phone", render: (row) => row.phone || "—" },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "code", label: "Code", required: true, lockOnEdit: true },
        { name: "branch_type", label: "Type", type: "select", required: true, options: BRANCH_TYPES },
        { name: "name", label: "Name", required: true },
        { name: "name_ar", label: "Name (Arabic)" },
        { name: "phone", label: "Phone" },
        { name: "email", label: "Email", type: "email" },
        { name: "address", label: "Address", type: "textarea" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={(row) => ({
        code: row?.code ?? "",
        branch_type: row?.branch_type ?? "showroom",
        name: row?.name ?? "",
        name_ar: row?.name_ar ?? "",
        phone: row?.phone ?? "",
        email: row?.email ?? "",
        address: row?.address ?? "",
        is_active: row?.is_active ?? true,
      })}
      toPayload={() => ({ company: company.id })}
    />
  );
}
