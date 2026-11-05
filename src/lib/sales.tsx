"use client";

import { Badge } from "@/components/ui";
import { useResource } from "@/lib/hooks";
import type { Journal, Page } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const LABELS: Record<string, [string, "neutral" | "success" | "warning" | "danger"]> = {
  draft: ["Draft", "neutral"],
  sent: ["Sent", "warning"],
  accepted: ["Accepted", "success"],
  invoiced: ["Invoiced", "success"],
  expired: ["Expired", "neutral"],
  cancelled: ["Cancelled", "danger"],
  posted: ["Unpaid", "warning"],
  partially_paid: ["Partly paid", "warning"],
  paid: ["Paid", "success"],
};

export function SalesStatus({ status, posted = "Posted" }: { status: string; posted?: string }) {
  const { t } = useWorkspace();
  const [label, tone] = LABELS[status] ?? [status, "neutral"];
  // Delivery notes, receipts and credit notes call a posted document by its own name.
  const text = status === "posted" && posted !== "Unpaid" ? posted : label;
  return <Badge tone={status === "posted" && posted !== "Unpaid" ? "success" : tone}>{t(text)}</Badge>;
}

export function DeliveryStatus({ status }: { status: string }) {
  const { t } = useWorkspace();
  if (status === "not_required") return <span className="text-ink-faint">—</span>;
  const map: Record<string, [string, "neutral" | "success" | "warning"]> = {
    pending: ["Not delivered", "neutral"],
    partial: ["Partly delivered", "warning"],
    delivered: ["Delivered", "success"],
  };
  const [label, tone] = map[status] ?? [status, "neutral"];
  return <Badge tone={tone}>{t(label)}</Badge>;
}

export const METHODS: [string, string][] = [
  ["cash", "Cash"],
  ["knet", "KNET"],
  ["card", "Card"],
  ["bank_transfer", "Bank transfer"],
  ["cheque", "Cheque"],
];

/** Cash and bank journals of the current company, for receipts. */
export function useMoneyJournals() {
  const { company } = useWorkspace();
  const { data } = useResource<Page<Journal>>(`/accounting/journals?company=${company.id}&is_active=true&page_size=100`);
  return (data?.results ?? []).filter((journal) => journal.journal_type === "cash" || journal.journal_type === "bank");
}

export const today = () => new Date().toLocaleDateString("en-CA");
