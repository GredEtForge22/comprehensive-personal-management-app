import { desc, ilike } from "drizzle-orm";
import { db } from "@/db";
import { foods } from "@/db/schema";
import type { FoodResult } from "@/lib/food-types";
import { LOCAL_FOODS, normalize } from "@/lib/foods-data";

export const dynamic = "force-dynamic";

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return typeof n === "number" && isFinite(n) ? n : null;
};

const r1 = (n: number) => Math.round(n * 10) / 10;

async function searchOpenFoodFacts(q: string): Promise<FoodResult[]> {
  const url =
    "https://search.openfoodfacts.org/search?" +
    new URLSearchParams({
      q,
      page_size: "40",
      fields: "code,product_name,brands,nutriments",
      langs: "fr",
    }).toString();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "MonPlanner/1.0 (perso)" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { hits?: Record<string, unknown>[] };
    const out: FoodResult[] = [];
    for (const h of data.hits ?? []) {
      const n = (h.nutriments ?? {}) as Record<string, unknown>;
      let kcal = num(n["energy-kcal_100g"]);
      if (kcal === null) {
        const kj = num(n["energy_100g"]);
        if (kj !== null) kcal = kj / 4.184;
      }
      const name = typeof h.product_name === "string" ? h.product_name.trim() : "";
      if (kcal === null || !name || kcal > 910) continue;
      const brandRaw = h.brands;
      const brand = Array.isArray(brandRaw) ? String(brandRaw[0] ?? "") : typeof brandRaw === "string" ? brandRaw.split(",")[0] : "";
      out.push({
        key: `off-${String(h.code ?? name)}`,
        name,
        brand: brand.trim(),
        kcal: r1(kcal),
        protein: r1(num(n["proteins_100g"]) ?? 0),
        carbs: r1(num(n["carbohydrates_100g"]) ?? 0),
        fat: r1(num(n["fat_100g"]) ?? 0),
        fiber: r1(num(n["fiber_100g"]) ?? 0),
        sugar: r1(num(n["sugars_100g"]) ?? 0),
        source: "off",
      });
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();

  // Aliments récents / favoris
  if (q.length < 2) {
    const rows = await db.select().from(foods).orderBy(desc(foods.lastUsedAt)).limit(15);
    return Response.json({ results: rows.map(toResult) });
  }

  const tokens = normalize(q).split(" ").filter(Boolean);
  const matchesAll = (s: string) => {
    const n = normalize(s);
    return tokens.every((t) => n.includes(t));
  };

  const [savedRows, off] = await Promise.all([
    db
      .select()
      .from(foods)
      .where(ilike(foods.name, `%${q}%`))
      .orderBy(desc(foods.useCount))
      .limit(8),
    searchOpenFoodFacts(q),
  ]);

  const local = LOCAL_FOODS.filter((f) => matchesAll(f.name)).sort(
    (a, b) => normalize(a.name).indexOf(tokens[0]) - normalize(b.name).indexOf(tokens[0]) || a.name.length - b.name.length,
  );
  const saved = savedRows.map(toResult);

  const seen = new Set<string>();
  const results: FoodResult[] = [];
  for (const f of [...saved, ...local, ...off]) {
    const k = `${normalize(f.name)}|${normalize(f.brand)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    results.push(f);
  }
  return Response.json({ results: results.slice(0, 40), offAvailable: off.length > 0 });
}

function toResult(r: typeof foods.$inferSelect): FoodResult {
  return {
    key: `saved-${r.id}`,
    name: r.name,
    brand: r.brand,
    kcal: r.kcal100,
    protein: r.protein100,
    carbs: r.carbs100,
    fat: r.fat100,
    fiber: r.fiber100,
    sugar: r.sugar100,
    source: "saved",
    lastGrams: r.lastGrams,
  };
}
