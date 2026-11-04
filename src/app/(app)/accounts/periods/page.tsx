"use client";

import { Lock, LockOpen } from "lucide-react";
import { useState } from "react";
import { useSWRConfig } from "swr";

import { ResourcePage } from "@/components/resource-page";
import { Badge, Button, ErrorBanner } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useAction } from "@/lib/hooks";
import type { Period } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

const refreshPeriods = (key: unknown) => typeof key === "string" && key.startsWith("/accounting/periods");

function CreateYear() {
  const { company, can, t } = useWorkspace();
  const { mutate } = useSWRConfig();
  const action = useAction();
  const year = new Date().getFullYear();
  if (!can("accounting.period.create")) return null;
  return (
    <>
      {[year, year + 1].map((value) => (
        <Button
          key={value}
          variant="secondary"
          pending={action.pending}
          onClick={() =>
            action.run(async () => {
              await api.post("/accounting/periods/generate", { company: company.id, year: value });
              await mutate(refreshPeriods);
            })
          }
        >
          {t("Months of")} {value}
        </Button>
      ))}
    </>
  );
}

function CloseControls({ period }: { period: Period }) {
  const { can, t } = useWorkspace();
  const { mutate } = useSWRConfig();
  const [status, setStatus] = useState(period.status);
  const action = useAction();
  if (!can("accounting.period.close")) return null;
  const run = (verb: "close" | "reopen") =>
    action.run(async () => {
      const updated = await api.post<Period>(`/accounting/periods/${period.id}/${verb}`);
      setStatus(updated.status);
      await mutate(refreshPeriods);
    });
  return (
    <section className="border-t border-line pt-6">
      <h3 className="text-base font-bold">{status === "open" ? t("Close period") : t("Reopen period")}</h3>
      <p className="mt-1 text-sm text-ink-soft">
        {status === "open"
          ? "Once closed, nothing can be posted or reversed into these dates. Draft entries must be posted or deleted first."
          : "Reopening lets entries be posted into these dates again."}
      </p>
      <div className="mt-4">
        <ErrorBanner error={action.error} />
      </div>
      <Button
        className="mt-3"
        variant={status === "open" ? "primary" : "secondary"}
        pending={action.pending}
        onClick={() => run(status === "open" ? "close" : "reopen")}
      >
        {status === "open" ? <Lock aria-hidden className="size-4" /> : <LockOpen aria-hidden className="size-4" />}
        {status === "open" ? t("Close period") : t("Reopen period")}
      </Button>
    </section>
  );
}

export default function PeriodsPage() {
  const { company, locale, name, t } = useWorkspace();

  return (
    <ResourcePage<Period>
      title="Periods"
      description={`Accounting months of ${name(company)}. Close a month once its books are final.`}
      endpoint="/accounting/periods"
      permission="accounting.period"
      noun="period"
      query={{ company: company.id, page_size: 100 }}
      filters={[{ name: "status", label: "Status", options: [["open", "Open"], ["closed", "Closed"]] }]}
      headerActions={<CreateYear />}
      columns={[
        { label: "Period", render: (row) => <span className="font-medium tabular-nums">{row.name}</span> },
        {
          label: "Dates",
          render: (row) => (
            <span className="tabular-nums">
              {formatDate(row.start_date, locale)} – {formatDate(row.end_date, locale)}
            </span>
          ),
        },
        {
          label: "Status",
          render: (row) =>
            row.status === "open" ? <Badge tone="success">{t("Open")}</Badge> : <Badge>{t("Closed")}</Badge>,
        },
      ]}
      fields={[
        { name: "name", label: "Name", required: true, hint: "e.g. 2026-13 for an adjustment period." },
        { name: "start_date", label: "Start date", type: "date", required: true },
        { name: "end_date", label: "End date", type: "date", required: true },
      ]}
      initial={(row) => ({
        name: row?.name ?? "",
        start_date: row?.start_date ?? "",
        end_date: row?.end_date ?? "",
      })}
      toPayload={() => ({ company: company.id })}
      drawerExtra={(row) => <CloseControls period={row} />}
    />
  );
}
