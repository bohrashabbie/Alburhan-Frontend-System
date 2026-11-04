"use client";

import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import { useResource } from "@/lib/hooks";
import type { CategoryGroup, Page, ProductCategory } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const GROUPS: [CategoryGroup, string][] = [
  ["indoor", "Indoor"],
  ["outdoor", "Outdoor"],
  ["magnetic_linear", "Magnetic & linear"],
  ["accessory", "Accessories & drivers"],
  ["service", "Services"],
];

export default function CategoriesPage() {
  const { name } = useWorkspace();
  const all = useResource<Page<ProductCategory>>("/catalog/categories?page_size=200");
  const groupName = Object.fromEntries(GROUPS);
  const parents = (all.data?.results ?? []).map(
    (item) => [String(item.id), name(item)] as [string, string],
  );

  return (
    <ResourcePage<ProductCategory>
      title="Product families"
      description="Groups of products such as Recessed Down Light or Flood Light. Shared by every company."
      endpoint="/catalog/categories"
      permission="catalog.category"
      noun="product family"
      filters={[{ name: "group", label: "Group", options: GROUPS }]}
      columns={[
        { label: "Name", render: (row) => <span className="font-medium">{name(row)}</span> },
        { label: "Group", render: (row) => groupName[row.group] },
        {
          label: "Products",
          render: (row) => <span className="tabular-nums">{row.product_count}</span>,
        },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "name_ar", label: "Name (Arabic)" },
        { name: "code", label: "Code", required: true, lockOnEdit: true, hint: "Lowercase with dashes, e.g. flood-light." },
        { name: "group", label: "Group", type: "select", required: true, options: GROUPS },
        { name: "parent", label: "Inside family", type: "select", nullable: true, options: parents, hint: "Optional, for sub-families." },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={(row) => ({
        name: row?.name ?? "",
        name_ar: row?.name_ar ?? "",
        code: row?.code ?? "",
        group: row?.group ?? "indoor",
        parent: row?.parent ? String(row.parent) : "",
        is_active: row?.is_active ?? true,
      })}
    />
  );
}
