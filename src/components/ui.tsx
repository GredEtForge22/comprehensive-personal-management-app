"use client";

import { useEffect, type ReactNode } from "react";
import { addDays, todayStr, weekStart } from "@/lib/dates";

export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-zinc-400">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/60 p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`shrink-0 cursor-pointer rounded-xl px-4 py-1.5 text-sm font-medium transition ${
            value === t.id ? "bg-amber-400 text-zinc-950" : "text-zinc-400 hover:text-zinc-100"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl sm:rounded-3xl ${
          wide ? "sm:max-w-2xl" : "sm:max-w-lg"
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Fermer">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export function Progress({
  value,
  max,
  color = "#fbbf24",
  height = 8,
}: {
  value: number;
  max: number;
  color?: string;
  height?: number;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full overflow-hidden rounded-full bg-zinc-800" style={{ height }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Stat({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: string }) {
  return (
    <div className="card !p-3.5">
      <div className="text-xs tracking-wide text-zinc-400 uppercase">{label}</div>
      <div className="mt-1 text-2xl font-bold" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">{children}</div>;
}

export function Loading() {
  return <div className="p-6 text-center text-sm text-zinc-500">Chargement…</div>;
}

/** Barres verticales simples */
export function Bars({
  data,
  height = 120,
  target,
  unit = "",
  color = "#fbbf24",
}: {
  data: { label: string; value: number; highlight?: boolean }[];
  height?: number;
  target?: number;
  unit?: string;
  color?: string;
}) {
  const max = Math.max(1, target ?? 0, ...data.map((d) => d.value));
  return (
    <div className="relative">
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] text-zinc-500">{d.value > 0 ? Math.round(d.value * 10) / 10 : ""}</span>
            <div
              className="w-full rounded-t-md"
              style={{
                height: `${(d.value / max) * 100 * 0.8}%`,
                minHeight: d.value > 0 ? 3 : 0,
                background: d.highlight ? color : color + "88",
              }}
              title={`${d.label}: ${d.value}${unit}`}
            />
          </div>
        ))}
      </div>
      {target ? (
        <div
          className="pointer-events-none absolute right-0 left-0 border-t border-dashed border-emerald-400/60"
          style={{ bottom: `calc(${(target / max) * 80}% + 20px)` }}
        />
      ) : null}
      <div className="mt-1 flex gap-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-zinc-500">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Courbe simple */
export function Spark({ points, height = 70, color = "#fbbf24", labels }: { points: number[]; height?: number; color?: string; labels?: [string, string] }) {
  if (points.length < 2) return <div className="text-xs text-zinc-500">Pas assez de données pour une courbe.</div>;
  const w = 300;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const pts = points.map((p, i) => [(i / (points.length - 1)) * w, height - 6 - ((p - min) / span) * (height - 12)]);
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
        <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" points={pts.map((p) => p.join(",")).join(" ")} />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={color} />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-zinc-500">
        <span>{labels?.[0] ?? `min ${Math.round(min * 10) / 10}`}</span>
        <span>{labels?.[1] ?? `max ${Math.round(max * 10) / 10}`}</span>
      </div>
    </div>
  );
}

/** Calendrier de régularité (style GitHub). `values` : date → intensité 0..1 (ou >1) */
export function Heatmap({
  values,
  weeks = 15,
  color = "#fbbf24",
  onDayClick,
}: {
  values: Record<string, number>;
  weeks?: number;
  color?: string;
  onDayClick?: (date: string) => void;
}) {
  const today = todayStr();
  const start = addDays(weekStart(today), -(weeks - 1) * 7);
  const cols = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  return (
    <div className="flex gap-[3px] overflow-x-auto pb-1">
      <div className="flex flex-col gap-[3px] pr-1 text-[9px] leading-[14px] text-zinc-600">
        {["L", "", "M", "", "V", "", "D"].map((d, i) => (
          <span key={i} className="h-[14px]">
            {d}
          </span>
        ))}
      </div>
      {cols.map((col, i) => (
        <div key={i} className="flex flex-col gap-[3px]">
          {col.map((date) => {
            const v = values[date] ?? 0;
            const future = date > today;
            const op = v <= 0 ? 0 : Math.min(1, 0.25 + Math.min(1, v) * 0.75);
            return (
              <button
                key={date}
                title={`${date} : ${Math.round(v * 100) / 100}`}
                onClick={() => onDayClick?.(date)}
                className={`h-[14px] w-[14px] rounded-[3px] ${future ? "opacity-20" : ""} ${date === today ? "ring-1 ring-zinc-400" : ""}`}
                style={{ background: v > 0 ? color : "#27272a", opacity: future ? 0.2 : v > 0 ? op : 1 }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function Rating({
  value,
  onChange,
  icons = ["😞", "😕", "😐", "🙂", "🤩"],
}: {
  value: number;
  onChange: (v: number) => void;
  icons?: string[];
}) {
  return (
    <div className="flex gap-1.5">
      {icons.map((ic, i) => (
        <button
          type="button"
          key={i}
          onClick={() => onChange(i + 1)}
          className={`h-10 w-10 cursor-pointer rounded-xl text-xl transition ${
            value === i + 1 ? "scale-110 bg-amber-400/20 ring-2 ring-amber-400" : "bg-zinc-800 opacity-60 hover:opacity-100"
          }`}
        >
          {ic}
        </button>
      ))}
    </div>
  );
}

export function ColorPicker({ colors, value, onChange }: { colors: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <button
          type="button"
          key={c}
          onClick={() => onChange(c)}
          className={`h-7 w-7 cursor-pointer rounded-full ${value === c ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900" : ""}`}
          style={{ background: c }}
          aria-label={c}
        />
      ))}
    </div>
  );
}

export function NumInput({
  value,
  onChange,
  step = 1,
  min = 0,
  className = "",
  placeholder,
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  className?: string;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      className={`input ${className}`}
      value={Number.isFinite(value) && value !== 0 ? value : value === 0 ? 0 : ""}
      step={step}
      min={min}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
    />
  );
}

export const confirmDelete = (msg = "Supprimer définitivement ?") => typeof window !== "undefined" && window.confirm(msg);
