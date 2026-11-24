"use client";

import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import type { Page, Unit } from "@/lib/types";
import { useResource } from "@/lib/hooks";
import { useWorkspace } from "@/lib/workspace";

export default function UnitsPage() {
  const { name, t } = useWorkspace();
  const units = useResource<Page<Unit>>("/catalog/units?page_size=200");

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
        { label: "Base unit", render: (row) => (row.base_unit_code ? `1 ${row.code} = ${Number(row.factor)} ${row.base_unit_code}` : "—") },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "code", label: "Code", required: true, lockOnEdit: true, hint: "Short, e.g. PCS or M." },
        { name: "name", label: "Name", required: true },
        { name: "name_ar", label: "Name (Arabic)" },
        { name: "allow_decimal", label: "Can be sold in fractions (e.g. 2.5 m)", type: "checkbox" },
        { name: "base_unit", label: "Base unit", type: "select", nullable: true, options: (units.data?.results ?? []).map((unit) => [String(unit.id), `${unit.code} · ${name(unit)}`]), hint: "The smaller unit this one is made of, e.g. a box is made of pieces." },
        { name: "factor", label: "How many base units in one", type: "number", hint: "e.g. 12 pieces in a box." },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={(row) => ({
        code: row?.code ?? "",
        name: row?.name ?? "",
        name_ar: row?.name_ar ?? "",
        allow_decimal: row?.allow_decimal ?? false,
        base_unit: row?.base_unit ? String(row.base_unit) : "",
        factor: row ? String(Number(row.factor)) : "1",
        is_active: row?.is_active ?? true,
      })}
    />
  );
}
