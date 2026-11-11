import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { scores } from "@/db/schema";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const id = Number((await ctx.params).id);
  const body = (await req.json()) as { title?: string; tags?: string };
  const set: { title?: string; tags?: string } = {};
  if (typeof body.title === "string") set.title = body.title;
  if (typeof body.tags === "string") set.tags = body.tags;
  if (Object.keys(set).length) await db.update(scores).set(set).where(eq(scores.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const id = Number((await ctx.params).id);
  await db.delete(scores).where(eq(scores.id, id));
  return NextResponse.json({ ok: true });
}
