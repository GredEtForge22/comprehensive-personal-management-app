import { dow } from "@/lib/dates";

export const CATEGORIES = [
  { id: "cours", label: "Cours", color: "#6366f1" },
  { id: "musique", label: "Musique", color: "#f59e0b" },
  { id: "sport", label: "Sport", color: "#10b981" },
  { id: "travail", label: "Travail perso", color: "#06b6d4" },
  { id: "perso", label: "Perso", color: "#ec4899" },
  { id: "autre", label: "Autre", color: "#71717a" },
];

export const PALETTE = ["#6366f1", "#f59e0b", "#10b981", "#06b6d4", "#ec4899", "#ef4444", "#8b5cf6", "#84cc16", "#71717a"];

export type ScheduleEvent = {
  id: number;
  title: string;
  category: string;
  color: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  repeat: "weekly" | "once";
  daysOfWeek: number[];
  date: string | null;
  weekParity: "all" | "A" | "B";
  validFrom: string | null;
  validUntil: string | null;
};

export type ScheduleException = { eventId: number; date: string };

export function occursOn(ev: ScheduleEvent, date: string, parity: "A" | "B"): boolean {
  if (ev.validFrom && date < ev.validFrom) return false;
  if (ev.validUntil && date > ev.validUntil) return false;
  if (ev.repeat === "once") return ev.date === date;
  if (!ev.daysOfWeek.includes(dow(date))) return false;
  if (ev.weekParity !== "all" && ev.weekParity !== parity) return false;
  return true;
}
