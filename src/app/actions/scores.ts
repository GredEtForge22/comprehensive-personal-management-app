"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { scoreImages, scores } from "@/db/schema";

export type ScoreMeta = { title: string; composer: string; tags: string; notes: string };

export async function createScore(meta: ScoreMeta): Promise<{ id?: number; error?: string }> {
  const title = meta.title.trim();
  if (!title) return { error: "Donne un titre à la partition." };
  const [row] = await db
    .insert(scores)
    .values({ title, composer: meta.composer.trim(), tags: meta.tags.trim(), notes: meta.notes.trim() })
    .returning({ id: scores.id });
  revalidatePath("/partitions");
  return { id: row.id };
}

export async function updateScore(id: number, meta: ScoreMeta): Promise<{ error?: string }> {
  const title = meta.title.trim();
  if (!title) return { error: "Donne un titre à la partition." };
  await db
    .update(scores)
    .set({ title, composer: meta.composer.trim(), tags: meta.tags.trim(), notes: meta.notes.trim() })
    .where(eq(scores.id, id));
  revalidatePath("/partitions");
  revalidatePath(`/partitions/${id}`);
  return {};
}

export async function deleteScore(id: number) {
  await db.delete(scores).where(eq(scores.id, id));
  revalidatePath("/partitions");
}

export async function deleteScoreImage(scoreId: number, imageId: number) {
  await db.delete(scoreImages).where(and(eq(scoreImages.id, imageId), eq(scoreImages.scoreId, scoreId)));
  revalidatePath("/partitions");
  revalidatePath(`/partitions/${scoreId}`);
}

export async function moveScoreImage(scoreId: number, imageId: number, direction: -1 | 1) {
  const imgs = await db
    .select({ id: scoreImages.id, position: scoreImages.position })
    .from(scoreImages)
    .where(eq(scoreImages.scoreId, scoreId));
  imgs.sort((a, b) => a.position - b.position || a.id - b.id);
  const i = imgs.findIndex((x) => x.id === imageId);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= imgs.length) return;
  [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
  await db.transaction(async (tx) => {
    for (let k = 0; k < imgs.length; k++) {
      await tx.update(scoreImages).set({ position: k }).where(eq(scoreImages.id, imgs[k].id));
    }
  });
  revalidatePath(`/partitions/${scoreId}`);
  revalidatePath("/partitions");
}
