import { asc, desc, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { workoutSets, workouts } from "@/db/schema";
import { addDays, todayStr } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import MuscuView, { type WorkoutDTO } from "@/components/MuscuView";

export const dynamic = "force-dynamic";

export default async function MuscuPage() {
  const today = todayStr();
  const [ws, settings] = await Promise.all([
    db
      .select()
      .from(workouts)
      .where(gte(workouts.date, addDays(today, -365)))
      .orderBy(desc(workouts.date), desc(workouts.id)),
    getSettings(),
  ]);
  const sets = ws.length
    ? await db
        .select()
        .from(workoutSets)
        .where(inArray(workoutSets.workoutId, ws.map((w) => w.id)))
        .orderBy(asc(workoutSets.exerciseOrder), asc(workoutSets.setOrder))
    : [];

  const data: WorkoutDTO[] = ws.map((w) => {
    const mine = sets.filter((s) => s.workoutId === w.id);
    const exercises: WorkoutDTO["exercises"] = [];
    for (const s of mine) {
      let ex = exercises.find((e) => e.order === s.exerciseOrder && e.name === s.exercise);
      if (!ex) {
        ex = { order: s.exerciseOrder, name: s.exercise, sets: [] };
        exercises.push(ex);
      }
      ex.sets.push({ reps: s.reps, weight: s.weight });
    }
    return { id: w.id, date: w.date, name: w.name, durationMin: w.durationMin, notes: w.notes, exercises };
  });

  return <MuscuView workouts={data} today={today} weeklyGoal={settings.muscuWeeklyGoal} />;
}
