import { dow, weekType } from "./dates";
import type { Cancel, Course, OneOff } from "./types";
import type { Rec } from "./store";

export type DayEvent = {
  key: string;
  id: number;
  source: "course" | "event";
  title: string;
  start: string;
  end: string;
  room?: string;
  teacher?: string;
  color: string;
  cancelled: boolean;
  cancelId?: number;
  note?: string;
};

export const COLORS = [
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#a855f7",
  "#6366f1",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#84cc16",
  "#78716c",
];

export function eventsForDay(
  date: string,
  courses: Rec<Course>[],
  events: Rec<OneOff>[],
  cancels: Rec<Cancel>[],
  parityA: number,
): DayEvent[] {
  const d = dow(date);
  const wt = weekType(date, parityA);
  const out: DayEvent[] = [];
  for (const c of courses) {
    if (!c.days?.includes(d)) continue;
    if (c.weeks !== "all" && c.weeks !== wt) continue;
    if (c.validFrom && date < c.validFrom) continue;
    if (c.validTo && date > c.validTo) continue;
    const cancel = cancels.find((x) => x.courseId === c.id && x.date === date);
    out.push({
      key: `c${c.id}`,
      id: c.id,
      source: "course",
      title: c.title,
      start: c.start,
      end: c.end,
      room: c.room,
      teacher: c.teacher,
      color: c.color,
      cancelled: !!cancel,
      cancelId: cancel?.id,
    });
  }
  for (const e of events) {
    if (e.date !== date) continue;
    out.push({
      key: `e${e.id}`,
      id: e.id,
      source: "event",
      title: e.title,
      start: e.start,
      end: e.end,
      room: e.room,
      color: e.color,
      cancelled: false,
      note: e.note,
    });
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}
