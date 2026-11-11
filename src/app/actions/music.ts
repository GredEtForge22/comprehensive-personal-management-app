"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { pieces, practiceSessions } from "@/db/schema";
import { isDateStr } from "@/lib/dates";

export type PracticeInput = {
  id?: number;
  date: string;
  minutes: number;
  category: string;
  piece: string;
  tempoBpm: number | null;
  quality: number | null;
  notes: string;
};

export async function savePractice(input: PracticeInput): Promise<{ error?: string }> {
  if (!isDateStr(input.date)) return { error: "Date invalide" };
  if (!(input.minutes > 0)) return { error: "Indique une durée." };
  const values = {
    date: input.date,
    minutes: Math.round(input.minutes),
    category: input.category || "technique",
    piece: input.piece.trim(),
    tempoBpm: input.tempoBpm && input.tempoBpm > 0 ? Math.round(input.tempoBpm) : null,
    quality: input.quality && input.quality >= 1 && input.quality <= 5 ? input.quality : null,
    notes: input.notes.trim(),
  };
  if (input.id) await db.update(practiceSessions).set(values).where(eq(practiceSessions.id, input.id));
  else await db.insert(practiceSessions).values(values);

  // Met à jour le tempo atteint du morceau correspondant
  if (values.piece && values.tempoBpm) {
    await db.update(pieces).set({ currentBpm: values.tempoBpm }).where(eq(pieces.title, values.piece));
  }
  revalidatePath("/musique");
  revalidatePath("/");
  return {};
}

export async function deletePractice(id: number) {
  await db.delete(practiceSessions).where(eq(practiceSessions.id, id));
  revalidatePath("/musique");
  revalidatePath("/");
}

export type PieceInput = {
  id?: number;
  title: string;
  composer: string;
  status: string;
  currentBpm: number | null;
  targetBpm: number | null;
  deadline: string | null;
  notes: string;
};

export async function savePiece(input: PieceInput): Promise<{ error?: string }> {
  const title = input.title.trim();
  if (!title) return { error: "Donne un titre." };
  const values = {
    title,
    composer: input.composer.trim(),
    status: input.status || "en_travail",
    currentBpm: input.currentBpm && input.currentBpm > 0 ? Math.round(input.currentBpm) : null,
    targetBpm: input.targetBpm && input.targetBpm > 0 ? Math.round(input.targetBpm) : null,
    deadline: isDateStr(input.deadline) ? input.deadline : null,
    notes: input.notes.trim(),
  };
  if (input.id) await db.update(pieces).set(values).where(eq(pieces.id, input.id));
  else await db.insert(pieces).values(values);
  revalidatePath("/musique");
  revalidatePath("/");
  return {};
}

export async function deletePiece(id: number) {
  await db.delete(pieces).where(eq(pieces.id, id));
  revalidatePath("/musique");
}
