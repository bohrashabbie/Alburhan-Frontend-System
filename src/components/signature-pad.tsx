"use client";

import { Eraser } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { Button } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";

/**
 * A box the customer signs in with a finger, stylus or mouse. Ink is dark on a light card in both
 * themes, and the exported PNG is transparent so it prints cleanly on the completion form.
 * `onChange` gets the PNG data URL after each stroke, or null once cleared.
 */
export function SignaturePad({ label, onChange, error }: { label: string; onChange: (dataUrl: string | null) => void; error?: string }) {
  const { t } = useWorkspace();
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const inked = useRef(false);

  const context = useCallback(() => canvas.current?.getContext("2d") ?? null, []);

  // Match the drawing buffer to the box's real pixels so the line stays sharp on phones. The box
  // has no size yet while a dialog is opening, so this runs again whenever its size changes
  // (resizing empties the canvas, so a signature already drawn is kept as it is).
  const fit = useCallback(() => {
    const element = canvas.current;
    if (!element) return false;
    const ratio = window.devicePixelRatio || 1;
    const box = element.getBoundingClientRect();
    const width = Math.round(box.width * ratio);
    const height = Math.round(box.height * ratio);
    if (!width || !height) return false;
    if (element.width === width && element.height === height) return true;
    if (inked.current && element.width > 0) return true;
    element.width = width;
    element.height = height;
    const ctx = element.getContext("2d");
    if (!ctx) return false;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#111827";
    return true;
  }, []);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    fit();
    const watcher = new ResizeObserver(() => fit());
    watcher.observe(element);
    return () => watcher.disconnect();
  }, [fit]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };

  const down = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (!fit()) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    inked.current = true;
    const at = point(event);
    last.current = at;
    const ctx = context();
    if (!ctx) return;
    ctx.beginPath(); // a dot for a tap
    ctx.arc(at.x, at.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = "#111827";
    ctx.fill();
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = context();
    const from = last.current;
    if (!ctx || !from) return;
    const at = point(event);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(at.x, at.y);
    ctx.stroke();
    last.current = at;
  };

  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    onChange(canvas.current?.toDataURL("image/png") ?? null);
  };

  const clear = () => {
    const element = canvas.current;
    const ctx = context();
    if (!element || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, element.width, element.height);
    ctx.restore();
    inked.current = false;
    fit();
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <Button variant="ghost" className="h-8 px-2 text-sm" onClick={clear}>
          <Eraser aria-hidden className="size-4" />
          {t("Clear")}
        </Button>
      </div>
      <div className={`relative overflow-hidden rounded-xl border-2 border-dashed bg-white ${error ? "border-danger" : "border-line-strong"}`}>
        <canvas
          ref={canvas}
          aria-label={label}
          role="img"
          className="block h-48 w-full cursor-crosshair touch-none"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
        />
        <span aria-hidden className="pointer-events-none absolute inset-x-6 bottom-10 border-b border-gray-300" />
        <span aria-hidden className="pointer-events-none absolute start-6 bottom-11 text-lg text-gray-400">×</span>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : <p className="text-xs text-ink-soft">{t("Sign with a finger or stylus inside the box.")}</p>}
    </div>
  );
}
