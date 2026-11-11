"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { checkins, grades, tasks } from "@/db/schema";
import { isDateStr, isoWeek, todayStr } from "@/lib/dates";
import { saveSettings, type Settings } from "@/lib/settings";

/* ---------------------------- Tâches ---------------------------- */
export type TaskInput = { id?: number; title: string; kind: string; subject: string; dueDate: string | null; notes: string };

export async function saveTask(input: TaskInput): Promise<{ error?: string }> {
  const title = input.title.trim();
  if (!title) return { error: "Donne un titre." };
  const values = {
    title,
    kind: input.kind || "devoir",
    subject: input.subject.trim(),
    dueDate: isDateStr(input.dueDate) ? input.dueDate : null,
    notes: input.notes.trim(),
  };
  if (input.id) await db.update(tasks).set(values).where(eq(tasks.id, input.id));
  else await db.insert(tasks).values(values);
  revalidatePath("/devoirs");
  revalidatePath("/");
  return {};
}

export async function setTaskDone(id: number, done: boolean) {
  await db.update(tasks).set({ done }).where(eq(tasks.id, id));
  revalidatePath("/devoirs");
  revalidatePath("/");
}

export async function deleteTask(id: number) {
  await db.delete(tasks).where(eq(tasks.id, id));
  revalidatePath("/devoirs");
  revalidatePath("/");
}

/* ----------------------------- Notes ----------------------------- */
export type GradeInput = { id?: number; subject: string; title: string; grade: number; outOf: number; coef: number; date: string };

export async function saveGrade(input: GradeInput): Promise<{ error?: string }> {
  const subject = input.subject.trim();
  if (!subject) return { error: "Choisis une matière." };
  if (!isFinite(input.grade) || input.grade < 0) return { error: "Note invalide." };
  if (!(input.outOf > 0)) return { error: "Barème invalide." };
  if (!isDateStr(input.date)) return { error: "Date invalide." };
  const values = {
    subject,
    title: input.title.trim(),
    grade: input.grade,
    outOf: input.outOf,
    coef: input.coef > 0 ? input.coef : 1,
    date: input.date,
  };
  if (input.id) await db.update(grades).set(values).where(eq(grades.id, input.id));
  else await db.insert(grades).values(values);
  revalidatePath("/notes");
  return {};
}

export async function deleteGrade(id: number) {
  await db.delete(grades).where(eq(grades.id, id));
  revalidatePath("/notes");
}

/* ------------------------- Bilan du jour ------------------------- */
export async function saveCheckin(input: { date: string; sleepHours: number | null; mood: number | null; energy: number | null; note: string }) {
  if (!isDateStr(input.date)) return;
  const values = {
    sleepHours: input.sleepHours && input.sleepHours > 0 && input.sleepHours <= 24 ? input.sleepHours : null,
    mood: input.mood,
    energy: input.energy,
    note: input.note.trim(),
  };
  await db
    .insert(checkins)
    .values({ date: input.date, ...values })
    .onConflictDoUpdate({ target: checkins.date, set: values });
  revalidatePath("/");
}

/* ----------------------------- Réglages ----------------------------- */
export async function updateSettings(partial: Partial<Settings>) {
  await saveSettings(partial);
  revalidatePath("/", "layout");
}

export async function setCurrentWeekParity(parity: "A" | "B") {
  const odd = isoWeek(todayStr()) % 2 === 1;
  await saveSettings({ weekAOdd: parity === "A" ? odd : !odd });
  revalidatePath("/", "layout");
}
