import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

export const dynamic = "force-dynamic";

async function read() {
  const [row] = await db.select().from(settings).where(eq(settings.key, "app"));
  return row?.value ?? {};
}

export async function GET() {
  return NextResponse.json(await read());
}

export async function PUT(req: Request) {
  const patch = (await req.json()) as Record<string, unknown>;
  const value = { ...(await read()), ...patch };
  await db
    .insert(settings)
    .values({ key: "app", value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
  return NextResponse.json(value);
}
