"use client";

import { CountryLabel } from "@/components/country";
import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import { Badge } from "@/components/ui";
import type { Brand } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export default function BrandsPage() {
  const { name } = useWorkspace();

  return (
    <ResourcePage<Brand>
      title="Brands"
      description="MS Lighting (own factory) and the partner brands the group represents."
      endpoint="/catalog/brands"
      permission="catalog.brand"
      noun="brand"
      columns={[
        {
          label: "Name",
          render: (row) => (
            <span className="flex items-center gap-2 font-medium">
              {name(row)}
              {row.is_own_brand ? <Badge>Own brand</Badge> : null}
            </span>
          ),
        },
        { label: "Code", render: (row) => <span className="font-mono text-xs">{row.code}</span> },
        { label: "Country", render: (row) => <CountryLabel code={row.country} /> },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "name_ar", label: "Name (Arabic)" },
        { name: "code", label: "Code", required: true, lockOnEdit: true },
        { name: "country", label: "Country", type: "country", nullable: true },
        { name: "is_own_brand", label: "Made in our own factory", type: "checkbox" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={(row) => ({
        name: row?.name ?? "",
        name_ar: row?.name_ar ?? "",
        code: row?.code ?? "",
        country: row?.country ?? "",
        is_own_brand: row?.is_own_brand ?? false,
        is_active: row?.is_active ?? true,
      })}
    />
  );
}
