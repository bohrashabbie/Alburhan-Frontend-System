"use client";

import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import type { Unit } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export default function UnitsPage() {
  const { name, t } = useWorkspace();

  return (
    <ResourcePage<Unit>
      title="Units"
      description="How products are counted and sold: pieces, metres of LED strip, hours of labour."
      endpoint="/catalog/units"
      permission="catalog.unit"
      noun="unit"
      columns={[
        { label: "Code", render: (row) => <span className="font-mono text-xs">{row.code}</span> },
        { label: "Name", render: (row) => <span className="font-medium">{name(row)}</span> },
        {
          label: "Fractions",
          render: (row) => (row.allow_decimal ? t("Allowed") : "—"),
        },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "code", label: "Code", required: true, lockOnEdit: true, hint: "Short, e.g. PCS or M." },
        { name: "name", label: "Name", required: true },
        { name: "name_ar", label: "Name (Arabic)" },
        { name: "allow_decimal", label: "Can be sold in fractions (e.g. 2.5 m)", type: "checkbox" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={(row) => ({
        code: row?.code ?? "",
        name: row?.name ?? "",
        name_ar: row?.name_ar ?? "",
        allow_decimal: row?.allow_decimal ?? false,
        is_active: row?.is_active ?? true,
      })}
    />
  );
}
