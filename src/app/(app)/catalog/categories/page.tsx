"use client";

import { useSWRConfig } from "swr";

import { PhotoThumb, PhotoUpload } from "@/components/photo-upload";
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
  const { can, name } = useWorkspace();
  const { mutate } = useSWRConfig();
  const all = useResource<Page<ProductCategory>>("/catalog/categories?page_size=500");
  const groupName = Object.fromEntries(GROUPS);
  const parents = (all.data?.results ?? []).map(
    (item) => [String(item.id), name(item)] as [string, string],
  );
  const refresh = () => mutate((key) => typeof key === "string" && key.startsWith("/catalog/categories"));

  return (
    <ResourcePage<ProductCategory>
      title="Product families"
      description="Groups of products such as Recessed Down Light or Flood Light, with a photo so they're easy to recognise. Shared by every company."
      endpoint="/catalog/categories"
      permission="catalog.category"
      noun="product family"
      filters={[{ name: "group", label: "Group", options: GROUPS }]}
      columns={[
        {
          label: "Family",
          render: (row) => (
            <span className="flex items-center gap-3">
              <PhotoThumb url={row.image_url} name={row.name} size="size-11" />
              <span className="min-w-0">
                <span className="block font-medium">{name(row)}</span>
                <span className="block font-mono text-xs text-ink-soft">{row.code}</span>
              </span>
            </span>
          ),
        },
        { label: "Group", render: (row) => groupName[row.group] },
        { label: "Products", render: (row) => <span className="tabular-nums">{row.product_count}</span> },
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
      drawerExtra={(row) => (
        <PhotoUpload
          endpoint={`/catalog/categories/${row.id}/image`}
          name={row.name}
          initialUrl={row.image_url}
          canEdit={can("catalog.category.update")}
          onChanged={refresh}
          title="Photo"
          hint="Shown in lists and when choosing a family for a product. Save the family first, then add its photo."
        />
      )}
    />
  );
}
