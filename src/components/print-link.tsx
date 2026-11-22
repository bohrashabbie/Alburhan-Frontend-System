"use client";

import { Printer } from "lucide-react";

import { useWorkspace } from "@/lib/workspace";

/** Opens the A4 print of a sales document in a new tab (print, or "Save as PDF"). */
export function PrintLink({ kind, id }: { kind: "quotation" | "invoice" | "delivery"; id: number }) {
  const { t } = useWorkspace();
  return (
    <a
      href={`/print/${kind}/${id}`}
      target="_blank"
      rel="noopener"
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 text-sm font-medium text-ink hover:bg-surface-muted"
    >
      <Printer aria-hidden className="size-4" />
      {t("Print / PDF")}
    </a>
  );
}
