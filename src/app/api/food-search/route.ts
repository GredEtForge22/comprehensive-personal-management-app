import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type OffProduct = {
  product_name?: string;
  product_name_fr?: string;
  brands?: string;
  nutriments?: Record<string, number | string | undefined>;
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
};

// Recherche Open Food Facts (sans clé API), renvoie des valeurs pour 100 g.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);
  const url =
    "https://world.openfoodfacts.org/cgi/search.pl?" +
    new URLSearchParams({
      search_terms: q,
      search_simple: "1",
      action: "process",
      json: "1",
      page_size: "14",
      lc: "fr",
      fields: "product_name,product_name_fr,brands,nutriments",
    }).toString();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "SaxLife/1.0 (app perso)" },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return NextResponse.json([]);
    const json = (await res.json()) as { products?: OffProduct[] };
    const out = (json.products ?? [])
      .map((p) => {
        const n = p.nutriments ?? {};
        const kcal =
          n["energy-kcal_100g"] !== undefined
            ? num(n["energy-kcal_100g"])
            : n["energy_100g"] !== undefined
              ? Math.round(num(n["energy_100g"]) / 4.184)
              : NaN;
        return {
          name: (p.product_name_fr || p.product_name || "").trim(),
          brand: (p.brands ?? "").split(",")[0]?.trim() ?? "",
          kcal,
          protein: num(n["proteins_100g"]),
          carbs: num(n["carbohydrates_100g"]),
          fat: num(n["fat_100g"]),
          fiber: num(n["fiber_100g"]),
          sugar: num(n["sugars_100g"]),
        };
      })
      .filter((p) => p.name && Number.isFinite(p.kcal));
    return NextResponse.json(out);
  } catch {
    return NextResponse.json([]);
  }
}
