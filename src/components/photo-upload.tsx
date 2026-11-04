"use client";

import { Camera, ImageUp, RefreshCw, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button, ErrorBanner } from "@/components/ui";
import { api, upload } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { useWorkspace } from "@/lib/workspace";

const ACCEPT = "image/png,image/jpeg,image/webp";
const MAX_BYTES = 2 * 1024 * 1024;

/** A square photo, or the record's initials when there is none. */
export function PhotoThumb({
  url,
  name,
  size = "size-10",
  rounded = "rounded-lg",
}: {
  url?: string | null;
  name: string;
  size?: string;
  rounded?: string;
}) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- signed S3 link, changes per request
    <img src={url} alt="" className={`${size} ${rounded} shrink-0 border border-line bg-surface object-cover`} />
  ) : (
    <span
      aria-hidden
      className={`${size} ${rounded} flex shrink-0 items-center justify-center bg-surface-muted text-xs font-semibold text-ink-soft`}
    >
      {letters}
    </span>
  );
}

/** Live camera view; "Capture" hands back a JPEG blob. */
function CameraDialog({ onCapture, onClose }: { onCapture: (file: File) => void; onClose: () => void }) {
  const { t } = useWorkspace();
  const video = useRef<HTMLVideoElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState("");

  useEffect(() => {
    dialog.current?.showModal();
    let cancelled = false;
    (async () => {
      try {
        stream.current?.getTracks().forEach((track) => track.stop());
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) return media.getTracks().forEach((track) => track.stop());
        stream.current = media;
        if (video.current) video.current.srcObject = media;
      } catch {
        setError("The camera couldn't be opened. Check the browser's camera permission, or upload a file instead.");
      }
    })();
    return () => {
      cancelled = true;
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, [facing]);

  const capture = () => {
    const source = video.current;
    if (!source || !source.videoWidth) return;
    const side = Math.min(source.videoWidth, source.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.min(side, 1200);
    const context = canvas.getContext("2d");
    if (!context) return;
    // Centre-crop to a square, which is how product photos are shown.
    context.drawImage(
      source,
      (source.videoWidth - side) / 2,
      (source.videoHeight - side) / 2,
      side,
      side,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[calc(100vw-2rem)] max-w-lg rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl"
    >
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">{t("Take a photo")}</h2>
          <button type="button" aria-label={t("Close")} onClick={onClose} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-muted">
            <X aria-hidden className="size-4" />
          </button>
        </div>
        {error ? (
          <p className="rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</p>
        ) : (
          <div className="overflow-hidden rounded-xl bg-black">
            <video ref={video} autoPlay playsInline muted className="aspect-square w-full object-cover" />
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={() => setFacing(facing === "environment" ? "user" : "environment")} disabled={Boolean(error)}>
            <RefreshCw aria-hidden className="size-4" />
            {t("Switch camera")}
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button onClick={capture} disabled={Boolean(error)}>
              <Camera aria-hidden className="size-4" />
              {t("Capture")}
            </Button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

/**
 * Upload a photo from a file, take one with the camera, or remove it. Files go to S3 through
 * the API: POST/DELETE `endpoint` (e.g. /catalog/products/12/image).
 */
export function PhotoUpload({
  endpoint,
  name,
  initialUrl,
  canEdit,
  onChanged,
  title,
  hint = "PNG, JPEG or WebP, up to 2 MB. A square photo looks best.",
  shape = "rounded-xl",
}: {
  endpoint: string;
  name: string;
  initialUrl: string | null;
  canEdit: boolean;
  onChanged: () => void;
  title: string;
  hint?: string;
  shape?: string;
}) {
  const { t } = useWorkspace();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [camera, setCamera] = useState(false);
  const [localError, setLocalError] = useState("");
  const action = useAction();
  const cameraPossible = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

  const send = (file: File) => {
    setLocalError("");
    if (!ACCEPT.split(",").includes(file.type)) return setLocalError("Use a PNG, JPEG or WebP image.");
    if (file.size > MAX_BYTES) return setLocalError("The image must be 2 MB or smaller.");
    action.run(async () => {
      const result = await upload<{ image_url?: string | null; logo_url?: string | null }>(endpoint, { image: file });
      setUrl(result.image_url ?? result.logo_url ?? null);
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
      <h3 className="text-base font-bold">{title}</h3>
      <p className="mt-1 text-sm text-ink-soft">{hint}</p>
      <div className="mt-4 flex items-start gap-5">
        <PhotoThumb url={url} name={name} size="size-28" rounded={shape} />
        {canEdit ? (
          <div className="flex flex-col gap-2">
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
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" pending={action.pending} onClick={() => input.current?.click()}>
                <ImageUp aria-hidden className="size-4" />
                {url ? t("Replace photo") : t("Upload photo")}
              </Button>
              {cameraPossible ? (
                <Button variant="secondary" disabled={action.pending} onClick={() => setCamera(true)}>
                  <Camera aria-hidden className="size-4" />
                  {t("Take a photo")}
                </Button>
              ) : null}
            </div>
            {url ? (
              <Button variant="ghost" disabled={action.pending} onClick={remove} className="self-start">
                <Trash2 aria-hidden className="size-4" />
                {t("Remove photo")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      {localError ? <p className="mt-3 text-sm text-danger">{localError}</p> : null}
      <div className="mt-3">
        <ErrorBanner error={action.error} />
      </div>
      {camera ? (
        <CameraDialog
          onClose={() => setCamera(false)}
          onCapture={(file) => {
            setCamera(false);
            send(file);
          }}
        />
      ) : null}
    </section>
  );
}
