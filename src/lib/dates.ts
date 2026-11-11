// Toutes les dates sont des chaînes "YYYY-MM-DD" calculées en Europe/Paris.
const TZ = "Europe/Paris";

export const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
export const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export const DAYS_1 = ["L", "M", "M", "J", "V", "S", "D"];

export function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function nowMinutes(): number {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

function toUTC(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function fromUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(s: string, n: number): string {
  const d = toUTC(s);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUTC(d);
}
/** 0 = lundi ... 6 = dimanche */
export function dow(s: string): number {
  return (toUTC(s).getUTCDay() + 6) % 7;
}
export function weekStart(s: string): string {
  return addDays(s, -dow(s));
}
export function diffDays(a: string, b: string): number {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / 86400000);
}
export function weekDates(s: string): string[] {
  const start = weekStart(s);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
/** Indice absolu de la semaine (lundi), stable d'une année à l'autre */
export function weekIndex(s: string): number {
  return Math.round((toUTC(weekStart(s)).getTime() / 86400000 + 3) / 7);
}
export function weekType(s: string, parityA: number): "A" | "B" {
  return (((weekIndex(s) % 2) + 2) % 2 === parityA ? "A" : "B") as "A" | "B";
}
export function monthOf(s: string): string {
  return s.slice(0, 7);
}

export function fmtDate(s: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }): string {
  if (!s) return "";
  return toUTC(s).toLocaleDateString("fr-FR", { timeZone: "UTC", ...opts });
}
export function fmtLong(s: string): string {
  return fmtDate(s, { weekday: "long", day: "numeric", month: "long" });
}
export function weekLabel(s: string): string {
  const a = weekStart(s);
  const b = addDays(a, 6);
  return `${fmtDate(a)} – ${fmtDate(b, { day: "numeric", month: "short", year: "numeric" })}`;
}

/** "J-3", "Demain", "Aujourd'hui", "En retard (2 j)" */
export function countdown(date: string, today = todayStr()): string {
  const d = diffDays(today, date);
  if (d === 0) return "Aujourd'hui";
  if (d === 1) return "Demain";
  if (d === -1) return "Hier";
  if (d < 0) return `En retard (${-d} j)`;
  return `J-${d}`;
}

export function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
export function fromMin(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** 510 → "8h30" */
export function fmtDuration(min: number): string {
  const m = Math.round(min);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return `${h}h${String(r).padStart(2, "0")}`;
}
/** secondes → "5'12" ou "1:05:30" */
export function fmtTime(sec: number): string {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  return `${m}:${String(r).padStart(2, "0")}`;
}
export function fmtPace(secPerKm: number): string {
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}'${String(s % 60).padStart(2, "0")}"/km`;
}
/** "42:30" ou "1:05:30" ou "42" (minutes) → secondes */
export function parseTime(txt: string): number {
  const parts = txt.trim().replace(",", ".").split(":").map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return 0;
  if (parts.length === 1) return Math.round(parts[0] * 60);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}
