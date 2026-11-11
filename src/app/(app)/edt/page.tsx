import { and, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { scheduleEvents, scheduleExceptions } from "@/db/schema";
import { addDays, isDateStr, startOfWeek, todayStr } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import type { ScheduleEvent } from "@/lib/schedule";
import ScheduleView from "@/components/ScheduleView";

export const dynamic = "force-dynamic";

export default async function EdtPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const sp = await searchParams;
  const today = todayStr();
  const weekStart = startOfWeek(isDateStr(sp.week) ? sp.week : today);
  const [rows, exceptions, settings] = await Promise.all([
    db.select().from(scheduleEvents),
    db
      .select()
      .from(scheduleExceptions)
      .where(and(gte(scheduleExceptions.date, weekStart), lte(scheduleExceptions.date, addDays(weekStart, 6)))),
    getSettings(),
  ]);
  const events: ScheduleEvent[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    color: r.color,
    startTime: r.startTime,
    endTime: r.endTime,
    location: r.location,
    notes: r.notes,
    repeat: r.repeat === "once" ? "once" : "weekly",
    daysOfWeek: r.daysOfWeek,
    date: r.date,
    weekParity: r.weekParity === "A" || r.weekParity === "B" ? r.weekParity : "all",
    validFrom: r.validFrom,
    validUntil: r.validUntil,
  }));
  return (
    <ScheduleView
      events={events}
      exceptions={exceptions.map((e) => ({ eventId: e.eventId, date: e.date }))}
      weekStart={weekStart}
      today={today}
      weekAOdd={settings.weekAOdd}
    />
  );
}
