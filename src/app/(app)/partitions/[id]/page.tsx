import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { scoreImages, scores } from "@/db/schema";
import ScoreDetail from "@/components/ScoreDetail";

export const dynamic = "force-dynamic";

export default async function ScorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scoreId = Number(id);
  if (!Number.isInteger(scoreId)) notFound();
  const [score] = await db.select().from(scores).where(eq(scores.id, scoreId));
  if (!score) notFound();
  const imgs = await db
    .select({ id: scoreImages.id })
    .from(scoreImages)
    .where(eq(scoreImages.scoreId, scoreId))
    .orderBy(asc(scoreImages.position), asc(scoreImages.id));
  return (
    <ScoreDetail
      score={{ id: score.id, title: score.title, composer: score.composer, tags: score.tags, notes: score.notes }}
      imageIds={imgs.map((i) => i.id)}
    />
  );
}
