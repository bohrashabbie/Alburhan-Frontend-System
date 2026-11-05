"use client";

import { useId, useState } from "react";

import { useWorkspace } from "@/lib/workspace";

/**
 * Small, dependency-free charts in the design system's two series colours. Marks are thin, the
 * axis hairline, labels in text tokens; every mark has a hover tooltip and a table lives beside
 * the chart in the page (see the dashboard). Single-series charts carry no legend.
 */

const SERIES = "#6950f3";
const MUTED = "#c9c2f7";

export type Point = { label: string; value: number; hint?: string };

/** Vertical columns over time (one series). Values are plain numbers already in major units. */
export function ColumnChart({ points, format, height = 160, highlightLast = true }: { points: Point[]; format: (value: number) => string; height?: number; highlightLast?: boolean }) {
  const { t } = useWorkspace();
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...points.map((p) => p.value), 0);
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const width = 600;
  const padStart = 44;
  const padBottom = 22;
  const plotW = width - padStart - 8;
  const plotH = height - padBottom - 8;
  const band = plotW / Math.max(points.length, 1);
  const barW = Math.min(24, Math.max(4, band - 2));
  const y = (value: number) => 8 + plotH - (value / top) * plotH;
  const labelEvery = Math.ceil(points.length / 6);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-labelledby={`${id}-title`}>
        <title id={`${id}-title`}>{t("Sales by day")}</title>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={padStart} x2={width - 8} y1={y(tick)} y2={y(tick)} stroke="var(--color-line)" strokeWidth={1} />
            <text x={padStart - 6} y={y(tick) + 3} textAnchor="end" className="fill-ink-soft" fontSize={10}>{compact(tick)}</text>
          </g>
        ))}
        {points.map((point, index) => {
          const x = padStart + index * band + (band - barW) / 2;
          const h = Math.max(0, (point.value / top) * plotH);
          const last = index === points.length - 1;
          return (
            <g key={point.label} onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)}>
              <rect x={padStart + index * band} y={8} width={band} height={plotH} fill="transparent" />
              {h > 0 ? <path d={roundedTop(x, y(point.value), barW, h, 4)} fill={highlightLast && !last && active !== index ? MUTED : SERIES} /> : null}
              {index % labelEvery === 0 || last ? <text x={x + barW / 2} y={height - 6} textAnchor="middle" className="fill-ink-soft" fontSize={10}>{point.label}</text> : null}
            </g>
          );
        })}
      </svg>
      {active !== null ? (
        <div className="pointer-events-none absolute top-0 rounded-md bg-panel px-2 py-1 text-xs text-panel-ink shadow-lg" style={{ insetInlineStart: `${((padStart + active * band) / width) * 100}%` }}>
          <span className="block text-panel-ink-soft">{points[active].hint ?? points[active].label}</span>
          <span className="block font-semibold tabular-nums">{format(points[active].value)}</span>
        </div>
      ) : null}
    </div>
  );
}

/** Horizontal bars ranked by value (one series); the label sits at the start, the value at the tip. */
export function BarList({ points, format, max: maxValue }: { points: Point[]; format: (value: number) => string; max?: number }) {
  const max = maxValue ?? Math.max(...points.map((p) => p.value), 0) ?? 1;
  return (
    <ul className="flex flex-col gap-2.5">
      {points.map((point) => (
        <li key={point.label} className="group text-sm" title={`${point.label}: ${format(point.value)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3"><span className="truncate">{point.label}</span><span className="shrink-0 font-medium tabular-nums">{format(point.value)}</span></div>
          <div className="h-2 rounded-full bg-surface-muted"><div className="h-2 rounded-full transition-[width] duration-500" style={{ width: `${max > 0 ? Math.max((point.value / max) * 100, point.value > 0 ? 1.5 : 0) : 0}%`, backgroundColor: SERIES }} /></div>
        </li>
      ))}
    </ul>
  );
}

export function StatTile({ label, value, delta, hint, tone }: { label: string; value: string; delta?: string | null; hint?: string; tone?: "warning" | "danger" }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs tracking-wide text-ink-soft uppercase">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight ${tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : ""}`}>{value}</p>
      {delta ? <p className={`mt-0.5 text-xs font-medium ${delta.startsWith("-") ? "text-danger" : "text-[#2e7d32]"}`}>{delta}</p> : hint ? <p className="mt-0.5 text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + w - radius} Q${x + w},${y} ${x + w},${y + radius} V${y + h} Z`;
}

function niceTicks(max: number) {
  if (max <= 0) return [0, 1];
  const raw = max / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((candidate) => candidate >= raw) ?? power;
  const ticks = [];
  for (let value = 0; value <= max + step - 0.0001; value += step) ticks.push(Math.round(value * 1000) / 1000);
  return ticks;
}

function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 10_000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
