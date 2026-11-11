import { eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { scoreImages, scores } from "@/db/schema";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4_000_000;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const scoreId = Number(id);
  if (!Number.isInteger(scoreId)) return new Response("Identifiant invalide", { status: 400 });

  const [score] = await db.select({ id: scores.id }).from(scores).where(eq(scores.id, scoreId));
  if (!score) return new Response("Partition introuvable", { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  const thumb = form.get("thumb");
  if (!(file instanceof File) || file.size === 0) return new Response("Fichier manquant", { status: 400 });
  if (file.size > MAX_BYTES) return new Response("Image trop lourde", { status: 413 });
  if (!file.type.startsWith("image/")) return new Response("Format non supporté", { status: 415 });

  const data = Buffer.from(await file.arrayBuffer());
  const thumbData = thumb instanceof File && thumb.size > 0 ? Buffer.from(await thumb.arrayBuffer()) : null;

  const [m] = await db.select({ m: max(scoreImages.position) }).from(scoreImages).where(eq(scoreImages.scoreId, scoreId));
  const [row] = await db
    .insert(scoreImages)
    .values({ scoreId, position: (m?.m ?? -1) + 1, mime: file.type, data, thumb: thumbData })
    .returning({ id: scoreImages.id });

  revalidatePath("/partitions");
  revalidatePath(`/partitions/${scoreId}`);
  return Response.json({ id: row.id });
}
