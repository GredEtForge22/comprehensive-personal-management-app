import { asc, desc, gte } from "drizzle-orm";
import { db } from "@/db";
import { pieces, practiceSessions } from "@/db/schema";
import { addDays, todayStr } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import MusicView from "@/components/MusicView";

export const dynamic = "force-dynamic";

export default async function MusicPage() {
  const today = todayStr();
  const [sessions, ps, settings] = await Promise.all([
    db
      .select()
      .from(practiceSessions)
      .where(gte(practiceSessions.date, addDays(today, -365)))
      .orderBy(desc(practiceSessions.date), desc(practiceSessions.id)),
    db.select().from(pieces).orderBy(asc(pieces.title)),
    getSettings(),
  ]);
  return (
    <MusicView
      today={today}
      weeklyGoalMin={settings.musicWeeklyGoalMin}
      sessions={sessions.map((s) => ({
        id: s.id,
        date: s.date,
        minutes: s.minutes,
        category: s.category,
        piece: s.piece,
        tempoBpm: s.tempoBpm,
        quality: s.quality,
        notes: s.notes,
      }))}
      pieces={ps.map((p) => ({
        id: p.id,
        title: p.title,
        composer: p.composer,
        status: p.status,
        currentBpm: p.currentBpm,
        targetBpm: p.targetBpm,
        deadline: p.deadline,
        notes: p.notes,
      }))}
    />
  );
}
