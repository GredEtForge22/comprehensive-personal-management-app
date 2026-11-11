"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { bodyWeights, foodEntries, foods } from "@/db/schema";
import { isDateStr } from "@/lib/dates";

export type Per100 = { kcal: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number };

const clean = (n: unknown) => {
  const v = Number(n);
  return isFinite(v) && v >= 0 ? v : 0;
};
const r1 = (n: number) => Math.round(n * 10) / 10;

export async function addFoodEntry(input: {
  date: string;
  meal: string;
  name: string;
  brand: string;
  grams: number;
  per100: Per100;
  save?: boolean;
}): Promise<{ error?: string }> {
  const name = input.name.trim();
  const grams = clean(input.grams);
  if (!isDateStr(input.date)) return { error: "Date invalide" };
  if (!name) return { error: "Nom manquant" };
  if (grams <= 0) return { error: "Quantité invalide" };
  const p = {
    kcal: clean(input.per100.kcal),
    protein: clean(input.per100.protein),
    carbs: clean(input.per100.carbs),
    fat: clean(input.per100.fat),
    fiber: clean(input.per100.fiber),
    sugar: clean(input.per100.sugar),
  };
  const k = grams / 100;
  await db.insert(foodEntries).values({
    date: input.date,
    meal: input.meal,
    name: input.brand ? `${name} (${input.brand})` : name,
    grams,
    kcal: r1(p.kcal * k),
    protein: r1(p.protein * k),
    carbs: r1(p.carbs * k),
    fat: r1(p.fat * k),
    fiber: r1(p.fiber * k),
    sugar: r1(p.sugar * k),
  });

  if (input.save !== false) {
    const brand = input.brand.trim();
    await db
      .insert(foods)
      .values({
        name,
        brand,
        kcal100: p.kcal,
        protein100: p.protein,
        carbs100: p.carbs,
        fat100: p.fat,
        fiber100: p.fiber,
        sugar100: p.sugar,
        lastGrams: grams,
        useCount: 1,
      })
      .onConflictDoUpdate({
        target: [foods.name, foods.brand],
        set: {
          useCount: sql`${foods.useCount} + 1`,
          lastGrams: grams,
          lastUsedAt: new Date(),
        },
      });
  }
  revalidatePath("/nutrition");
  revalidatePath("/");
  return {};
}

export async function updateEntryGrams(id: number, grams: number) {
  const g = clean(grams);
  if (g <= 0) return;
  const [e] = await db.select().from(foodEntries).where(eq(foodEntries.id, id));
  if (!e || e.grams <= 0) return;
  const k = g / e.grams;
  await db
    .update(foodEntries)
    .set({
      grams: g,
      kcal: r1(e.kcal * k),
      protein: r1(e.protein * k),
      carbs: r1(e.carbs * k),
      fat: r1(e.fat * k),
      fiber: r1(e.fiber * k),
      sugar: r1(e.sugar * k),
    })
    .where(eq(foodEntries.id, id));
  revalidatePath("/nutrition");
  revalidatePath("/");
}

export async function deleteEntry(id: number) {
  await db.delete(foodEntries).where(eq(foodEntries.id, id));
  revalidatePath("/nutrition");
  revalidatePath("/");
}

export async function copyDay(from: string, to: string) {
  if (!isDateStr(from) || !isDateStr(to)) return;
  const rows = await db.select().from(foodEntries).where(eq(foodEntries.date, from));
  if (rows.length === 0) return;
  await db.insert(foodEntries).values(
    rows.map((r) => ({
      date: to,
      meal: r.meal,
      name: r.name,
      grams: r.grams,
      kcal: r.kcal,
      protein: r.protein,
      carbs: r.carbs,
      fat: r.fat,
      fiber: r.fiber,
      sugar: r.sugar,
    })),
  );
  revalidatePath("/nutrition");
  revalidatePath("/");
}

export async function saveWeight(date: string, kg: number) {
  const v = clean(kg);
  if (!isDateStr(date) || v < 20 || v > 300) return;
  await db
    .insert(bodyWeights)
    .values({ date, kg: v })
    .onConflictDoUpdate({ target: bodyWeights.date, set: { kg: v } });
  revalidatePath("/nutrition");
}

export async function deleteWeight(date: string) {
  await db.delete(bodyWeights).where(and(eq(bodyWeights.date, date)));
  revalidatePath("/nutrition");
}
