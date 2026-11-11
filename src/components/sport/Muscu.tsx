"use client";

import { useMemo, useState } from "react";
import { Bars, Empty, Field, Loading, Modal, NumInput, Progress, Rating, Spark, Stat, confirmDelete } from "@/components/ui";
import { addDays, fmtDate, todayStr, weekStart } from "@/lib/dates";
import {
  EXERCISES,
  WORKOUT_TEMPLATES,
  defOf,
  est1RM,
  recordsFor,
  totalReps,
  workoutVolume,
} from "@/lib/sport";
import { useItems, useSettings, type Rec } from "@/lib/store";
import type { ExerciseEntry, Workout } from "@/lib/types";
import { useBodyweight } from "@/lib/useBodyweight";

type Form = {
  id?: number;
  date: string;
  name: string;
  exercises: ExerciseEntry[];
  notes: string;
  duration: number;
  feel: number;
};

const MAIN = EXERCISES.filter((e) => e.main);

export default function Muscu() {
  const workouts = useItems<Workout>("workout");
  const { settings } = useSettings();
  const bw = useBodyweight();
  const [form, setForm] = useState<Form | null>(null);
  const [focus, setFocus] = useState("Tractions");
  const [openId, setOpenId] = useState<number | null>(null);
  const today = todayStr();

  const sorted = useMemo(
    () => [...workouts.items].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
    [workouts.items],
  );

  const wk = weekStart(today);
  const thisWeek = sorted.filter((w) => w.date >= wk && w.date <= addDays(wk, 6));

  const weekly = Array.from({ length: 8 }, (_, i) => {
    const s = addDays(wk, -7 * (7 - i));
    const e = addDays(s, 6);
    const ws = sorted.filter((w) => w.date >= s && w.date <= e);
    return {
      label: fmtDate(s, { day: "numeric", month: "numeric" }),
      value: Math.round(ws.reduce((a, w) => a + workoutVolume(w, bw), 0) / 100) / 10,
      highlight: i === 7,
    };
  });

  const lastSets = (name: string): ExerciseEntry | undefined => {
    for (const w of sorted) {
      const ex = w.exercises.find((e) => e.name === name);
      if (ex) return ex;
    }
    return undefined;
  };

  const newEx = (name: string): ExerciseEntry => {
    const prev = lastSets(name);
    return {
      name,
      sets: prev ? prev.sets.map((s) => ({ ...s })) : [{ reps: 0, added: 0 }],
    };
  };

  const blank = (): Form => ({ date: today, name: "Full body", exercises: [], notes: "", duration: 0, feel: 3 });

  function redo(w: Rec<Workout>) {
    setForm({
      date: today,
      name: w.name,
      exercises: w.exercises.map((e) => ({ name: e.name, sets: e.sets.map((s) => ({ ...s })) })),
      notes: "",
      duration: w.duration ?? 0,
      feel: 3,
    });
  }
  function edit(w: Rec<Workout>) {
    setForm({
      id: w.id,
      date: w.date,
      name: w.name,
      exercises: w.exercises.map((e) => ({ name: e.name, sets: e.sets.map((s) => ({ ...s })) })),
      notes: w.notes ?? "",
      duration: w.duration ?? 0,
      feel: w.feel ?? 3,
    });
  }

  async function save() {
    if (!form) return;
    const exercises = form.exercises
      .map((e) => ({ name: e.name, sets: e.sets.filter((s) => s.reps > 0).map((s) => ({ reps: s.reps, added: s.added || 0 })) }))
      .filter((e) => e.sets.length);
    if (!exercises.length) {
      alert("Ajoute au moins une série avec des répétitions.");
      return;
    }
    const data: Workout = {
      name: form.name || "Séance",
      exercises,
      notes: form.notes || undefined,
      duration: form.duration || undefined,
      feel: form.feel,
      bodyweight: bw,
    };
    if (form.id) await workouts.update(form.id, { ...data, date: form.date });
    else await workouts.add(data, form.date);
    setForm(null);
  }

  const recs = useMemo(() => {
    const names = new Set<string>();
    workouts.items.forEach((w) => w.exercises.forEach((e) => names.add(e.name)));
    return [...names]
      .map((n) => ({ name: n, r: recordsFor(n, workouts.items, bw) }))
      .sort((a, b) => b.r.totalReps - a.r.totalReps);
  }, [workouts.items, bw]);

  const focusRec = recordsFor(focus, workouts.items, bw);
  const focusDef = defOf(focus);

  if (!workouts.loaded) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-400">
          Street workout · poids du corps <b className="text-zinc-200">{bw} kg</b>
        </p>
        <button className="btn btn-primary" onClick={() => setForm(blank())}>
          + Nouvelle séance
        </button>
      </div>

      {/* 4 mouvements clés */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {MAIN.map((m) => {
          const r = recordsFor(m.name, workouts.items, bw);
          const weekReps = thisWeek.reduce(
            (a, w) => a + w.exercises.filter((e) => e.name === m.name).reduce((s, e) => s + totalReps(e), 0),
            0,
          );
          return (
            <button key={m.name} className="card text-left transition hover:border-zinc-600" onClick={() => setFocus(m.name)}>
              <div className="text-xs tracking-wide text-zinc-400 uppercase">{m.name}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-amber-300">{r.bestReps}</span>
                <span className="text-xs text-zinc-500">record / série</span>
              </div>
              <div className="my-2">
                <Progress value={r.bestReps} max={m.goal ?? 20} />
              </div>
              <div className="text-xs text-zinc-400">
                Semaine : <b className="text-zinc-200">{weekReps}</b> reps · objectif {m.goal}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Séances / semaine" value={`${thisWeek.length}/${settings.workoutsPerWeek}`} />
        <Stat
          label="Reps cette semaine"
          value={thisWeek.reduce((a, w) => a + w.exercises.reduce((s, e) => s + (defOf(e.name).time ? 0 : totalReps(e)), 0), 0)}
        />
        <Stat label="Charge soulevée (sem.)" value={`${Math.round(thisWeek.reduce((a, w) => a + workoutVolume(w, bw), 0))} kg`} sub="poids du corps × reps" />
        <Stat label="Séances au total" value={sorted.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 font-semibold">Charge soulevée par semaine (tonnes)</h3>
          <Bars data={weekly} unit=" t" />
        </div>
        <div className="card">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {[...new Set([...MAIN.map((m) => m.name), ...recs.map((r) => r.name)])].map((n) => (
              <button key={n} className={`chip ${focus === n ? "chip-on" : ""}`} onClick={() => setFocus(n)}>
                {n}
              </button>
            ))}
          </div>
          <h3 className="mb-2 font-semibold">Progression · {focus}</h3>
          <Spark points={focusRec.history.map((h) => h.best)} labels={["première séance", `${focusDef.time ? "s" : "reps"} (meilleure série)`]} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-zinc-800/60 p-2.5">
              <div className="text-xs text-zinc-400">Record {focusDef.time ? "(secondes)" : "sans lest"}</div>
              <b className="text-lg">{focusRec.bestReps}</b>
            </div>
            {!focusDef.time && (
              <>
                <div className="rounded-xl bg-zinc-800/60 p-2.5">
                  <div className="text-xs text-zinc-400">Lest max</div>
                  <b className="text-lg">{focusRec.maxAdded > 0 ? `+${focusRec.maxAdded} kg × ${focusRec.maxAddedReps}` : "—"}</b>
                </div>
                <div className="rounded-xl bg-zinc-800/60 p-2.5">
                  <div className="text-xs text-zinc-400">1RM estimé (charge totale)</div>
                  <b className="text-lg">{focusRec.best1RM ? `${Math.round(focusRec.best1RM)} kg` : "—"}</b>
                </div>
                <div className="rounded-xl bg-zinc-800/60 p-2.5">
                  <div className="text-xs text-zinc-400">Force relative</div>
                  <b className="text-lg">{focusRec.best1RM ? `${(focusRec.best1RM / bw).toFixed(2)} × PdC` : "—"}</b>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {recs.length > 0 && (
        <div className="card overflow-x-auto">
          <h3 className="mb-3 font-semibold">🏆 Records</h3>
          <table className="w-full min-w-[480px] text-sm">
            <thead className="text-left text-xs text-zinc-500 uppercase">
              <tr>
                <th className="pb-2">Exercice</th>
                <th>Meilleure série</th>
                <th>Lest max</th>
                <th>1RM estimé</th>
                <th>Reps totales</th>
              </tr>
            </thead>
            <tbody>
              {recs.map(({ name, r }) => (
                <tr key={name} className="border-t border-zinc-800">
                  <td className="py-2 font-medium">{name}</td>
                  <td>
                    {r.bestReps}
                    {defOf(name).time ? " s" : ""}{" "}
                    <span className="text-xs text-zinc-500">{r.bestRepsDate && fmtDate(r.bestRepsDate)}</span>
                  </td>
                  <td>{r.maxAdded > 0 ? `+${r.maxAdded} kg × ${r.maxAddedReps}` : "—"}</td>
                  <td>{r.best1RM ? `${Math.round(r.best1RM)} kg` : "—"}</td>
                  <td>{r.totalReps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <h3 className="mb-3 font-semibold">Historique</h3>
        {sorted.length === 0 ? (
          <Empty>Aucune séance. Lance-toi avec « Nouvelle séance » 💪</Empty>
        ) : (
          <div className="space-y-2">
            {sorted.map((w) => (
              <div key={w.id} className="card !p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button className="text-left" onClick={() => setOpenId(openId === w.id ? null : w.id)}>
                    <div className="font-semibold">
                      {w.name} <span className="text-sm font-normal text-zinc-400">· {fmtDate(w.date, { weekday: "short", day: "numeric", month: "short" })}</span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      {w.exercises.map((e) => `${e.name} ${e.sets.map((s) => s.reps + (s.added ? `+${s.added}` : "")).join("/")}`).join(" · ")}
                    </div>
                  </button>
                  <div className="flex gap-1.5">
                    <button className="btn btn-sm btn-primary" onClick={() => redo(w)}>
                      🔁 Refaire
                    </button>
                    <button className="btn btn-sm" onClick={() => edit(w)}>
                      ✏️
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => confirmDelete() && workouts.remove(w.id)}>
                      🗑️
                    </button>
                  </div>
                </div>
                {openId === w.id && (
                  <div className="mt-3 space-y-1.5 border-t border-zinc-800 pt-3 text-sm">
                    {w.exercises.map((e) => (
                      <div key={e.name} className="flex flex-wrap items-center gap-2">
                        <span className="w-48 font-medium">{e.name}</span>
                        {e.sets.map((s, i) => (
                          <span key={i} className="rounded-lg bg-zinc-800 px-2 py-0.5 text-xs">
                            {s.reps}
                            {defOf(e.name).time ? " s" : ""}
                            {s.added ? ` +${s.added}kg` : ""}
                            {!defOf(e.name).time && s.reps > 0 && (
                              <span className="text-zinc-500"> (1RM {Math.round(est1RM(e.name, s.reps, s.added || 0, w.bodyweight || bw))})</span>
                            )}
                          </span>
                        ))}
                      </div>
                    ))}
                    <div className="text-xs text-zinc-500">
                      Charge soulevée : {Math.round(workoutVolume(w, w.bodyweight || bw))} kg
                      {w.duration ? ` · ${w.duration} min` : ""}
                      {w.feel ? ` · ressenti ${w.feel}/5` : ""}
                    </div>
                    {w.notes && <div className="text-zinc-300">📝 {w.notes}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Modifier la séance" : "Nouvelle séance"} wide>
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </Field>
              <Field label="Nom de la séance">
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
            </div>
            <div>
              <span className="label">Modèles (reprend tes dernières perfs)</span>
              <div className="flex flex-wrap gap-1.5">
                {WORKOUT_TEMPLATES.map((t) => (
                  <button
                    key={t.name}
                    className="chip"
                    onClick={() => setForm({ ...form, name: t.name, exercises: t.exercises.map(newEx) })}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {form.exercises.map((ex, ei) => {
              const def = defOf(ex.name);
              const upd = (patch: Partial<ExerciseEntry>) =>
                setForm({ ...form, exercises: form.exercises.map((e, i) => (i === ei ? { ...e, ...patch } : e)) });
              return (
                <div key={ei} className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <b>{ex.name}</b>
                    <button className="btn btn-ghost btn-sm" onClick={() => setForm({ ...form, exercises: form.exercises.filter((_, i) => i !== ei) })}>
                      Retirer
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {ex.sets.map((s, si) => (
                      <div key={si} className="flex items-center gap-2">
                        <span className="w-6 text-xs text-zinc-500">#{si + 1}</span>
                        <div className="flex-1">
                          <NumInput
                            value={s.reps}
                            placeholder={def.time ? "secondes" : "reps"}
                            onChange={(n) => upd({ sets: ex.sets.map((x, i) => (i === si ? { ...x, reps: n } : x)) })}
                          />
                        </div>
                        {!def.time && (
                          <div className="flex-1">
                            <NumInput
                              value={s.added}
                              step={0.5}
                              placeholder="+ lest kg"
                              onChange={(n) => upd({ sets: ex.sets.map((x, i) => (i === si ? { ...x, added: n } : x)) })}
                            />
                          </div>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => upd({ sets: ex.sets.filter((_, i) => i !== si) })}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    className="btn btn-sm mt-2"
                    onClick={() => upd({ sets: [...ex.sets, { ...(ex.sets[ex.sets.length - 1] ?? { reps: 0, added: 0 }) }] })}
                  >
                    + Série
                  </button>
                </div>
              );
            })}

            <Field label="Ajouter un exercice">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {MAIN.map((m) => (
                  <button key={m.name} className="chip" onClick={() => setForm({ ...form, exercises: [...form.exercises, newEx(m.name)] })}>
                    + {m.name}
                  </button>
                ))}
              </div>
              <select
                className="input"
                value=""
                onChange={(e) => e.target.value && setForm({ ...form, exercises: [...form.exercises, newEx(e.target.value)] })}
              >
                <option value="">Tous les exercices…</option>
                {EXERCISES.map((e) => (
                  <option key={e.name} value={e.name}>
                    {e.group} · {e.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Durée (min)">
                <NumInput value={form.duration} onChange={(n) => setForm({ ...form, duration: n })} />
              </Field>
              <Field label="Ressenti">
                <Rating value={form.feel} onChange={(v) => setForm({ ...form, feel: v })} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setForm(null)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={save}>
                Enregistrer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
