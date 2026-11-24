"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSWRConfig } from "swr";

import { Button, ErrorBanner, Modal, SelectField, TextField } from "@/components/ui";
import { ApiError, withQuery } from "@/lib/api";
import { useAction, useResource } from "@/lib/hooks";
import type { Page, Warehouse } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

/** "Import transfer by CSV": a draft transfer from a file with the columns sku and quantity. */
export function ImportTransfer() {
  const { company, can, name, t } = useWorkspace();
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [open, setOpen] = useState(false);
  const warehouses = useResource<Page<Warehouse>>(open ? withQuery("/organization/warehouses", { company: company.id, is_active: "true", page_size: 100 }) : null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [file, setFile] = useState<File | null>(null);
  const action = useAction();
  if (!can("inventory.transfer.create")) return null;
  const template = `data:text/csv;charset=utf-8,${encodeURIComponent("sku,quantity\nMS-DL-R01-18W,10\n")}`;

  const run = () =>
    action.run(async () => {
      if (!file) return;
      const form = new FormData();
      form.append("file", file);
      form.append("company", String(company.id));
      form.append("date", date);
      form.append("from_warehouse", from);
      form.append("to_warehouse", to);
      const response = await fetch("/api/v1/inventory/transfers/import/", { method: "POST", headers: { "x-app-request": "1" }, body: form });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new ApiError(response.status, data?.code ?? "unknown_error", data?.message ?? "Something went wrong. Try again.", data?.fields ?? {});
      await mutate((key) => typeof key === "string" && key.startsWith("/inventory/transfers"));
      setOpen(false);
      router.push(`/inventory/transfers?open=${data.id}`);
    });

  return (
    <>
      <div className="flex items-end"><Button variant="secondary" onClick={() => setOpen(true)}><Upload aria-hidden className="size-4" />{t("Import CSV")}</Button></div>
      <Modal open={open} onClose={() => setOpen(false)} title={t("Import transfer by CSV")}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">{t("The file needs two columns: sku and quantity. It becomes a draft transfer you can check before sending.")} <a href={template} download="transfer.csv" className="font-medium text-link hover:underline">{t("Download a template")}</a></p>
          <ErrorBanner error={action.error} />
          {action.field("file") ? <p className="text-sm text-danger">{action.field("file")}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label={t("From warehouse")} value={from} onChange={(e) => setFrom(e.target.value)} error={action.field("from_warehouse")}>
              <option value="">—</option>
              {(warehouses.data?.results ?? []).map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
            </SelectField>
            <SelectField label={t("To warehouse")} value={to} onChange={(e) => setTo(e.target.value)} error={action.field("to_warehouse")}>
              <option value="">—</option>
              {(warehouses.data?.results ?? []).map((item) => <option key={item.id} value={item.id}>{name(item)}</option>)}
            </SelectField>
          </div>
          <TextField label={t("Date")} type="date" value={date} onChange={(e) => setDate(e.target.value)} error={action.field("date")} />
          <input type="file" accept=".csv,text/csv" aria-label={t("CSV file")} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm file:me-3 file:rounded-full file:border-0 file:bg-surface-muted file:px-4 file:py-2 file:text-sm file:font-medium" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
            <Button disabled={!file || !from || !to} pending={action.pending} onClick={run}>{t("Import")}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
