import { asc } from "drizzle-orm";
import { db } from "@/db";
import { grades } from "@/db/schema";
import { todayStr } from "@/lib/dates";
import GradesView from "@/components/GradesView";

export const dynamic = "force-dynamic";

export default async function GradesPage() {
  const rows = await db.select().from(grades).orderBy(asc(grades.date), asc(grades.id));
  return (
    <GradesView
      today={todayStr()}
      grades={rows.map((g) => ({ id: g.id, subject: g.subject, title: g.title, grade: g.grade, outOf: g.outOf, coef: g.coef, date: g.date }))}
    />
  );
}
