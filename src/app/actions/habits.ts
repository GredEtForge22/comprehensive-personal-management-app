"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { habitLogs, habits } from "@/db/schema";
import { isDateStr } from "@/lib/dates";

export type HabitInput = { id?: number; name: string; emoji: string; color: string; weeklyTarget: number };

export async function saveHabit(input: HabitInput): Promise<{ error?: string }> {
  const name = input.name.trim();
  if (!name) return { error: "Donne un nom à l'habitude." };
  const values = {
    name,
    emoji: input.emoji.trim() || "✅",
    color: input.color || "#f59e0b",
    weeklyTarget: Math.min(7, Math.max(1, Math.round(input.weeklyTarget || 7))),
  };
  if (input.id) {
    await db.update(habits).set(values).where(eq(habits.id, input.id));
  } else {
    const [m] = await db.select({ m: max(habits.position) }).from(habits);
    await db.insert(habits).values({ ...values, position: (m?.m ?? 0) + 1 });
  }
  revalidatePath("/habitudes");
  revalidatePath("/");
  return {};
}

export async function deleteHabit(id: number) {
  await db.delete(habits).where(eq(habits.id, id));
  revalidatePath("/habitudes");
  revalidatePath("/");
}

export async function setHabitDone(habitId: number, date: string, done: boolean) {
  if (!isDateStr(date)) return;
  if (done) {
    await db.insert(habitLogs).values({ habitId, date }).onConflictDoNothing();
  } else {
    await db.delete(habitLogs).where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)));
  }
  revalidatePath("/habitudes");
  revalidatePath("/");
}
