import { addDays, dow } from "@/lib/dates";

export function ProgressBar({
  value,
  max,
  color = "#f59e0b",
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

export function Ring({
  value,
  max,
  size = 96,
  color = "#f59e0b",
  children,
}: {
  value: number;
  max: number;
  size?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#27272a" strokeWidth={8} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-all"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function BarChart({
  data,
  height = 130,
  color = "#f59e0b",
  goal,
  format = (n: number) => String(Math.round(n * 10) / 10),
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  goal?: number;
  format?: (n: number) => string;
}) {
  const max = Math.max(1, goal ?? 0, ...data.map((d) => d.value));
  return (
    <div>
      <div className="relative flex items-end gap-1.5" style={{ height }}>
        {goal ? (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-zinc-500/70"
            style={{ bottom: `${(goal / max) * 100}%` }}
          />
        ) : null}
        {data.map((d, i) => (
          <div key={i} className="flex h-full min-w-0 flex-1 flex-col justify-end">
            <div className="mb-0.5 text-center text-[10px] text-zinc-400">{d.value > 0 ? format(d.value) : ""}</div>
            <div
              className="w-full rounded-t-md transition-all"
              style={{
                height: `${(d.value / max) * 82}%`,
                minHeight: d.value > 0 ? 3 : 0,
                background: color,
                opacity: i === data.length - 1 ? 1 : 0.65,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {data.map((d, i) => (
          <div key={i} className="min-w-0 flex-1 truncate text-center text-[10px] text-zinc-500">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineChart({
  points,
  color = "#f59e0b",
  height = 110,
  unit = "",
  invert = false,
  format = (n: number) => String(Math.round(n * 10) / 10),
}: {
  points: { label: string; value: number }[];
  color?: string;
  height?: number;
  unit?: string;
  invert?: boolean;
  format?: (n: number) => string;
}) {
  if (points.length === 0) {
    return <div className="grid place-items-center text-xs text-zinc-500" style={{ height }}>Pas encore de données</div>;
  }
  const W = 320;
  const H = height;
  const pad = 14;
  const values = points.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const x = (i: number) => (points.length === 1 ? W / 2 : pad + (i * (W - pad * 2)) / (points.length - 1));
  const y = (v: number) => {
    const t = (v - min) / (max - min);
    return invert ? pad + t * (H - pad * 2) : H - pad - t * (H - pad * 2);
  };
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <path d={area} fill={color} opacity={0.1} />
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.value)} r={3} fill={color} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
        <span>{points[0].label}</span>
        <span>
          {format(Math.min(...values))}
          {unit} → {format(Math.max(...values))}
          {unit}
        </span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}

/** Calendrier type "GitHub" : colonnes = semaines, lignes = lundi → dimanche */
export function Heatmap({
  values,
  endDate,
  weeks = 17,
  max,
  rgb = "245,158,11",
  cell = 14,
}: {
  values: Record<string, number>;
  endDate: string;
  weeks?: number;
  max?: number;
  rgb?: string;
  cell?: number;
}) {
  const endMonday = addDays(endDate, 1 - dow(endDate));
  const startMonday = addDays(endMonday, -(weeks - 1) * 7);
  const m = max ?? Math.max(1, ...Object.values(values));
  const cols = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(startMonday, w * 7 + d)),
  );
  return (
    <div className="flex gap-[3px] overflow-x-auto">
      {cols.map((col, i) => (
        <div key={i} className="flex flex-col gap-[3px]">
          {col.map((d) => {
            const v = values[d] ?? 0;
            const future = d > endDate;
            return (
              <div
                key={d}
                title={`${d} : ${v}`}
                className="rounded-[3px]"
                style={{
                  width: cell,
                  height: cell,
                  background: future
                    ? "transparent"
                    : v > 0
                      ? `rgba(${rgb},${0.25 + 0.75 * Math.min(1, v / m)})`
                      : "#1f1f23",
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {sub ? <div className="mt-0.5 text-xs text-zinc-500">{sub}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  icon,
  subtitle,
  children,
}: {
  title: string;
  icon?: string;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          {icon ? <span>{icon}</span> : null}
          {title}
        </h1>
        {subtitle ? <p className="mt-0.5 text-sm text-zinc-400">{subtitle}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
