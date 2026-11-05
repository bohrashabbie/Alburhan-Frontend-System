"use client";

import { useSWRConfig } from "swr";

import { FamilyPicker, useFamilies } from "@/components/family-picker";
import { PhotoThumb, PhotoUpload } from "@/components/photo-upload";
import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import { useAccounts } from "@/lib/accounting";
import { useResource } from "@/lib/hooks";
import type { Brand, Page, Product, Unit } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const TYPES: [Product["product_type"], string][] = [
  ["stock", "Stock item"],
  ["non_stock", "Non-stock item"],
  ["service", "Service"],
];
const APPLICATIONS: [Product["application"], string][] = [
  ["indoor", "Indoor"],
  ["outdoor", "Outdoor"],
  ["both", "Indoor & outdoor"],
];
const DIMMING: [string, string][] = [
  ["none", "Non-dimmable"],
  ["triac", "TRIAC / phase"],
  ["0_10v", "0-10V"],
  ["dali", "DALI"],
  ["dali2", "DALI-2"],
  ["casambi", "Casambi"],
  ["dmx", "DMX"],
  ["other", "Other"],
];

/** "10W · 950lm · 3000K · CRI 90 · IP44" — the specs people scan a list for. */
function specLine(product: Product) {
  return [
    product.wattage ? `${Number(product.wattage)}W` : "",
    product.lumens ? `${product.lumens}lm` : "",
    product.cct,
    product.cri ? `CRI ${product.cri}` : "",
    product.beam_angle,
    product.ip_rating,
  ]
    .filter(Boolean)
    .join(" · ");
}

