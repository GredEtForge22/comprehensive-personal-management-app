"use client";

import { useMemo, useState } from "react";
import AddFood, { MEALS } from "@/components/nutrition/AddFood";
import { Bars, Empty, Field, Loading, NumInput, PageHeader, Progress, Spark, Stat, Tabs, confirmDelete } from "@/components/ui";
import { addDays, fmtDate, fmtLong, todayStr } from "@/lib/dates";
import { useItems, useSettings } from "@/lib/store";
import type { Meal, WeightLog } from "@/lib/types";

type Tab = "journal" | "semaine" | "poids";

const sum = (list: Meal[]) =>
  list.reduce(
    (a, m) => ({
      kcal: a.kcal + (m.kcal || 0),
      protein: a.protein + (m.protein || 0),
      carbs: a.carbs + (m.carbs || 0),
      fat: a.fat + (m.fat || 0),
      fiber: a.fiber + (m.fiber || 0),
      sugar: a.sugar + (m.sugar || 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
  );
const r1 = (n: number) => Math.round(n * 10) / 10;

export default function NutritionPage() {
  const meals = useItems<Meal>("meal");
  const weights = useItems<WeightLog>("weight");
  const { settings } = useSettings();
  const [tab, setTab] = useState<Tab>("journal");
  const [date, setDate] = useState(todayStr());
  const [adding, setAdding] = useState<string | null>(null);
  const [w, setW] = useState({ date: todayStr(), kg: 0 });
  const today = todayStr();

  const dayMeals = useMemo(() => meals.items.filter((m) => m.date === date), [meals.items, date]);
  const total = sum(dayMeals);

  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const weekTotals = week.map((d) => ({ d, ...sum(meals.items.filter((m) => m.date === d)) }));
  const logged = weekTotals.filter((x) => x.kcal > 0);
  const avg = (k: "kcal" | "protein" | "carbs" | "fat") => (logged.length ? logged.reduce((a, x) => a + x[k], 0) / logged.length : 0);

  const sortedW = [...weights.items].sort((a, b) => a.date.localeCompare(b.date));
  const latestW = sortedW[sortedW.length - 1];
  const w30 = sortedW.filter((x) => x.date >= addDays(today, -30))[0];
  const bmi = (latestW?.kg ?? settings.weight) / Math.pow(settings.height / 100, 2);

  async function copyYesterday() {
    const src = meals.items.filter((m) => m.date === addDays(date, -1));
    if (!src.length) return alert("Rien à copier : aucun repas la veille.");
    for (const m of src) {
      const { id, date: _d, ...rest } = m;
      void id;
      void _d;
      await meals.add(rest, date);
    }
  }

  if (!meals.loaded) return <Loading />;

  const macroBar = (label: string, v: number, goal: number, color: string, limit = false) => (
    <div key={label}>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span>
          <b>{r1(v)}</b>
          <span className="text-zinc-500">
            {" "}
            / {limit ? "< " : ""}
            {goal} g
          </span>
        </span>
      </div>
      <Progress value={v} max={goal} color={limit && v > goal ? "#ef4444" : color} height={6} />
    </div>
  );

  return (
    <div>
      <PageHeader title="Nutrition" sub="Calories, macros et poids" />
      <Tabs
        tabs={[
          { id: "journal", label: "Journal" },
          { id: "semaine", label: "Semaine" },
          { id: "poids", label: "Poids" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "journal" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button className="btn" onClick={() => setDate(addDays(date, -1))}>
                ←
              </button>
              <div className="min-w-40 text-center font-semibold capitalize">{date === today ? "Aujourd'hui" : fmtLong(date)}</div>
              <button className="btn" onClick={() => setDate(addDays(date, 1))}>
                →
              </button>
              {date !== today && (
                <button className="btn btn-ghost" onClick={() => setDate(today)}>
                  Aujourd&apos;hui
                </button>
              )}
            </div>
            <button className="btn" onClick={copyYesterday}>
              📋 Copier la veille
            </button>
          </div>

          <div className="card space-y-4">
            <div>
              <div className="mb-1 flex items-end justify-between">
                <div className="text-3xl font-bold text-amber-300">
                  {Math.round(total.kcal)} <span className="text-base font-normal text-zinc-500">/ {settings.kcal} kcal</span>
                </div>
                <div className="text-sm text-zinc-400">
                  {total.kcal <= settings.kcal ? `Reste ${Math.round(settings.kcal - total.kcal)} kcal` : `+${Math.round(total.kcal - settings.kcal)} kcal`}
                </div>
              </div>
              <Progress value={total.kcal} max={settings.kcal} height={12} color={total.kcal >= settings.kcal ? "#10b981" : "#fbbf24"} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {macroBar("Protéines", total.protein, settings.protein, "#ef4444")}
              {macroBar("Glucides", total.carbs, settings.carbs, "#3b82f6")}
              {macroBar("Lipides", total.fat, settings.fat, "#eab308")}
              {macroBar("Fibres", total.fiber, settings.fiber, "#10b981")}
              {macroBar("Sucres", total.sugar, settings.sugar, "#ec4899", true)}
            </div>
          </div>

          {MEALS.map((meal) => {
            const list = dayMeals.filter((m) => m.meal === meal);
            const t = sum(list);
            return (
              <div key={meal} className="card">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{meal}</h3>
                    <div className="text-xs text-zinc-500">
                      {Math.round(t.kcal)} kcal · P {r1(t.protein)} · G {r1(t.carbs)} · L {r1(t.fat)}
                    </div>
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={() => setAdding(meal)}>
                    + Aliment
                  </button>
                </div>
                {list.length === 0 ? (
                  <p className="text-sm text-zinc-600">Rien d&apos;enregistré.</p>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {list.map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-2 py-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{m.name}</div>
                          <div className="text-xs text-zinc-500">
                            {m.grams ? (
                              <button
                                className="underline decoration-dotted"
                                onClick={() => {
                                  const v = Number(window.prompt("Nouvelle quantité (g) ?", String(m.grams)));
                                  if (!v || v <= 0) return;
                                  const k = v / m.grams;
                                  void meals.update(m.id, {
                                    grams: v,
                                    kcal: Math.round(m.kcal * k),
                                    protein: r1(m.protein * k),
                                    carbs: r1(m.carbs * k),
                                    fat: r1(m.fat * k),
                                    fiber: r1(m.fiber * k),
                                    sugar: r1(m.sugar * k),
                                  });
                                }}
                              >
                                {m.grams} g
                              </button>
                            ) : (
                              "—"
                            )}{" "}
                            · P {r1(m.protein)} · G {r1(m.carbs)} · L {r1(m.fat)} · fibres {r1(m.fiber)} · sucres {r1(m.sugar)}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <b className="text-sm">{Math.round(m.kcal)} kcal</b>
                          <button className="btn btn-ghost btn-sm" onClick={() => meals.remove(m.id)}>
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "semaine" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Kcal / jour (moy.)" value={Math.round(avg("kcal"))} sub={`objectif ${settings.kcal}`} />
            <Stat label="Protéines (moy.)" value={`${Math.round(avg("protein"))} g`} sub={`objectif ${settings.protein} g`} />
            <Stat label="Glucides (moy.)" value={`${Math.round(avg("carbs"))} g`} />
            <Stat label="Lipides (moy.)" value={`${Math.round(avg("fat"))} g`} />
          </div>
          <div className="card">
            <h3 className="mb-3 font-semibold">Calories sur 7 jours</h3>
            <Bars
              data={weekTotals.map((x) => ({ label: fmtDate(x.d, { weekday: "short" }), value: Math.round(x.kcal), highlight: x.d === today }))}
              height={150}
              target={settings.kcal}
            />
          </div>
          <div className="card">
            <h3 className="mb-3 font-semibold">Protéines sur 7 jours (g)</h3>
            <Bars
              data={weekTotals.map((x) => ({ label: fmtDate(x.d, { weekday: "short" }), value: Math.round(x.protein), highlight: x.d === today }))}
              target={settings.protein}
              color="#ef4444"
            />
          </div>
        </div>
      )}

      {tab === "poids" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Poids actuel" value={`${latestW?.kg ?? settings.weight} kg`} sub={latestW ? fmtDate(latestW.date) : "réglages"} />
            <Stat
              label="Sur 30 jours"
              value={w30 && latestW ? `${latestW.kg - w30.kg > 0 ? "+" : ""}${r1(latestW.kg - w30.kg)} kg` : "—"}
            />
            <Stat label="IMC" value={bmi.toFixed(1)} sub={`${settings.height} cm`} />
            <Stat label="Pesées" value={sortedW.length} />
          </div>
          <div className="card">
            <h3 className="mb-3 font-semibold">Ajouter une pesée</h3>
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Date">
                <input type="date" className="input" value={w.date} onChange={(e) => setW({ ...w, date: e.target.value })} />
              </Field>
              <Field label="Poids (kg)" className="w-32">
                <NumInput value={w.kg} step={0.1} onChange={(n) => setW({ ...w, kg: n })} />
              </Field>
              <button
                className="btn btn-primary"
                disabled={w.kg <= 0}
                onClick={async () => {
                  await weights.add({ kg: w.kg }, w.date);
                  setW({ ...w, kg: 0 });
                }}
              >
                Ajouter
              </button>
            </div>
          </div>
          <div className="card">
            <h3 className="mb-3 font-semibold">Courbe de poids</h3>
            <Spark points={sortedW.slice(-30).map((x) => x.kg)} height={110} />
          </div>
          {sortedW.length === 0 ? (
            <Empty>Pèse-toi régulièrement (à jeun, même moment) pour suivre ta prise de masse.</Empty>
          ) : (
            <div className="card divide-y divide-zinc-800 !py-2">
              {[...sortedW].reverse().slice(0, 30).map((x) => (
                <div key={x.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{fmtDate(x.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                  <span className="flex items-center gap-3">
                    <b>{x.kg} kg</b>
                    <button className="btn btn-ghost btn-sm" onClick={() => confirmDelete() && weights.remove(x.id)}>
                      ✕
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AddFood open={adding !== null} meal={adding ?? MEALS[0]} date={date} onClose={() => setAdding(null)} />
    </div>
  );
}
