import { asc, gte } from "drizzle-orm";
import { db } from "@/db";
import { habitLogs, habits } from "@/db/schema";
import { addDays, todayStr } from "@/lib/dates";
import HabitsView from "@/components/HabitsView";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const today = todayStr();
  const [hs, logs] = await Promise.all([
    db.select().from(habits).orderBy(asc(habits.position), asc(habits.id)),
    db.select().from(habitLogs).where(gte(habitLogs.date, addDays(today, -125))),
  ]);
  return (
    <HabitsView
      today={today}
      habits={hs.map((h) => ({ id: h.id, name: h.name, emoji: h.emoji, color: h.color, weeklyTarget: h.weeklyTarget }))}
      logs={logs.map((l) => `${l.habitId}|${l.date}`)}
    />
  );
}
