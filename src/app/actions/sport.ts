"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { runs, workoutSets, workouts } from "@/db/schema";
import { isDateStr } from "@/lib/dates";

export type WorkoutInput = {
  id?: number;
  date: string;
  name: string;
  durationMin: number | null;
  notes: string;
  exercises: { name: string; sets: { reps: number; weight: number }[] }[];
};

export async function saveWorkout(input: WorkoutInput): Promise<{ error?: string }> {
  if (!isDateStr(input.date)) return { error: "Date invalide" };
  const exercises = input.exercises
    .map((e) => ({
      name: e.name.trim(),
      sets: e.sets.filter((s) => s.reps > 0 || s.weight > 0),
    }))
    .filter((e) => e.name && e.sets.length > 0);
  if (exercises.length === 0) return { error: "Ajoute au moins un exercice avec une série." };

  await db.transaction(async (tx) => {
    const values = {
      date: input.date,
      name: input.name.trim() || "Séance",
      durationMin: input.durationMin && input.durationMin > 0 ? Math.round(input.durationMin) : null,
      notes: input.notes.trim(),
    };
    let id = input.id;
    if (id) {
      await tx.update(workouts).set(values).where(eq(workouts.id, id));
      await tx.delete(workoutSets).where(eq(workoutSets.workoutId, id));
    } else {
      const [row] = await tx.insert(workouts).values(values).returning({ id: workouts.id });
      id = row.id;
    }
    const rows = exercises.flatMap((e, ei) =>
      e.sets.map((s, si) => ({
        workoutId: id as number,
        exercise: e.name,
        exerciseOrder: ei,
        setOrder: si,
        reps: Math.max(0, Math.round(s.reps)),
        weight: Math.max(0, s.weight),
      })),
    );
    await tx.insert(workoutSets).values(rows);
  });
  revalidatePath("/muscu");
  revalidatePath("/");
  return {};
}

export async function deleteWorkout(id: number) {
  await db.delete(workouts).where(eq(workouts.id, id));
  revalidatePath("/muscu");
  revalidatePath("/");
}

export type RunInput = {
  id?: number;
  date: string;
  distanceKm: number;
  durationSec: number;
  kind: string;
  feeling: number | null;
  avgHr: number | null;
  notes: string;
};

export async function saveRun(input: RunInput): Promise<{ error?: string }> {
  if (!isDateStr(input.date)) return { error: "Date invalide" };
  if (!(input.distanceKm > 0)) return { error: "Distance invalide" };
  if (!(input.durationSec > 0)) return { error: "Durée invalide" };
  const values = {
    date: input.date,
    distanceKm: input.distanceKm,
    durationSec: Math.round(input.durationSec),
    kind: input.kind || "footing",
    feeling: input.feeling && input.feeling >= 1 && input.feeling <= 5 ? input.feeling : null,
    avgHr: input.avgHr && input.avgHr > 0 ? Math.round(input.avgHr) : null,
    notes: input.notes.trim(),
  };
  if (input.id) await db.update(runs).set(values).where(eq(runs.id, input.id));
  else await db.insert(runs).values(values);
  revalidatePath("/course");
  revalidatePath("/");
  return {};
}

export async function deleteRun(id: number) {
  await db.delete(runs).where(eq(runs.id, id));
  revalidatePath("/course");
  revalidatePath("/");
}
