"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { BarChart, LineChart, PageHeader, ProgressBar, StatCard } from "@/components/charts";
import { addDays, fmtDate, fmtShort, startOfWeek } from "@/lib/dates";
import { deleteWorkout, saveWorkout } from "@/app/actions/sport";

export type WorkoutDTO = {
  id: number;
  date: string;
  name: string;
  durationMin: number | null;
  notes: string;
  exercises: { order: number; name: string; sets: { reps: number; weight: number }[] }[];
};

const DEFAULT_EXERCISES = [
  "Développé couché",
  "Développé incliné haltères",
  "Développé militaire",
  "Dips",
  "Pompes",
  "Tractions",
  "Rowing barre",
  "Tirage vertical",
  "Squat",
  "Presse à cuisses",
  "Fentes",
  "Soulevé de terre roumain",
  "Hip thrust",
  "Leg curl",
  "Curl biceps",
  "Extensions triceps",
  "Élévations latérales",
  "Gainage (secondes)",
];
const SESSION_NAMES = ["Push", "Pull", "Legs", "Haut du corps", "Bas du corps", "Full body", "Bras / épaules"];

const e1rm = (w: number, r: number) => (r <= 0 ? 0 : r === 1 ? w : w * (1 + r / 30));
const volumeOf = (w: WorkoutDTO) => w.exercises.reduce((s, e) => s + e.sets.reduce((a, x) => a + x.reps * x.weight, 0), 0);
const toNum = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return isFinite(n) ? n : 0;
};

