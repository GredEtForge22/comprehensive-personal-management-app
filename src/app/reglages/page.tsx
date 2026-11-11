"use client";

import { useState } from "react";
import { Field, NumInput, PageHeader } from "@/components/ui";
import { weekIndex, todayStr, weekType } from "@/lib/dates";
import { INSTRUMENT_LABEL, type Instrument, type Settings } from "@/lib/settings";
import { useSettings } from "@/lib/store";

const ACTIVITY: [number, string][] = [
  [1.2, "Sédentaire"],
  [1.375, "Légèrement actif (1–3 séances/sem.)"],
  [1.55, "Actif (3–5 séances/sem.)"],
  [1.7, "Très actif (sport quotidien + lycée)"],
  [1.9, "Extrêmement actif"],
];

export default function SettingsPage() {
  const { settings, set } = useSettings();
  return <Form key={JSON.stringify(settings)} initial={settings} save={set} />;
}

function Form({ initial, save }: { initial: Settings; save: (p: Partial<Settings>) => Promise<void> }) {
  const [s, setS] = useState<Settings>(initial);
  const [saved, setSaved] = useState(false);
  const today = todayStr();
  const up = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setS({ ...s, [k]: v });
    setSaved(false);
  };

  const bmr = 10 * s.weight + 6.25 * s.height - 5 * s.age + (s.sex === "m" ? 5 : -161);
  const tdee = bmr * s.activity;
  const plans = [
    { label: "Maintien", kcal: Math.round(tdee) },
    { label: "Prise de masse douce (+300)", kcal: Math.round(tdee + 300) },
    { label: "Prise de masse (+500)", kcal: Math.round(tdee + 500) },
    { label: "Sèche légère (−300)", kcal: Math.round(tdee - 300) },
  ];

  function apply(kcal: number) {
    const protein = Math.round(s.weight * 2);
    const fat = Math.round((kcal * 0.27) / 9);
    const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
    setS({ ...s, kcal, protein, fat, carbs });
    setSaved(false);
  }

  const currentIsA = weekType(today, s.weekAParity) === "A";

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Réglages"
        sub="Profil, objectifs et données"
        actions={
          <button
            className="btn btn-primary"
            onClick={async () => {
              await save(s);
              setSaved(true);
            }}
          >
            {saved ? "✓ Enregistré" : "Enregistrer"}
          </button>
        }
      />

      <div className="card space-y-4">
        <h2 className="font-semibold">👤 Profil</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Poids (kg)">
            <NumInput value={s.weight} step={0.5} onChange={(n) => up("weight", n)} />
          </Field>
          <Field label="Taille (cm)">
            <NumInput value={s.height} onChange={(n) => up("height", n)} />
          </Field>
          <Field label="Âge">
            <NumInput value={s.age} onChange={(n) => up("age", n)} />
          </Field>
          <Field label="Sexe">
            <select className="input" value={s.sex} onChange={(e) => up("sex", e.target.value as "m" | "f")}>
              <option value="m">Homme</option>
              <option value="f">Femme</option>
            </select>
          </Field>
        </div>
        <p className="text-xs text-zinc-500">Le poids de la dernière pesée (onglet Nutrition → Poids) est utilisé en priorité pour les calculs de sport.</p>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">🔥 Calculateur de besoins caloriques</h2>
        <Field label="Niveau d'activité">
          <select className="input" value={s.activity} onChange={(e) => up("activity", Number(e.target.value))}>
            {ACTIVITY.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <div className="text-sm text-zinc-300">
          Métabolisme de base : <b>{Math.round(bmr)} kcal</b> · Dépense journalière : <b className="text-amber-300">{Math.round(tdee)} kcal</b>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {plans.map((p) => (
            <button key={p.label} className="btn justify-between" onClick={() => apply(p.kcal)}>
              <span>{p.label}</span>
              <b>{p.kcal} kcal</b>
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">Clique sur un plan pour remplir les objectifs ci-dessous (2 g de protéines/kg, ~27 % de lipides, le reste en glucides). N&apos;oublie pas d&apos;enregistrer.</p>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">🎯 Objectifs</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Calories / jour">
            <NumInput value={s.kcal} step={50} onChange={(n) => up("kcal", n)} />
          </Field>
          <Field label="Protéines (g)">
            <NumInput value={s.protein} onChange={(n) => up("protein", n)} />
          </Field>
          <Field label="Glucides (g)">
            <NumInput value={s.carbs} onChange={(n) => up("carbs", n)} />
          </Field>
          <Field label="Lipides (g)">
            <NumInput value={s.fat} onChange={(n) => up("fat", n)} />
          </Field>
          <Field label="Fibres (g)">
            <NumInput value={s.fiber} onChange={(n) => up("fiber", n)} />
          </Field>
          <Field label="Sucres max (g)">
            <NumInput value={s.sugar} onChange={(n) => up("sugar", n)} />
          </Field>
          <Field label="Sax / semaine (min)">
            <NumInput value={s.saxWeeklyMin} step={30} onChange={(n) => up("saxWeeklyMin", n)} />
          </Field>
          <Field label="Séances sport / sem.">
            <NumInput value={s.workoutsPerWeek} onChange={(n) => up("workoutsPerWeek", n)} />
          </Field>
          <Field label="Course (km / sem.)">
            <NumInput value={s.runWeeklyKm} onChange={(n) => up("runWeeklyKm", n)} />
          </Field>
          <Field label="Sommeil (h)">
            <NumInput value={s.sleepGoal} step={0.5} onChange={(n) => up("sleepGoal", n)} />
          </Field>
        </div>
        <p className="text-xs text-zinc-500">Objectif sax par défaut : 510 min = 8h30 par semaine.</p>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">🎷 Saxophone & emploi du temps</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Instrument (accordeur, bourdon)">
            <select className="input" value={s.saxInstrument} onChange={(e) => up("saxInstrument", e.target.value as Instrument)}>
              {(Object.keys(INSTRUMENT_LABEL) as Instrument[]).map((k) => (
                <option key={k} value={k}>
                  {INSTRUMENT_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cette semaine, c'est la semaine…">
            <div className="flex gap-2">
              {(["A", "B"] as const).map((w) => (
                <button
                  key={w}
                  className={`chip ${(w === "A") === currentIsA ? "chip-on" : ""}`}
                  onClick={() => up("weekAParity", w === "A" ? weekIndex(today) % 2 : 1 - (weekIndex(today) % 2))}
                >
                  Semaine {w}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">💾 Données</h2>
        <div className="flex flex-wrap gap-2">
          <a className="btn" href="/api/export" download>
            ⬇️ Exporter toutes mes données (JSON)
          </a>
          <button
            className="btn btn-ghost"
            onClick={async () => {
              await fetch("/api/login", { method: "DELETE" });
              window.location.href = "/login";
            }}
          >
            Se déconnecter
          </button>
        </div>
        <p className="text-xs text-zinc-500">Les photos de partitions ne sont pas incluses dans l&apos;export (trop volumineuses).</p>
      </div>
    </div>
  );
}
