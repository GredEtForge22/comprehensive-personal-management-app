import { desc, gte } from "drizzle-orm";
import { db } from "@/db";
import { runs } from "@/db/schema";
import { addDays, todayStr } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import RunView from "@/components/RunView";

export const dynamic = "force-dynamic";

export default async function RunPage() {
  const today = todayStr();
  const [rows, settings] = await Promise.all([
    db
      .select()
      .from(runs)
      .where(gte(runs.date, addDays(today, -365)))
      .orderBy(desc(runs.date), desc(runs.id)),
    getSettings(),
  ]);
  return (
    <RunView
      today={today}
      weeklyGoalKm={settings.runWeeklyGoalKm}
      runs={rows.map((r) => ({
        id: r.id,
        date: r.date,
        distanceKm: r.distanceKm,
        durationSec: r.durationSec,
        kind: r.kind,
        feeling: r.feeling,
        avgHr: r.avgHr,
        notes: r.notes,
      }))}
    />
  );
}