const text = (value: string | number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

export default function ProductsPage() {
  const { can, name } = useWorkspace();
  const { mutate } = useSWRConfig();
  const families = useFamilies();
  const refresh = () => mutate((key) => typeof key === "string" && key.startsWith("/catalog/products"));
  const brands = useResource<Page<Brand>>("/catalog/brands?page_size=500&is_active=true");
  const units = useResource<Page<Unit>>("/catalog/units?page_size=500&is_active=true");
  const accounts = useAccounts().filter((item) => !item.is_group && item.is_active);
  const accountOptions = (types: string[]): [string, string][] => accounts.filter((item) => types.includes(item.account_type)).map((item) => [String(item.id), `${item.code} ${item.name}`]);
  const options = <T extends { id: number; name: string; name_ar?: string }>(data?: Page<T>) =>
    (data?.results ?? []).map((item) => [String(item.id), name(item)] as [string, string]);
  const categoryOptions = families.map((item) => [String(item.id), name(item)] as [string, string]);
  const brandOptions = options(brands.data);
  const unitOptions = (units.data?.results ?? []).map(
    (item) => [String(item.id), `${item.code} · ${name(item)}`] as [string, string],
  );

  return (
    <ResourcePage<Product>
      title="Products"
      description="Every item the group sells, with its lighting specification. Shared by all companies; prices are set per company in price lists."
      endpoint="/catalog/products"
      permission="catalog.product"
      noun="product"
      wide
      filters={[
        { name: "category", label: "Family", options: categoryOptions },
        { name: "brand", label: "Brand", options: brandOptions },
        { name: "product_type", label: "Type", options: TYPES },
      ]}
      columns={[
        {
          label: "Product",
          render: (row) => (
            <span className="flex items-center gap-3">
              <PhotoThumb url={row.image_url} name={row.name} size="size-12" />
              <span className="min-w-0">
                <span className="block font-medium">{name(row)}</span>
                <span className="block font-mono text-xs text-ink-soft">{row.sku}</span>
                <span className="block text-xs text-ink-soft tabular-nums">{specLine(row) || "—"}</span>
              </span>
            </span>
          ),
        },
        { label: "Family", render: (row) => row.category_name },
        { label: "Brand", render: (row) => row.brand_name ?? "—" },
        { label: "Unit", render: (row) => row.uom_code },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "sku", label: "SKU", required: true, section: "General", hint: "Unique code, e.g. MS-DL-R01-10W." },
        { name: "model_code", label: "Model", hint: "Groups variants of one model, e.g. MS-DL-R01." },
        { name: "name", label: "Name", required: true },
        { name: "name_ar", label: "Name (Arabic)" },
        {
          name: "category",
          label: "Family",
          type: "custom",
          required: true,
          render: ({ value, onChange, error, disabled, label }) => (
            <FamilyPicker label={label} value={String(value ?? "")} onChange={onChange} error={error} disabled={disabled} />
          ),
        },
        { name: "brand", label: "Brand", type: "select", nullable: true, options: brandOptions },
        { name: "product_type", label: "Type", type: "select", required: true, options: TYPES },
        { name: "uom", label: "Unit", type: "select", required: true, options: unitOptions },
        { name: "barcode", label: "Barcode", nullable: true },
        { name: "application", label: "Use", type: "select", required: true, options: APPLICATIONS },
        { name: "description", label: "Description", type: "textarea" },

        { name: "wattage", label: "Power (W)", type: "number", nullable: true, section: "Lighting specification" },
        { name: "lumens", label: "Luminous flux (lm)", type: "number", nullable: true },
        { name: "cct", label: "Colour temperature", hint: "e.g. 3000K or 2700-6500K" },
        { name: "cri", label: "CRI", type: "number", nullable: true, hint: "0–100" },
        { name: "beam_angle", label: "Beam angle", hint: "e.g. 24° or 15/24/36°" },
        { name: "ip_rating", label: "IP rating", hint: "e.g. IP20, IP44, IP65" },
        { name: "ik_rating", label: "IK rating", hint: "e.g. IK08" },
        { name: "input_voltage", label: "Input voltage", hint: "e.g. 220-240V AC" },
        { name: "dimming", label: "Dimming", type: "select", required: true, options: DIMMING },
        { name: "driver", label: "Driver", hint: "e.g. Meanwell" },
        { name: "led_source", label: "LED source", hint: "e.g. Cree, Osram" },
        { name: "finish", label: "Finish / colour" },
        { name: "body_material", label: "Body material" },
        { name: "dimensions", label: "Dimensions", hint: "e.g. Ø90 × 55 mm" },
        { name: "cutout", label: "Cut-out", hint: "e.g. Ø75 mm" },
        { name: "weight_kg", label: "Weight (kg)", type: "number", nullable: true },
        { name: "lifetime_hours", label: "Lifetime (hours)", type: "number", nullable: true },
        { name: "warranty_months", label: "Warranty (months)", type: "number", nullable: true },

        { name: "notes", label: "Internal notes", type: "textarea", section: "Other" },
        { name: "income_account", label: "Income account", type: "select", nullable: true, section: "Accounting", options: [["", "Company sales account"], ...accountOptions(["income"])], hint: "Credited when sold, e.g. Installation income. Applies in the current company." },
        { name: "expense_account", label: "Expense account", type: "select", nullable: true, options: [["", "Freight and customs (default)"], ...accountOptions(["expense"])], hint: "Debited when bought as a service or expense." },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={(row) => ({
        sku: row?.sku ?? "",
        model_code: row?.model_code ?? "",
        name: row?.name ?? "",
        name_ar: row?.name_ar ?? "",
        category: text(row?.category),
        brand: text(row?.brand),
        product_type: row?.product_type ?? "stock",
        uom: text(row?.uom ?? unitOptions.find(([, label]) => label.startsWith("PCS"))?.[0]),
        barcode: row?.barcode ?? "",
        application: row?.application ?? "indoor",
        description: row?.description ?? "",
        wattage: text(row?.wattage),
        lumens: text(row?.lumens),
        cct: row?.cct ?? "",
        cri: text(row?.cri),
        beam_angle: row?.beam_angle ?? "",
        ip_rating: row?.ip_rating ?? "",
        ik_rating: row?.ik_rating ?? "",
        input_voltage: row?.input_voltage ?? "",
        dimming: row?.dimming ?? "none",
        driver: row?.driver ?? "",
        led_source: row?.led_source ?? "",
        finish: row?.finish ?? "",
        body_material: row?.body_material ?? "",
        dimensions: row?.dimensions ?? "",
        cutout: row?.cutout ?? "",
        weight_kg: text(row?.weight_kg),
        lifetime_hours: text(row?.lifetime_hours),
        warranty_months: text(row?.warranty_months),
        notes: row?.notes ?? "",
        income_account: row?.income_account ? String(row.income_account) : "",
        expense_account: row?.expense_account ? String(row.expense_account) : "",
        is_active: row?.is_active ?? true,
      })}
      drawerExtra={(row) => (
        <PhotoUpload
          endpoint={`/catalog/products/${row.id}/image`}
          name={row.name}
          initialUrl={row.image_url}
          canEdit={can("catalog.product.update")}
          onChanged={refresh}
          title="Photo"
          hint="PNG, JPEG or WebP, up to 2 MB. Upload a file or take a photo with the camera. Save the product first, then add its photo."
        />
      )}
    />
  );
}
