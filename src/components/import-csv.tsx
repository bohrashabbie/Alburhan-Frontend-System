"use client";

import { Download, Upload } from "lucide-react";
import { useState } from "react";
import { useSWRConfig } from "swr";

import { Button, ErrorBanner, Modal } from "@/components/ui";
import { upload } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { useWorkspace } from "@/lib/workspace";

type Result = { created: number; updated: number; errors: { row: number; message: string }[] };

/**
 * "Import CSV" for a list: choose a file, see how many rows were added or updated and which
 * rows were skipped and why. `columns` is the header row of the template people download.
 */
export function ImportCsv({ endpoint, refresh, columns, sample, note }: { endpoint: string; refresh: string; columns: string[]; sample: string[]; note: string }) {
  const { t } = useWorkspace();
  const { mutate } = useSWRConfig();
  const action = useAction();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const template = `data:text/csv;charset=utf-8,${encodeURIComponent(`${columns.join(",")}\n${sample.join(",")}\n`)}`;
  const close = () => { setOpen(false); setFile(null); setResult(null); action.clear(); };
  const run = () =>
    action.run(async () => {
      if (!file) return;
      const done = await upload<Result>(endpoint, { file });
      setResult(done);
      await mutate((key) => typeof key === "string" && key.startsWith(refresh));
    });

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}><Upload aria-hidden className="size-4" />{t("Import CSV")}</Button>
      <Modal open={open} onClose={close} title={t("Import CSV")}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">{t(note)}</p>
          <p className="rounded-lg bg-surface-muted/60 px-3 py-2 font-mono text-xs break-words">{columns.join(", ")}</p>
          <a href={template} download="template.csv" className="inline-flex items-center gap-1.5 text-sm font-medium text-link hover:underline"><Download aria-hidden className="size-4" />{t("Download a template")}</a>
          <ErrorBanner error={action.error} />
          {action.field("file") ? <p className="text-sm text-danger">{action.field("file")}</p> : null}
          {result ? (
            <div className="rounded-xl border border-line p-3 text-sm">
              <p className="font-medium">{result.created} {t("added")} · {result.updated} {t("updated")} · {result.errors.length} {t("skipped")}</p>
              {result.errors.length ? (
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-ink-soft">
                  {result.errors.map((error) => <li key={error.row}><span className="font-medium text-ink">{t("Line")} {error.row}:</span> {error.message}</li>)}
                </ul>
              ) : null}
            </div>
          ) : (
            <input type="file" accept=".csv,text/csv" aria-label={t("CSV file")} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm file:me-3 file:rounded-full file:border-0 file:bg-surface-muted file:px-4 file:py-2 file:text-sm file:font-medium" />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>{t(result ? "Close" : "Cancel")}</Button>
            {result ? null : <Button disabled={!file} pending={action.pending} onClick={run}>{t("Import")}</Button>}
          </div>
        </div>
      </Modal>
    </>
  );
}
