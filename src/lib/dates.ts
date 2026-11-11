// Utilitaires de dates : toutes les dates sont des chaînes "YYYY-MM-DD" (fuseau Europe/Paris)

const TZ = "Europe/Paris";

export const DAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export const DAY_LONG = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
export const DAY_LETTER = ["L", "M", "M", "J", "V", "S", "D"];

export function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function nowMinutes(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const [h, m] = parts.split(":").map(Number);
  return (h % 24) * 60 + m;
}

function toDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isDateStr(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function addDays(s: string, n: number): string {
  const d = toDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toStr(d);
}

/** 1 = lundi … 7 = dimanche */
export function dow(s: string): number {
  const d = toDate(s).getUTCDay();
  return d === 0 ? 7 : d;
}

export function startOfWeek(s: string): string {
  return addDays(s, 1 - dow(s));
}

export function weekDates(s: string): string[] {
  const start = startOfWeek(s);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function diffDays(a: string, b: string): number {
  return Math.round((toDate(a).getTime() - toDate(b).getTime()) / 86_400_000);
}

export function isoWeek(s: string): number {
  const d = toDate(s);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

export function weekParity(s: string, weekAOdd: boolean): "A" | "B" {
  const odd = isoWeek(s) % 2 === 1;
  return odd === weekAOdd ? "A" : "B";
}

export function fmtDate(s: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", ...opts }).format(toDate(s));
}

export function fmtLong(s: string): string {
  return fmtDate(s, { weekday: "long", day: "numeric", month: "long" });
}

export function fmtShort(s: string): string {
  return fmtDate(s, { day: "numeric", month: "short" });
}

export function fmtRelative(s: string, today: string): string {
  const d = diffDays(s, today);
  if (d === 0) return "Aujourd'hui";
  if (d === 1) return "Demain";
  if (d === -1) return "Hier";
  if (d > 1 && d < 7) return fmtDate(s, { weekday: "long" });
  return fmtShort(s);
}

/** "08:30" -> 510 */
export function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function fromMin(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

export function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** secondes par km -> "5'30\"" */
export function fmtPace(secPerKm: number): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return "–";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  if (s === 60) return `${m + 1}'00"`;
  return `${m}'${String(s).padStart(2, "0")}"`;
}

export function monthStart(s: string): string {
  return s.slice(0, 8) + "01";
}
