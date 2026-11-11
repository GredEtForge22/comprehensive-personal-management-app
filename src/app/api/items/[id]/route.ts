import { NextResponse } from "next/server";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { items } from "@/db/schema";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id invalide" }, { status: 400 });
  const body = (await req.json()) as Record<string, unknown>;
  const [existing] = await db.select().from(items).where(eq(items.id, id));
  if (!existing) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  const { date, id: _id, ...patch } = body;
  void _id;
  const data = { ...existing.data, ...patch };
  const newDate = date === undefined ? existing.date : typeof date === "string" && date ? date : null;
  const [row] = await db
    .update(items)
    .set({ data, date: newDate })
    .where(eq(items.id, id))
    .returning();
  return NextResponse.json({ ...row.data, id: row.id, date: row.date ?? "" });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id invalide" }, { status: 400 });
  const [existing] = await db.select().from(items).where(eq(items.id, id));
  if (!existing) return NextResponse.json({ ok: true });
  // Suppressions en cascade
  if (existing.kind === "habit") {
    await db
      .delete(items)
      .where(sql`${items.kind} = 'habitcheck' AND ${items.data}->>'habitId' = ${String(id)}`);
  }
  if (existing.kind === "course") {
    await db
      .delete(items)
      .where(sql`${items.kind} = 'cancel' AND ${items.data}->>'courseId' = ${String(id)}`);
  }
  if (existing.kind === "subject") {
    await db
      .delete(items)
      .where(
        sql`${inArray(items.kind, ["chapter", "card", "grade"])} AND ${items.data}->>'subjectId' = ${String(id)}`,
      );
  }
  await db.delete(items).where(eq(items.id, id));
  return NextResponse.json({ ok: true });
}
