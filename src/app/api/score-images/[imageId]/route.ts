import { eq } from "drizzle-orm";
import { db } from "@/db";
import { scoreImages } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ imageId: string }> }) {
  const { imageId } = await ctx.params;
  const id = Number(imageId);
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });
  const wantThumb = new URL(req.url).searchParams.get("t") === "thumb";

  const [row] = await db
    .select({ data: scoreImages.data, thumb: scoreImages.thumb, mime: scoreImages.mime })
    .from(scoreImages)
    .where(eq(scoreImages.id, id));
  if (!row) return new Response("Not found", { status: 404 });

  const buf = wantThumb && row.thumb ? row.thumb : row.data;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": row.mime || "image/jpeg",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
