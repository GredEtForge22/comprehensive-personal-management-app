import { asc } from "drizzle-orm";
import { db } from "@/db";
import { items, scores, settings } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const [allItems, allSettings, allScores] = await Promise.all([
    db.select().from(items).orderBy(asc(items.id)),
    db.select().from(settings),
    db
      .select({ id: scores.id, title: scores.title, tags: scores.tags, pos: scores.pos, createdAt: scores.createdAt })
      .from(scores),
  ]);
  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      note: "Les images de partitions ne sont pas incluses (seulement leurs métadonnées).",
      settings: allSettings,
      items: allItems,
      scores: allScores,
    },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
