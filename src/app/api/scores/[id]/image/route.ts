import { eq } from "drizzle-orm";
import { db } from "@/db";
import { scores } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  const [row] = await db.select({ image: scores.image }).from(scores).where(eq(scores.id, id));
  if (!row) return new Response("Not found", { status: 404 });
  const m = /^data:([^;]+);base64,([\s\S]*)$/.exec(row.image);
  if (!m) return new Response("Bad image", { status: 500 });
  const bytes = new Uint8Array(Buffer.from(m[2], "base64"));
  return new Response(bytes, {
    headers: {
      "Content-Type": m[1],
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
