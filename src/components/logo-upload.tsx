"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button, ErrorBanner } from "@/components/ui";
import { api, upload } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { useWorkspace } from "@/lib/workspace";

const ACCEPT = "image/png,image/jpeg,image/webp";
const MAX_BYTES = 2 * 1024 * 1024;

/** A square logo preview, or the record's initials when there is no logo. */
export function LogoThumb({ url, name, size = "size-9" }: { url?: string | null; name: string; size?: string }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- signed S3 link, changes per request
    <img src={url} alt="" className={`${size} shrink-0 rounded-lg border border-line bg-surface object-contain p-0.5`} />
  ) : (
    <span
      aria-hidden
      className={`${size} flex shrink-0 items-center justify-center rounded-lg bg-surface-muted text-xs font-semibold text-ink-soft`}
    >
      {letters}
    </span>
  );
}

/** Upload, replace or remove a record's logo. Files go to S3 through the API. */
export function LogoUpload({
  endpoint,
  name,
  initialUrl,
  canEdit,
  onChanged,
}: {
  /** e.g. /organization/companies/3/logo */
  endpoint: string;
  name: string;
  initialUrl: string | null;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const { t } = useWorkspace();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [localError, setLocalError] = useState("");
  const action = useAction();

  const send = (file: File) => {
    setLocalError("");
    if (!ACCEPT.split(",").includes(file.type)) return setLocalError("Use a PNG, JPEG or WebP image.");
    if (file.size > MAX_BYTES) return setLocalError("The logo must be 2 MB or smaller.");
    action.run(async () => {
      const result = await upload<{ logo_url: string | null }>(endpoint, { logo: file });
      setUrl(result.logo_url);
      onChanged();
    });
  };

  const remove = () =>
    action.run(async () => {
      await api.delete(endpoint);
      setUrl(null);
      onChanged();
    });

  return (
    <section className="border-t border-line pt-6">
      <h3 className="text-base font-bold">{t("Logo")}</h3>
      <p className="mt-1 text-sm text-ink-soft">PNG, JPEG or WebP, up to 2 MB. A square image looks best.</p>
      <div className="mt-4 flex items-center gap-4">
        <LogoThumb url={url} name={name} size="size-20" />
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <input
              ref={input}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) send(file);
              }}
            />
            <Button variant="secondary" pending={action.pending} onClick={() => input.current?.click()}>
              <ImageUp aria-hidden className="size-4" />
              {url ? t("Replace logo") : t("Upload logo")}
            </Button>
            {url ? (
              <Button variant="ghost" disabled={action.pending} onClick={remove}>
                <Trash2 aria-hidden className="size-4" />
                {t("Remove logo")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      {localError ? <p className="mt-3 text-sm text-danger">{localError}</p> : null}
      <div className="mt-3">
        <ErrorBanner error={action.error} />
      </div>
    </section>
  );
}
