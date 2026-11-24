"use client";

import { ActiveBadge, ResourcePage } from "@/components/resource-page";
import { formatDate } from "@/lib/format";
import type { Coupon } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export default function CouponsPage() {
  const { company, locale } = useWorkspace();
  return (
    <ResourcePage<Coupon>
      title="Coupons"
      description="A discount the cashier gives by typing a code at the till. A coupon is approved by whoever creates it, so it may be above the cashier's own discount limit."
      endpoint="/pos/coupons"
      permission="pos.coupon"
      noun="coupon"
      query={{ company: company.id }}
      columns={[
        { label: "Code", render: (row) => <span className="font-mono text-sm font-medium">{row.code}</span> },
        { label: "Discount %", render: (row) => <span className="tabular-nums">{Number(row.discount_percent)}%</span> },
        { label: "Valid until", render: (row) => (row.valid_until ? formatDate(row.valid_until, locale) : "—") },
        { label: "Used", render: (row) => <span className="tabular-nums">{row.used_count}{row.max_uses !== null ? ` / ${row.max_uses}` : ""}</span> },
        { label: "Status", render: (row) => <ActiveBadge active={row.is_active} /> },
      ]}
      fields={[
        { name: "code", label: "Code", required: true, lockOnEdit: true },
        { name: "discount_percent", label: "Discount %", type: "number", required: true },
        { name: "valid_until", label: "Valid until", type: "date", nullable: true },
        { name: "max_uses", label: "How many times it can be used", type: "number", nullable: true, hint: "Empty = no limit." },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={(row) => ({ code: row?.code ?? "", discount_percent: row ? String(Number(row.discount_percent)) : "", valid_until: row?.valid_until ?? "", max_uses: row?.max_uses !== null && row?.max_uses !== undefined ? String(row.max_uses) : "", is_active: row?.is_active ?? true })}
      toPayload={() => ({ company: company.id })}
    />
  );
}
