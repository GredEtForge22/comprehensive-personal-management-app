"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { scheduleEvents, scheduleExceptions } from "@/db/schema";
import { isDateStr, toMin } from "@/lib/dates";

export type EventInput = {
  id?: number;
  title: string;
  category: string;
  color: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  repeat: "weekly" | "once";
  daysOfWeek: number[];
  date: string | null;
  weekParity: "all" | "A" | "B";
  validFrom: string | null;
  validUntil: string | null;
};

const timeRe = /^\d{2}:\d{2}$/;

export async function saveEvent(input: EventInput): Promise<{ error?: string }> {
  const title = input.title.trim();
  if (!title) return { error: "Donne un titre au cours / événement." };
  if (!timeRe.test(input.startTime) || !timeRe.test(input.endTime)) return { error: "Horaires invalides." };
  if (toMin(input.endTime) <= toMin(input.startTime)) return { error: "La fin doit être après le début." };
  const repeat = input.repeat === "once" ? "once" : "weekly";
  const days = Array.from(new Set(input.daysOfWeek.filter((d) => d >= 1 && d <= 7))).sort();
  if (repeat === "weekly" && days.length === 0) return { error: "Choisis au moins un jour." };
  if (repeat === "once" && !isDateStr(input.date)) return { error: "Choisis une date." };

  const values = {
    title,
    category: input.category || "autre",
    color: input.color || "#f59e0b",
    startTime: input.startTime,
    endTime: input.endTime,
    location: input.location.trim(),
    notes: input.notes.trim(),
    repeat,
    daysOfWeek: repeat === "weekly" ? days : [],
    date: repeat === "once" ? input.date : null,
    weekParity: repeat === "weekly" ? input.weekParity : "all",
    validFrom: isDateStr(input.validFrom) ? input.validFrom : null,
    validUntil: isDateStr(input.validUntil) ? input.validUntil : null,
  };

  if (input.id) {
    await db.update(scheduleEvents).set(values).where(eq(scheduleEvents.id, input.id));
  } else {
    await db.insert(scheduleEvents).values(values);
  }
  revalidatePath("/edt");
  revalidatePath("/");
  return {};
}

export async function deleteEvent(id: number) {
  await db.delete(scheduleEvents).where(eq(scheduleEvents.id, id));
  revalidatePath("/edt");
  revalidatePath("/");
}

export async function cancelOccurrence(eventId: number, date: string) {
  if (!isDateStr(date)) return;
  await db.insert(scheduleExceptions).values({ eventId, date }).onConflictDoNothing();
  revalidatePath("/edt");
  revalidatePath("/");
}

export async function restoreOccurrence(eventId: number, date: string) {
  await db
    .delete(scheduleExceptions)
    .where(and(eq(scheduleExceptions.eventId, eventId), eq(scheduleExceptions.date, date)));
  revalidatePath("/edt");
  revalidatePath("/");
}
