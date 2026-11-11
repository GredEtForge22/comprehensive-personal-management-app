import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { bodyWeights, foodEntries } from "@/db/schema";
import { addDays, isDateStr, todayStr } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import NutritionView from "@/components/NutritionView";

export const dynamic = "force-dynamic";

export default async function NutritionPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const today = todayStr();
  const date = isDateStr(sp.date) ? sp.date : today;
  const [entries, range, weights, settings] = await Promise.all([
    db.select().from(foodEntries).where(eq(foodEntries.date, date)).orderBy(asc(foodEntries.id)),
    db
      .select()
      .from(foodEntries)
      .where(and(gte(foodEntries.date, addDays(date, -6)), lte(foodEntries.date, date))),
    db.select().from(bodyWeights).where(gte(bodyWeights.date, addDays(today, -120))).orderBy(asc(bodyWeights.date)),
    getSettings(),
  ]);

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(date, i - 6);
    const rows = range.filter((r) => r.date === d);
    return { date: d, kcal: rows.reduce((s, r) => s + r.kcal, 0), protein: rows.reduce((s, r) => s + r.protein, 0) };
  });

  return (
    <NutritionView
      date={date}
      today={today}
      entries={entries.map((e) => ({
        id: e.id,
        meal: e.meal,
        name: e.name,
        grams: e.grams,
        kcal: e.kcal,
        protein: e.protein,
        carbs: e.carbs,
        fat: e.fat,
        fiber: e.fiber,
        sugar: e.sugar,
      }))}
      week={week}
      weights={weights.map((w) => ({ date: w.date, kg: w.kg }))}
      goals={{
        kcal: settings.kcalGoal,
        protein: settings.proteinGoal,
        carbs: settings.carbsGoal,
        fat: settings.fatGoal,
      }}
    />
  );
}
