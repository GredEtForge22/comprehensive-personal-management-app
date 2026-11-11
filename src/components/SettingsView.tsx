"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/charts";
import { setCurrentWeekParity, updateSettings } from "@/app/actions/life";
import { logout } from "@/app/actions/auth";
import type { Settings } from "@/lib/settings";

const toNum = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return isFinite(n) ? n : 0;
};

export default function SettingsView({
  settings,
  currentParity,
  weekNumber,
  hasPassword,
}: {
  settings: Settings;
  currentParity: "A" | "B";
  weekNumber: number;
  hasPassword: boolean;
}) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState({
    kcalGoal: String(settings.kcalGoal),
    proteinGoal: String(settings.proteinGoal),
    carbsGoal: String(settings.carbsGoal),
    fatGoal: String(settings.fatGoal),
    musicHours: String(Math.round((settings.musicWeeklyGoalMin / 60) * 10) / 10),
    runWeeklyGoalKm: String(settings.runWeeklyGoalKm),
    muscuWeeklyGoal: String(settings.muscuWeeklyGoal),
  });

  const save = (values?: typeof f) => {
    const v = values ?? f;
    start(async () => {
      await updateSettings({
        kcalGoal: toNum(v.kcalGoal),
        proteinGoal: toNum(v.proteinGoal),
        carbsGoal: toNum(v.carbsGoal),
        fatGoal: toNum(v.fatGoal),
        musicWeeklyGoalMin: Math.round(toNum(v.musicHours) * 60),
        runWeeklyGoalKm: toNum(v.runWeeklyGoalKm),
        muscuWeeklyGoal: Math.round(toNum(v.muscuWeeklyGoal)),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const field = (k: keyof typeof f, label: string) => (
    <div>
      <label className="label">{label}</label>
      <input className="input" inputMode="decimal" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </div>
  );

  return (
    <div>
      <PageHeader title="Réglages" icon="⚙️" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-4">
          <div className="h-section !mb-0">🎯 Objectifs</div>
          <div className="grid grid-cols-2 gap-3">
            {field("kcalGoal", "Calories / jour")}
            {field("proteinGoal", "Protéines (g)")}
            {field("carbsGoal", "Glucides (g)")}
            {field("fatGoal", "Lipides (g)")}
            {field("musicHours", "Saxophone (h / semaine)")}
            {field("runWeeklyGoalKm", "Course (km / semaine)")}
            {field("muscuWeeklyGoal", "Muscu (séances / semaine)")}
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" disabled={pending} onClick={() => save()}>
              Enregistrer
            </button>
            {saved && <span className="text-sm text-emerald-400">✓ Enregistré</span>}
          </div>
        </div>

        <NeedsCalculator
          onApply={(kcal, protein, carbs, fat) => {
            const next = { ...f, kcalGoal: String(kcal), proteinGoal: String(protein), carbsGoal: String(carbs), fatGoal: String(fat) };
            setF(next);
            save(next);
          }}
        />

        <div className="card space-y-3">
          <div className="h-section !mb-0">🗓️ Semaines A / B</div>
          <p className="text-sm text-zinc-400">
            Certains emplois du temps alternent deux semaines. Nous sommes en semaine {weekNumber} : indique si c&apos;est une semaine A ou B.
          </p>
          <div className="flex gap-2">
            {(["A", "B"] as const).map((p) => (
              <button key={p} className={`btn ${currentParity === p ? "btn-primary" : "btn-ghost"}`} disabled={pending} onClick={() => start(() => setCurrentWeekParity(p))}>
                Cette semaine = {p}
              </button>
            ))}
          </div>
        </div>

        <div className="card space-y-3">
          <div className="h-section !mb-0">💾 Données</div>
          <p className="text-sm text-zinc-400">Télécharge une sauvegarde de toutes tes données (hors photos de partitions) au format JSON.</p>
          <a href="/api/export" className="btn btn-ghost w-fit">
            ⬇️ Exporter mes données
          </a>
          {hasPassword && (
            <form action={logout}>
              <button className="btn btn-danger">Se déconnecter</button>
            </form>
          )}
          {!hasPassword && (
            <p className="text-xs text-amber-300/80">
              ⚠️ Aucun mot de passe : une fois en ligne, tout le monde pourrait voir ton planner. Ajoute la variable d&apos;environnement <code>APP_PASSWORD</code> sur Vercel.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function NeedsCalculator({ onApply }: { onApply: (kcal: number, protein: number, carbs: number, fat: number) => void }) {
  const [sex, setSex] = useState<"m" | "f">("m");
  const [age, setAge] = useState("17");
  const [height, setHeight] = useState("175");
  const [weight, setWeight] = useState("65");
  const [activity, setActivity] = useState("1.55");
  const [goal, setGoal] = useState("0");

  const w = toNum(weight);
  const bmr = 10 * w + 6.25 * toNum(height) - 5 * toNum(age) + (sex === "m" ? 5 : -161);
  const kcal = Math.round((bmr * toNum(activity) + toNum(goal)) / 10) * 10;
  const protein = Math.round(w * 1.8);
  const fat = Math.round(w * 1.1);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const valid = w > 0 && toNum(height) > 0 && toNum(age) > 0;

  return (
    <div className="card space-y-3">
      <div className="h-section !mb-0">🧮 Calculateur de besoins</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Sexe</label>
          <select className="input" value={sex} onChange={(e) => setSex(e.target.value as "m" | "f")}>
            <option value="m">Homme</option>
            <option value="f">Femme</option>
          </select>
        </div>
        <div>
          <label className="label">Âge</label>
          <input className="input" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />
        </div>
        <div>
          <label className="label">Taille (cm)</label>
          <input className="input" inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} />
        </div>
        <div>
          <label className="label">Poids (kg)</label>
          <input className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div>
          <label className="label">Activité</label>
          <select className="input" value={activity} onChange={(e) => setActivity(e.target.value)}>
            <option value="1.375">Légère (1–2 séances)</option>
            <option value="1.55">Modérée (3–4 séances)</option>
            <option value="1.725">Élevée (5–6 séances)</option>
          </select>
        </div>
        <div>
          <label className="label">Objectif</label>
          <select className="input" value={goal} onChange={(e) => setGoal(e.target.value)}>
            <option value="-400">Perte de poids (−400)</option>
            <option value="0">Maintien</option>
            <option value="300">Prise de muscle (+300)</option>
          </select>
        </div>
      </div>
      {valid && (
        <div className="rounded-xl bg-zinc-950 p-3 text-sm">
          <b className="text-amber-300">{kcal} kcal</b> · P {protein} g · G {carbs} g · L {fat} g
        </div>
      )}
      <button className="btn btn-ghost" disabled={!valid} onClick={() => onApply(kcal, protein, carbs, fat)}>
        Appliquer ces objectifs
      </button>
      <p className="text-[11px] text-zinc-500">Estimation (formule de Mifflin-St Jeor) — à ajuster selon tes résultats.</p>
    </div>
  );
}
