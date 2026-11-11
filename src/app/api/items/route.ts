import { NextResponse } from "next/server";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { items } from "@/db/schema";

export const dynamic = "force-dynamic";

const KIND = /^[a-z]{2,24}$/;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") ?? "";
  if (!KIND.test(kind)) return NextResponse.json({ error: "kind invalide" }, { status: 400 });
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const conds = [eq(items.kind, kind)];
  if (from) conds.push(gte(items.date, from));
  if (to) conds.push(lte(items.date, to));
  const rows = await db
    .select()
    .from(items)
    .where(and(...conds))
    .orderBy(asc(items.date), asc(items.id));
  return NextResponse.json(
    rows.map((r) => ({ ...r.data, id: r.id, date: r.date ?? "" })),
  );
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") ?? "";
  if (!KIND.test(kind)) return NextResponse.json({ error: "kind invalide" }, { status: 400 });
  const body = (await req.json()) as Record<string, unknown>;
  const { date, id: _id, ...data } = body;
  void _id;
  const [row] = await db
    .insert(items)
    .values({ kind, date: typeof date === "string" && date ? date : null, data })
    .returning();
  return NextResponse.json({ ...row.data, id: row.id, date: row.date ?? "" });
}