export default function MuscuView({
  workouts,
  today,
  weeklyGoal,
}: {
  workouts: WorkoutDTO[];
  today: string;
  weeklyGoal: number;
}) {
  const [form, setForm] = useState<{ w: WorkoutDTO | null; template?: WorkoutDTO } | null>(null);
  const [, start] = useTransition();

  const exerciseNames = useMemo(() => {
    const counts = new Map<string, number>();
    workouts.forEach((w) => w.exercises.forEach((e) => counts.set(e.name, (counts.get(e.name) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  }, [workouts]);

  const [chosen, setChosen] = useState<string>("");
  const exercise = chosen || exerciseNames[0] || "";

  const weekStart = startOfWeek(today);
  const thisWeek = workouts.filter((w) => w.date >= weekStart);
  const weekVolume = thisWeek.reduce((s, w) => s + volumeOf(w), 0);
  const last30 = workouts.filter((w) => w.date > addDays(today, -30)).length;

  const weekly = Array.from({ length: 8 }, (_, i) => {
    const ws = addDays(weekStart, (i - 7) * 7);
    const we = addDays(ws, 6);
    const list = workouts.filter((w) => w.date >= ws && w.date <= we);
    return { label: fmtShort(ws).replace(" ", "\u00a0"), value: Math.round(list.reduce((s, w) => s + volumeOf(w), 0) / 100) / 10, n: list.length };
  });

  const progress = useMemo(() => {
    const pts: { label: string; value: number }[] = [];
    [...workouts]
      .reverse()
      .forEach((w) => {
        const ex = w.exercises.find((e) => e.name === exercise);
        if (!ex) return;
        const best = Math.max(...ex.sets.map((s) => e1rm(s.weight, s.reps)));
        if (best > 0) pts.push({ label: fmtShort(w.date), value: Math.round(best * 10) / 10 });
      });
    return pts.slice(-20);
  }, [workouts, exercise]);

  const records = useMemo(() => {
    const map = new Map<string, { e1: number; w: number; r: number; date: string }>();
    workouts.forEach((w) =>
      w.exercises.forEach((e) =>
        e.sets.forEach((s) => {
          const v = e1rm(s.weight, s.reps);
          const cur = map.get(e.name);
          if (!cur || v > cur.e1) map.set(e.name, { e1: v, w: s.weight, r: s.reps, date: w.date });
        }),
      ),
    );
    return [...map.entries()].sort((a, b) => b[1].e1 - a[1].e1).slice(0, 8);
  }, [workouts]);

  return (
    <div>
      <PageHeader title="Musculation" icon="🏋️" subtitle="Séances, charges, progression">
        <button className="btn btn-primary" onClick={() => setForm({ w: null })}>
          + Nouvelle séance
        </button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card">
          <div className="stat-label">Séances cette semaine</div>
          <div className="stat-value">
            {thisWeek.length} <span className="text-base font-normal text-zinc-500">/ {weeklyGoal}</span>
          </div>
          <div className="mt-2">
            <ProgressBar value={thisWeek.length} max={weeklyGoal} color="#10b981" />
          </div>
        </div>
        <StatCard label="Volume cette semaine" value={`${Math.round(weekVolume).toLocaleString("fr-FR")} kg`} sub="séries × reps × charge" />
        <StatCard label="Séances (30 jours)" value={last30} />
        <StatCard label="Total (12 mois)" value={workouts.length} sub="séances" />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="h-section">Volume par semaine (tonnes)</div>
          <BarChart data={weekly} color="#10b981" />
        </div>
        <div className="card">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="h-section !mb-0">Progression (1RM estimé)</div>
            {exerciseNames.length > 0 && (
              <select className="input !w-auto !py-1" value={exercise} onChange={(e) => setChosen(e.target.value)}>
                {exerciseNames.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            )}
          </div>
          <LineChart points={progress} color="#10b981" unit=" kg" />
        </div>
      </div>

      {records.length > 0 && (
        <div className="card mb-4">
          <div className="h-section">🏆 Records personnels</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {records.map(([name, r]) => (
              <div key={name} className="rounded-xl bg-zinc-950 p-3">
                <div className="truncate text-xs text-zinc-400">{name}</div>
                <div className="text-lg font-semibold text-emerald-300">{Math.round(r.e1)} kg</div>
                <div className="text-[11px] text-zinc-500">
                  1RM est. · {r.w} kg × {r.r} · {fmtShort(r.date)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="h-section">Historique</div>
      <div className="space-y-3">
        {workouts.slice(0, 30).map((w) => (
          <div key={w.id} className="card">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">{w.name}</div>
                <div className="text-xs capitalize text-zinc-400">
                  {fmtDate(w.date, { weekday: "long", day: "numeric", month: "long" })}
                  {w.durationMin ? ` · ${w.durationMin} min` : ""} · {Math.round(volumeOf(w)).toLocaleString("fr-FR")} kg de volume
                </div>
              </div>
              <div className="flex gap-1.5">
                <button className="btn btn-ghost btn-sm" onClick={() => setForm({ w: null, template: w })}>
                  Refaire
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setForm({ w })}>
                  Modifier
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    if (confirm("Supprimer cette séance ?")) start(() => deleteWorkout(w.id));
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {w.exercises.map((e) => (
                <div key={e.name + e.order} className="text-sm">
                  <span className="text-zinc-200">{e.name}</span>
                  <span className="text-zinc-500"> — </span>
                  <span className="text-zinc-400">{e.sets.map((s) => `${s.reps}×${s.weight}`).join(" · ")}</span>
                </div>
              ))}
            </div>
            {w.notes && <p className="mt-2 text-xs italic text-zinc-500">{w.notes}</p>}
          </div>
        ))}
        {workouts.length === 0 && <div className="card text-center text-sm text-zinc-500">Aucune séance enregistrée. Lance-toi 💪</div>}
      </div>

      {form && (
        <WorkoutForm
          key={form.w?.id ?? (form.template ? `t${form.template.id}` : "new")}
          workout={form.w}
          template={form.template}
          today={today}
          history={workouts}
          suggestions={[...new Set([...exerciseNames, ...DEFAULT_EXERCISES])]}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}

type FormSet = { reps: string; weight: string };
type FormEx = { name: string; sets: FormSet[] };

function WorkoutForm({
  workout,
  template,
  today,
  history,
  suggestions,
  onClose,
}: {
  workout: WorkoutDTO | null;
  template?: WorkoutDTO;
  today: string;
  history: WorkoutDTO[];
  suggestions: string[];
  onClose: () => void;
}) {
  const src = workout ?? template;
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [date, setDate] = useState(workout?.date ?? today);
  const [name, setName] = useState(src?.name ?? "");
  const [duration, setDuration] = useState(workout?.durationMin ? String(workout.durationMin) : "");
  const [notes, setNotes] = useState(workout?.notes ?? "");
  const [exs, setExs] = useState<FormEx[]>(
    src
      ? src.exercises.map((e) => ({
          name: e.name,
          sets: e.sets.map((s) => ({ reps: String(s.reps), weight: String(s.weight) })),
        }))
      : [{ name: "", sets: [{ reps: "", weight: "" }] }],
  );

  const updateEx = (i: number, fn: (e: FormEx) => FormEx) => setExs((p) => p.map((e, j) => (j === i ? fn(e) : e)));

  const prefill = (i: number, exName: string) => {
    const ex = exs[i];
    if (ex.sets.some((s) => s.reps || s.weight)) return;
    for (const w of history) {
      const found = w.exercises.find((e) => e.name === exName);
      if (found) {
        updateEx(i, (e) => ({ ...e, sets: found.sets.map((s) => ({ reps: String(s.reps), weight: String(s.weight) })) }));
        return;
      }
    }
  };

  return (
    <Modal open onClose={onClose} title={workout ? "Modifier la séance" : "Nouvelle séance"} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Nom</label>
            <input className="input" list="session-names" value={name} onChange={(e) => setName(e.target.value)} placeholder="Push, Legs…" />
            <datalist id="session-names">
              {SESSION_NAMES.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label">Durée (min)</label>
            <input className="input" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
        </div>

        <datalist id="exercise-names">
          {suggestions.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>

        {exs.map((ex, i) => (
          <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
            <div className="mb-2 flex gap-2">
              <input
                className="input"
                list="exercise-names"
                placeholder="Exercice"
                value={ex.name}
                onChange={(e) => updateEx(i, (x) => ({ ...x, name: e.target.value }))}
                onBlur={(e) => prefill(i, e.target.value.trim())}
              />
              <button className="btn btn-danger btn-sm" onClick={() => setExs((p) => p.filter((_, j) => j !== i))} aria-label="Retirer l'exercice">
                ✕
              </button>
            </div>
            <div className="space-y-1.5">
              {ex.sets.map((s, si) => (
                <div key={si} className="flex items-center gap-2">
                  <span className="w-12 text-xs text-zinc-500">Série {si + 1}</span>
                  <input
                    className="input !py-1.5"
                    inputMode="decimal"
                    placeholder="reps"
                    value={s.reps}
                    onChange={(e) => updateEx(i, (x) => ({ ...x, sets: x.sets.map((y, k) => (k === si ? { ...y, reps: e.target.value } : y)) }))}
                  />
                  <span className="text-xs text-zinc-500">×</span>
                  <input
                    className="input !py-1.5"
                    inputMode="decimal"
                    placeholder="kg"
                    value={s.weight}
                    onChange={(e) => updateEx(i, (x) => ({ ...x, sets: x.sets.map((y, k) => (k === si ? { ...y, weight: e.target.value } : y)) }))}
                  />
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => updateEx(i, (x) => ({ ...x, sets: x.sets.filter((_, k) => k !== si) }))}
                    aria-label="Retirer la série"
                  >
                    −
                  </button>
                </div>
              ))}
            </div>
            <button
              className="btn btn-ghost btn-sm mt-2"
              onClick={() => updateEx(i, (x) => ({ ...x, sets: [...x.sets, { ...(x.sets[x.sets.length - 1] ?? { reps: "", weight: "" }) }] }))}
            >
              + Série
            </button>
          </div>
        ))}
        <button className="btn btn-ghost w-full" onClick={() => setExs((p) => [...p, { name: "", sets: [{ reps: "", weight: "" }] }])}>
          + Ajouter un exercice
        </button>

        <div>
          <label className="label">Notes</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ressenti, douleurs, objectifs…" />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end">
          <button
            className="btn btn-primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await saveWorkout({
                  id: workout?.id,
                  date,
                  name,
                  durationMin: toNum(duration) || null,
                  notes,
                  exercises: exs.map((e) => ({
                    name: e.name,
                    sets: e.sets.map((s) => ({ reps: Math.round(toNum(s.reps)), weight: toNum(s.weight) })),
                  })),
                });
                if (res.error) setError(res.error);
                else onClose();
              })
            }
          >
            {pending ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
