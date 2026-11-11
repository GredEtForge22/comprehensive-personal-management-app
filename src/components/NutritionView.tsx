"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { BarChart, LineChart, PageHeader, ProgressBar, Ring } from "@/components/charts";
import { addDays, fmtLong, fmtShort } from "@/lib/dates";
import { MEALS, type FoodResult } from "@/lib/food-types";
import {
  addFoodEntry,
  copyDay,
  deleteEntry,
  deleteWeight,
  saveWeight,
  updateEntryGrams,
} from "@/app/actions/nutrition";

type Entry = {
  id: number;
  meal: string;
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
};

const r0 = (n: number) => Math.round(n);
const r1 = (n: number) => Math.round(n * 10) / 10;
const toNum = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return isFinite(n) ? n : 0;
};

export default function NutritionView({
  date,
  today,
  entries,
  week,
  weights,
  goals,
}: {
  date: string;
  today: string;
  entries: Entry[];
  week: { date: string; kcal: number; protein: number }[];
  weights: { date: string; kg: number }[];
  goals: { kcal: number; protein: number; carbs: number; fat: number };
}) {
  const [adding, setAdding] = useState<string | null>(null);
  const [, start] = useTransition();
  const [weightInput, setWeightInput] = useState("");

  const sum = (k: keyof Entry) => entries.reduce((s, e) => s + (e[k] as number), 0);
  const kcal = sum("kcal");
  const protein = sum("protein");
  const carbs = sum("carbs");
  const fat = sum("fat");
  const fiber = sum("fiber");
  const sugar = sum("sugar");

  const lastWeight = weights[weights.length - 1];

  return (
    <div>
      <PageHeader title="Nutrition" icon="🥗" subtitle={fmtLong(date)}>
        <Link href={`/nutrition?date=${addDays(date, -1)}`} className="btn btn-ghost btn-sm">
          ←
        </Link>
        <Link href="/nutrition" className={`btn btn-sm ${date === today ? "btn-ghost" : "btn-primary"}`}>
          Aujourd&apos;hui
        </Link>
        <Link href={`/nutrition?date=${addDays(date, 1)}`} className="btn btn-ghost btn-sm">
          →
        </Link>
      </PageHeader>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <div className="card flex items-center gap-5 lg:col-span-2">
          <Ring value={kcal} max={goals.kcal} size={120} color={kcal > goals.kcal * 1.1 ? "#ef4444" : "#f59e0b"}>
            <div>
              <div className="text-2xl font-semibold">{r0(kcal)}</div>
              <div className="text-[10px] text-zinc-400">/ {goals.kcal} kcal</div>
            </div>
          </Ring>
          <div className="min-w-0 flex-1 space-y-2.5">
            <Macro label="Protéines" value={protein} goal={goals.protein} color="#ef4444" />
            <Macro label="Glucides" value={carbs} goal={goals.carbs} color="#3b82f6" />
            <Macro label="Lipides" value={fat} goal={goals.fat} color="#eab308" />
            <div className="flex gap-4 text-xs text-zinc-400">
              <span>Fibres : {r0(fiber)} g</span>
              <span>Sucres : {r0(sugar)} g</span>
              <span>Reste : {r0(goals.kcal - kcal)} kcal</span>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="h-section">7 derniers jours (kcal)</div>
          <BarChart
            data={week.map((w) => ({ label: w.date.slice(8), value: Math.round(w.kcal) }))}
            goal={goals.kcal}
            height={110}
            format={(n) => String(Math.round(n))}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {MEALS.map((m) => {
            const rows = entries.filter((e) => e.meal === m.id);
            const mk = rows.reduce((s, e) => s + e.kcal, 0);
            return (
              <div key={m.id} className="card">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-medium">
                    {m.icon} {m.label} <span className="ml-1 text-sm font-normal text-zinc-400">{r0(mk)} kcal</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setAdding(m.id)}>
                    + Ajouter
                  </button>
                </div>
                {rows.length === 0 ? (
                  <p className="text-xs text-zinc-500">Rien d&apos;ajouté.</p>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {rows.map((e) => (
                      <EntryRow key={`${e.id}-${e.grams}`} e={e} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={() => setAdding("auto")}>
              🔎 Rechercher un aliment
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                if (confirm(`Copier tous les repas du ${fmtShort(addDays(date, -1))} vers ce jour ?`))
                  start(() => copyDay(addDays(date, -1), date));
              }}
            >
              Copier la veille
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <div className="h-section">⚖️ Poids</div>
            <div className="mb-3 flex gap-2">
              <input
                className="input"
                inputMode="decimal"
                placeholder={lastWeight ? `${lastWeight.kg} kg` : "kg"}
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
              />
              <button
                className="btn btn-primary"
                onClick={() => {
                  const v = toNum(weightInput);
                  if (v > 0)
                    start(async () => {
                      await saveWeight(date, v);
                      setWeightInput("");
                    });
                }}
              >
                OK
              </button>
            </div>
            <LineChart
              points={weights.slice(-30).map((w) => ({ label: fmtShort(w.date), value: w.kg }))}
              unit=" kg"
            />
            {lastWeight && (
              <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                <span>
                  Dernier : {lastWeight.kg} kg ({fmtShort(lastWeight.date)})
                </span>
                <button className="underline" onClick={() => start(() => deleteWeight(lastWeight.date))}>
                  supprimer
                </button>
              </div>
            )}
          </div>
          <div className="card text-xs text-zinc-400">
            <div className="h-section">Conseil</div>
            Pour progresser en muscu, vise environ 1,6 à 2 g de protéines par kg de poids de corps. Tes objectifs se
            règlent dans <Link href="/reglages" className="text-amber-300 underline">Réglages</Link>.
          </div>
        </div>
      </div>

      {adding && (
        <AddFood
          date={date}
          initialMeal={adding === "auto" ? guessMeal() : adding}
          onClose={() => setAdding(null)}
        />
      )}
    </div>
  );
}

function guessMeal() {
  const h = new Date().getHours();
  if (h < 10) return "petit_dej";
  if (h < 15) return "dejeuner";
  if (h < 18) return "collation";
  return "diner";
}

function Macro({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-zinc-300">{label}</span>
        <span className="text-zinc-400">
          {r0(value)} / {goal} g
        </span>
      </div>
      <ProgressBar value={value} max={goal} color={color} height={6} />
    </div>
  );
}

function EntryRow({ e }: { e: Entry }) {
  const [grams, setGrams] = useState(String(r1(e.grams)));
  const [, start] = useTransition();
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{e.name}</div>
        <div className="text-[11px] text-zinc-500">
          {r0(e.kcal)} kcal · P {r1(e.protein)} · G {r1(e.carbs)} · L {r1(e.fat)}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <input
          className="input !w-16 !px-2 !py-1 text-right"
          inputMode="decimal"
          value={grams}
          onChange={(ev) => setGrams(ev.target.value)}
          onBlur={() => {
            const g = toNum(grams);
            if (g > 0 && Math.abs(g - e.grams) > 0.01) start(() => updateEntryGrams(e.id, g));
          }}
          onKeyDown={(ev) => ev.key === "Enter" && (ev.target as HTMLInputElement).blur()}
        />
        <span className="text-xs text-zinc-500">g</span>
      </div>
      <button className="btn btn-ghost btn-sm" aria-label="Supprimer" onClick={() => start(() => deleteEntry(e.id))}>
        ✕
      </button>
    </div>
  );
}

function AddFood({ date, initialMeal, onClose }: { date: string; initialMeal: string; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const [manual, setManual] = useState(false);
  const [meal, setMeal] = useState(initialMeal);
  const [grams, setGrams] = useState("100");
  const [flash, setFlash] = useState("");
  const [pending, start] = useTransition();
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    const t = setTimeout(
      async () => {
        try {
          const res = await fetch(`/api/foods/search?q=${encodeURIComponent(q)}`);
          const data = (await res.json()) as { results: FoodResult[] };
          if (id === reqId.current) setResults(data.results ?? []);
        } catch {
          if (id === reqId.current) setResults([]);
        } finally {
          if (id === reqId.current) setLoading(false);
        }
      },
      q ? 350 : 0,
    );
    return () => clearTimeout(t);
  }, [q]);

  const pick = (f: FoodResult) => {
    setSelected(f);
    setGrams(String(f.lastGrams ?? f.portions?.[0]?.grams ?? 100));
  };

  const add = (food: FoodResult) =>
    start(async () => {
      const res = await addFoodEntry({
        date,
        meal,
        name: food.name,
        brand: food.brand,
        grams: toNum(grams),
        per100: food,
      });
      if (res.error) {
        setFlash(res.error);
        return;
      }
      setFlash(`✓ ${food.name} ajouté`);
      setSelected(null);
      setManual(false);
    });

  return (
    <Modal open onClose={onClose} title={manual ? "Aliment personnalisé" : selected ? selected.name : "Ajouter un aliment"} wide>
      {manual ? (
        <ManualForm
          onBack={() => setManual(false)}
          onSubmit={(food, g) => {
            setGrams(String(g));
            start(async () => {
              const res = await addFoodEntry({ date, meal, name: food.name, brand: "", grams: g, per100: food });
              if (res.error) setFlash(res.error);
              else {
                setFlash(`✓ ${food.name} ajouté`);
                setManual(false);
              }
            });
          }}
          pending={pending}
        />
      ) : selected ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {MEALS.map((m) => (
              <button key={m.id} onClick={() => setMeal(m.id)} className={`btn btn-sm ${meal === m.id ? "btn-primary" : "btn-ghost"}`}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>
          <div>
            <label className="label">Quantité (g ou ml)</label>
            <input className="input" inputMode="decimal" autoFocus value={grams} onChange={(e) => setGrams(e.target.value)} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[...(selected.portions ?? []), { label: "50 g", grams: 50 }, { label: "100 g", grams: 100 }, { label: "200 g", grams: 200 }].map(
                (p) => (
                  <button key={p.label} className="chip hover:!border-amber-400" onClick={() => setGrams(String(p.grams))}>
                    {p.label} {p.label.endsWith(" g") ? "" : `(${p.grams} g)`}
                  </button>
                ),
              )}
            </div>
          </div>
          {(() => {
            const k = toNum(grams) / 100;
            return (
              <div className="grid grid-cols-4 gap-2 text-center">
                <Tile label="kcal" value={r0(selected.kcal * k)} />
                <Tile label="Prot." value={r1(selected.protein * k)} />
                <Tile label="Gluc." value={r1(selected.carbs * k)} />
                <Tile label="Lip." value={r1(selected.fat * k)} />
              </div>
            );
          })()}
          <p className="text-xs text-zinc-500">
            Pour 100 g : {selected.kcal} kcal · P {selected.protein} · G {selected.carbs} (dont sucres {selected.sugar}) · L {selected.fat} · fibres {selected.fiber}
            {selected.source === "off" ? " — source Open Food Facts" : ""}
          </p>
          <div className="flex justify-between">
            <button className="btn btn-ghost" onClick={() => setSelected(null)}>
              ← Retour
            </button>
            <button className="btn btn-primary" disabled={pending || toNum(grams) <= 0} onClick={() => add(selected)}>
              {pending ? "…" : "Ajouter au journal"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {MEALS.map((m) => (
              <button key={m.id} onClick={() => setMeal(m.id)} className={`btn btn-sm ${meal === m.id ? "btn-primary" : "btn-ghost"}`}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>
          <input
            className="input"
            autoFocus
            placeholder="Cherche un aliment : riz, banane, skyr, big mac…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {flash && <p className="text-sm text-emerald-400">{flash}</p>}
          <div className="text-xs text-zinc-500">
            {q.length < 2 ? "Tes aliments récents" : loading ? "Recherche en cours…" : `${results.length} résultat(s) — base locale + Open Food Facts`}
          </div>
          <div className="max-h-[50vh] divide-y divide-zinc-800 overflow-y-auto rounded-xl border border-zinc-800">
            {results.map((f) => (
              <button key={f.key} onClick={() => pick(f)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-zinc-800/60">
                <div className="min-w-0">
                  <div className="truncate text-sm">
                    {f.name} {f.brand ? <span className="text-zinc-500">· {f.brand}</span> : null}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    P {f.protein} · G {f.carbs} · L {f.fat} <span className="ml-1 opacity-60">/100 g</span>
                    {f.source === "saved" ? " · ★ récent" : f.source === "off" ? " · OFF" : ""}
                  </div>
                </div>
                <div className="shrink-0 text-sm font-medium text-amber-300">{r0(f.kcal)} kcal</div>
              </button>
            ))}
            {results.length === 0 && !loading && (
              <div className="p-4 text-center text-sm text-zinc-500">
                {q.length < 2 ? "Rien pour l'instant — lance une recherche !" : "Aucun résultat. Crée l'aliment à la main ↓"}
              </div>
            )}
          </div>
          <div className="flex justify-between">
            <button className="btn btn-ghost" onClick={() => setManual(true)}>
              ✏️ Saisie manuelle
            </button>
            <button className="btn btn-primary" onClick={onClose}>
              Terminer
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-zinc-950 p-2">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[10px] text-zinc-500">{label}</div>
    </div>
  );
}

function ManualForm({
  onBack,
  onSubmit,
  pending,
}: {
  onBack: () => void;
  onSubmit: (food: { name: string; kcal: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number }, grams: number) => void;
  pending: boolean;
}) {
  const [f, setF] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "", fiber: "", sugar: "", grams: "100" });
  const field = (k: keyof typeof f, label: string, type = "decimal") => (
    <div>
      <label className="label">{label}</label>
      <input className="input" inputMode={type === "text" ? "text" : "decimal"} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </div>
  );
  return (
    <div className="space-y-3">
      {field("name", "Nom", "text")}
      <p className="text-xs text-zinc-500">Valeurs nutritionnelles pour 100 g (étiquette) :</p>
      <div className="grid grid-cols-3 gap-2">
        {field("kcal", "Kcal")}
        {field("protein", "Protéines")}
        {field("carbs", "Glucides")}
        {field("fat", "Lipides")}
        {field("fiber", "Fibres")}
        {field("sugar", "Sucres")}
      </div>
      {field("grams", "Quantité mangée (g)")}
      <div className="flex justify-between">
        <button className="btn btn-ghost" onClick={onBack}>
          ← Retour
        </button>
        <button
          className="btn btn-primary"
          disabled={pending || !f.name.trim() || toNum(f.grams) <= 0}
          onClick={() =>
            onSubmit(
              {
                name: f.name,
                kcal: toNum(f.kcal),
                protein: toNum(f.protein),
                carbs: toNum(f.carbs),
                fat: toNum(f.fat),
                fiber: toNum(f.fiber),
                sugar: toNum(f.sugar),
              },
              toNum(f.grams),
            )
          }
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}
