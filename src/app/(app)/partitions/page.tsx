import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { scoreImages, scores } from "@/db/schema";
import ScoresView from "@/components/ScoresView";

export const dynamic = "force-dynamic";

export default async function ScoresPage() {
  const [list, imgs] = await Promise.all([
    db.select().from(scores).orderBy(desc(scores.createdAt)),
    db
      .select({ id: scoreImages.id, scoreId: scoreImages.scoreId, position: scoreImages.position })
      .from(scoreImages)
      .orderBy(asc(scoreImages.position), asc(scoreImages.id)),
  ]);
  return (
    <ScoresView
      scores={list.map((s) => {
        const mine = imgs.filter((i) => i.scoreId === s.id);
        return {
          id: s.id,
          title: s.title,
          composer: s.composer,
          tags: s.tags,
          pages: mine.length,
          coverId: mine[0]?.id ?? null,
        };
      })}
    />
  );
}
