"use client";

import { Badge } from "@/components/ui";
import { useResource } from "@/lib/hooks";
import type { Page, StockStatus, Warehouse } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export const STOCK_STATUSES: [StockStatus, string][] = [
  ["available", "Available"],
  ["in_transit", "In transit"],
  ["damaged", "Damaged"],
  ["returned", "Returned"],
];

/** Active warehouses of the current company, limited to the user's branch where applicable. */
export function useWarehouses() {
  const { company, branch, companyWide, branches } = useWorkspace();
  const { data } = useResource<Page<Warehouse>>(
    `/organization/warehouses?company=${company.id}&is_active=true&page_size=200`,
  );
  const all = data?.results ?? [];
  if (companyWide && !branch) return all;
  // A chosen branch (or a branch-only user) works with that branch's warehouses plus company-level ones.
  const allowed = new Set(branch ? [branch.id] : branches.map((item) => item.id));
  return all.filter((item) => item.branch === null || allowed.has(item.branch));
}

/** "12" for whole units, "2.5" for fractions: trims the API's 4 fixed decimals. */
export function qty(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const text = String(value);
  if (!text.includes(".")) return text;
  const trimmed = text.replace(/\.?0+$/, "");
  return trimmed === "" || trimmed === "-" ? "0" : trimmed;
}

export function DocStatus({ status }: { status: string }) {
  const { t } = useWorkspace();
  const tone =
    status === "posted" || status === "received" || status === "active"
      ? "success"
      : status === "in_transit" || status === "partial"
        ? "warning"
        : "neutral";
  const label: Record<string, string> = {
    draft: "Draft",
    posted: "Posted",
    in_transit: "In transit",
    partial: "Partly received",
    received: "Received",
    active: "Active",
    released: "Released",
    fulfilled: "Fulfilled",
  };
  return <Badge tone={tone}>{t(label[status] ?? status)}</Badge>;
}

export const LINE_INPUT =
  "h-9 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-2.5 text-sm placeholder:text-ink-faint disabled:bg-surface-muted disabled:text-ink-soft";
