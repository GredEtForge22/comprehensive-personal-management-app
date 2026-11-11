"use client";

import { useEffect, useMemo, useState } from "react";
import { Field, Modal, NumInput } from "@/components/ui";
import { LOCAL_FOODS, parseQuantity, scaleMacros, searchFoods, type Food } from "@/lib/foods";
import { useItems } from "@/lib/store";
import type { Macros, Meal } from "@/lib/types";

export const MEALS = ["Petit-déjeuner", "Déjeuner", "Collation", "Dîner"];

const zero: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 };

export default function AddFood({
  open,
  meal: initialMeal,
  date,
  onClose,
}: {
  open: boolean;
  meal: string;
  date: string;
  onClose: () => void;
}) {
  const meals = useItems<Meal>("meal");
  const [mode, setMode] = useState<"search" | "manual">("search");
  const [query, setQuery] = useState("");
  const [meal, setMeal] = useState(initialMeal);
  const [off, setOff] = useState<Food[]>([]);
  const [offLoading, setOffLoading] = useState(false);
  const [chosen, setChosen] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const [manual, setManual] = useState({ name: "", grams: 0, ...zero });
  const [seen, setSeen] = useState({ open: false, meal: initialMeal });

  // réinitialise à l'ouverture
  if (seen.open !== open || seen.meal !== initialMeal) {
    setSeen({ open, meal: initialMeal });
    if (open) {
      setMeal(initialMeal);
      setQuery("");
      setChosen(null);
      setOff([]);
      setMode("search");
      setManual({ name: "", grams: 0, ...zero });
    }
  }

  const parsed = useMemo(() => parseQuantity(query), [query]);
  const text = parsed.text.trim();

  const recents = useMemo<Food[]>(() => {
    const seenNames = new Set<string>();
    const out: Food[] = [];
    [...meals.items].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).forEach((m) => {
      const key = m.name.toLowerCase();
      if (seenNames.has(key)) return;
      seenNames.add(key);
      const per100 =
        m.per100 ??
        (m.grams > 0
          ? {
              kcal: (m.kcal / m.grams) * 100,
              protein: (m.protein / m.grams) * 100,
              carbs: (m.carbs / m.grams) * 100,
              fat: (m.fat / m.grams) * 100,
              fiber: (m.fiber / m.grams) * 100,
              sugar: (m.sugar / m.grams) * 100,
            }
          : null);
      if (per100) out.push({ name: m.name, brand: m.brand, ...per100, portion: m.grams > 0 ? { label: "dernière fois", g: m.grams } : undefined, source: "recent" });
    });
    return out.slice(0, 80);
  }, [meals.items]);

  const local = useMemo(() => searchFoods(LOCAL_FOODS, text, 8), [text]);
  const recent = useMemo(() => (text ? searchFoods(recents, text, 5) : recents.slice(0, 8)), [recents, text]);

  // recherche Open Food Facts (débounce)
  useEffect(() => {
    if (!open || mode !== "search" || text.length < 3) {
      setOff([]);
      setOffLoading(false);
      return;
    }
    let cancelled = false;
    setOffLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/food-search?q=${encodeURIComponent(text)}`);
        const json = (await res.json()) as Food[];
        if (!cancelled) setOff(json.map((f) => ({ ...f, source: "off" as const })));
      } catch {
        if (!cancelled) setOff([]);
      } finally {
        if (!cancelled) setOffLoading(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [text, open, mode]);

  function choose(f: Food) {
    setChosen(f);
    if (parsed.grams) setGrams(parsed.grams);
    else if (parsed.count && f.portion && f.portion.label !== "dernière fois") setGrams(parsed.count * f.portion.g);
    else setGrams(f.portion?.g ?? 100);
  }

  const preview = chosen ? scaleMacros(chosen, grams) : zero;

  async function addChosen() {
    if (!chosen || grams <= 0) return;
    await meals.add(
      {
        meal,
        name: chosen.name,
        brand: chosen.brand || undefined,
        grams,
        ...preview,
        per100: { kcal: chosen.kcal, protein: chosen.protein, carbs: chosen.carbs, fat: chosen.fat, fiber: chosen.fiber, sugar: chosen.sugar },
      },
      date,
    );
    onClose();
  }

  async function addManual() {
    if (!manual.name.trim()) return;
    await meals.add(
      {
        meal,
        name: manual.name.trim(),
        grams: manual.grams,
        kcal: manual.kcal,
        protein: manual.protein,
        carbs: manual.carbs,
        fat: manual.fat,
        fiber: manual.fiber,
        sugar: manual.sugar,
        per100: manual.grams > 0 ? undefined : undefined,
      },
      date,
    );
    onClose();
  }

  const Row = ({ f }: { f: Food }) => (
    <button
      onClick={() => choose(f)}
      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-zinc-800"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{f.name}</span>
        {f.brand && <span className="block truncate text-xs text-zinc-500">{f.brand}</span>}
      </span>
      <span className="shrink-0 text-right text-[11px] text-zinc-400">
        <b className="text-zinc-200">{Math.round(f.kcal)} kcal</b>
        <br />P {Math.round(f.protein)} · G {Math.round(f.carbs)} · L {Math.round(f.fat)}
        <span className="text-zinc-600"> /100g</span>
      </span>
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} title="Ajouter un aliment" wide>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select className="input !w-auto" value={meal} onChange={(e) => setMeal(e.target.value)}>
            {MEALS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <button className={`chip ${mode === "search" ? "chip-on" : ""}`} onClick={() => setMode("search")}>
            🔍 Recherche auto
          </button>
          <button className={`chip ${mode === "manual" ? "chip-on" : ""}`} onClick={() => setMode("manual")}>
            ✍️ Saisie manuelle
          </button>
        </div>

        {mode === "search" && !chosen && (
          <>
            <input
              className="input"
              autoFocus
              placeholder="Tape un aliment : « 200g riz », « 3 oeufs », « skyr »…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="max-h-[50vh] space-y-3 overflow-y-auto">
              {recent.length > 0 && (
                <div>
                  <div className="px-3 pb-1 text-[11px] tracking-wide text-zinc-500 uppercase">{text ? "Tes aliments récents" : "Récents"}</div>
                  {recent.map((f) => (
                    <Row key={"r" + f.name} f={f} />
                  ))}
                </div>
              )}
              {local.length > 0 && (
                <div>
                  <div className="px-3 pb-1 text-[11px] tracking-wide text-zinc-500 uppercase">Aliments courants</div>
                  {local.map((f) => (
                    <Row key={"l" + f.name} f={f} />
                  ))}
                </div>
              )}
              {text.length >= 3 && (
                <div>
                  <div className="px-3 pb-1 text-[11px] tracking-wide text-zinc-500 uppercase">
                    Open Food Facts {offLoading && <span className="animate-pulse">· recherche…</span>}
                  </div>
                  {off.map((f, i) => (
                    <Row key={"o" + i + f.name} f={f} />
                  ))}
                  {!offLoading && off.length === 0 && <p className="px-3 text-xs text-zinc-600">Aucun produit trouvé.</p>}
                </div>
              )}
              {text.length > 0 && local.length === 0 && recent.length === 0 && !offLoading && off.length === 0 && (
                <p className="px-3 text-sm text-zinc-500">
                  Rien trouvé.{" "}
                  <button
                    className="text-amber-300 underline"
                    onClick={() => {
                      setManual({ ...manual, name: text });
                      setMode("manual");
                    }}
                  >
                    Saisir à la main
                  </button>
                </p>
              )}
            </div>
          </>
        )}

        {mode === "search" && chosen && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{chosen.name}</div>
                {chosen.brand && <div className="text-xs text-zinc-500">{chosen.brand}</div>}
              </div>
              <button className="btn btn-sm" onClick={() => setChosen(null)}>
                ← Retour
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantité (g ou ml)">
                <NumInput value={grams} onChange={setGrams} />
              </Field>
              <Field label="Portions rapides">
                <div className="flex flex-wrap gap-1.5">
                  {[50, 100, 150, 200, 250].map((g) => (
                    <button key={g} className="chip" onClick={() => setGrams(g)}>
                      {g}
                    </button>
                  ))}
                  {chosen.portion && (
                    <button className="chip" onClick={() => setGrams(chosen.portion!.g)}>
                      1 {chosen.portion.label} ({chosen.portion.g} g)
                    </button>
                  )}
                </div>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
              {(
                [
                  ["kcal", preview.kcal, ""],
                  ["Prot.", preview.protein, "g"],
                  ["Gluc.", preview.carbs, "g"],
                  ["Lip.", preview.fat, "g"],
                  ["Fibres", preview.fiber, "g"],
                  ["Sucres", preview.sugar, "g"],
                ] as const
              ).map(([l, v, u]) => (
                <div key={l} className="rounded-xl bg-zinc-800/70 p-2">
                  <div className="text-lg font-bold">
                    {v}
                    <span className="text-xs text-zinc-500">{u}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 uppercase">{l}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button className="btn btn-primary" onClick={addChosen} disabled={grams <= 0}>
                Ajouter à {meal.toLowerCase()}
              </button>
            </div>
          </div>
        )}

        {mode === "manual" && (
          <div className="space-y-3">
            <Field label="Nom">
              <input className="input" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(
                [
                  ["Quantité (g)", "grams"],
                  ["Calories (kcal)", "kcal"],
                  ["Protéines (g)", "protein"],
                  ["Glucides (g)", "carbs"],
                  ["Lipides (g)", "fat"],
                  ["Fibres (g)", "fiber"],
                  ["Sucres (g)", "sugar"],
                ] as const
              ).map(([l, k]) => (
                <Field key={k} label={l}>
                  <NumInput value={manual[k]} step={0.1} onChange={(n) => setManual({ ...manual, [k]: n })} />
                </Field>
              ))}
            </div>
            <div className="flex justify-end">
              <button className="btn btn-primary" onClick={addManual} disabled={!manual.name.trim()}>
                Ajouter
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
