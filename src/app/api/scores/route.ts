import { NextResponse } from "next/server";
import { asc, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { scores } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: scores.id,
      title: scores.title,
      tags: scores.tags,
      pos: scores.pos,
      thumb: scores.thumb,
    })
    .from(scores)
    .orderBy(asc(scores.pos), asc(scores.id));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    title?: string;
    tags?: string;
    thumb?: string;
    image?: string;
  };
  if (!body.thumb?.startsWith("data:image/") || !body.image?.startsWith("data:image/")) {
    return NextResponse.json({ error: "image invalide" }, { status: 400 });
  }
  const [m] = await db.select({ v: max(scores.pos) }).from(scores);
  const [row] = await db
    .insert(scores)
    .values({
      title: body.title ?? "",
      tags: body.tags ?? "",
      thumb: body.thumb,
      image: body.image,
      pos: (m?.v ?? 0) + 1,
    })
    .returning({
      id: scores.id,
      title: scores.title,
      tags: scores.tags,
      pos: scores.pos,
      thumb: scores.thumb,
    });
  return NextResponse.json(row);
}

// Réordonner : { order: [id, id, ...] }
export async function PUT(req: Request) {
  const body = (await req.json()) as { order?: number[] };
  const order = body.order ?? [];
  for (let i = 0; i < order.length; i++) {
    await db.update(scores).set({ pos: i + 1 }).where(eq(scores.id, order[i]));
  }
  return NextResponse.json({ ok: true });
}
