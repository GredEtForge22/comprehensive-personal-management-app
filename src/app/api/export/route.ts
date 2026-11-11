import { db } from "@/db";
import {
  bodyWeights,
  checkins,
  foodEntries,
  foods,
  grades,
  habitLogs,
  habits,
  pieces,
  practiceSessions,
  runs,
  scheduleEvents,
  scheduleExceptions,
  scores,
  settings,
  tasks,
  workoutSets,
  workouts,
} from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const [
    s, ev, ex, h, hl, w, ws, r, ps, pc, sc, fo, fe, bw, t, g, c,
  ] = await Promise.all([
    db.select().from(settings),
    db.select().from(scheduleEvents),
    db.select().from(scheduleExceptions),
    db.select().from(habits),
    db.select().from(habitLogs),
    db.select().from(workouts),
    db.select().from(workoutSets),
    db.select().from(runs),
    db.select().from(practiceSessions),
    db.select().from(pieces),
    db.select().from(scores),
    db.select().from(foods),
    db.select().from(foodEntries),
    db.select().from(bodyWeights),
    db.select().from(tasks),
    db.select().from(grades),
    db.select().from(checkins),
  ]);
  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      settings: s,
      scheduleEvents: ev,
      scheduleExceptions: ex,
      habits: h,
      habitLogs: hl,
      workouts: w,
      workoutSets: ws,
      runs: r,
      practiceSessions: ps,
      pieces: pc,
      scores: sc,
      foods: fo,
      foodEntries: fe,
      bodyWeights: bw,
      tasks: t,
      grades: g,
      checkins: c,
    },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="planner-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
