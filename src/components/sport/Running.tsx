"use client";

import { useMemo, useState } from "react";
import { Bars, Empty, Field, Loading, Modal, NumInput, Progress, Rating, Spark, Stat, confirmDelete } from "@/components/ui";
import { addDays, fmtDate, fmtPace, fmtTime, parseTime, todayStr, weekStart } from "@/lib/dates";
import { RACES, RUN_TYPES, paceOf, riegel } from "@/lib/sport";
import { useItems, useSettings } from "@/lib/store";
import type { Run } from "@/lib/types";

type Form = { id?: number; date: string; km: number; time: string; type: string; feel: number; notes: string };

export default function Running() {
  const runs = useItems<Run>("run");
  const { settings } = useSettings();
  const [form, setForm] = useState<Form | null>(null);
  const today = todayStr();
  const sorted = useMemo(() => [...runs.items].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id), [runs.items]);

  const wk = weekStart(today);
  const kmIn = (s: string, e: string) => sorted.filter((r) => r.date >= s && r.date <= e).reduce((a, r) => a + r.km, 0);
  const weekKm = kmIn(wk, addDays(wk, 6));
  const weekly = Array.from({ length: 8 }, (_, i) => {
    const s = addDays(wk, -7 * (7 - i));
    return { label: fmtDate(s, { day: "numeric", month: "numeric" }), value: Math.round(kmIn(s, addDays(s, 6)) * 10) / 10, highlight: i === 7 };
  });

  const valid = sorted.filter((r) => r.km > 0 && r.seconds > 0);
  const longest = valid.reduce<(typeof valid)[number] | null>((b, r) => (!b || r.km > b.km ? r : b), null);
  const fastest = valid.filter((r) => r.km >= 2).reduce<(typeof valid)[number] | null>((b, r) => (!b || paceOf(r) < paceOf(b) ? r : b), null);
  const bestAt = (min: number, max: number) =>
    valid.filter((r) => r.km >= min && r.km <= max).reduce<(typeof valid)[number] | null>((b, r) => (!b || r.seconds < b.seconds ? r : b), null);

  // prédiction : meilleure perf (≥ 3 km) sur 120 jours → équivalent 5 km le plus rapide
  const limit = addDays(today, -120);
  const base = valid
    .filter((r) => r.km >= 3 && r.date >= limit)
    .reduce<(typeof valid)[number] | null>((b, r) => (!b || riegel(r.seconds, r.km, 5) < riegel(b.seconds, b.km, 5) ? r : b), null);

  const blank = (): Form => ({ date: today, km: 0, time: "", type: "Footing", feel: 3, notes: "" });

  async function save() {
    if (!form) return;
    const seconds = parseTime(form.time);
    if (form.km <= 0 || seconds <= 0) {
      alert("Renseigne la distance et la durée (ex : 28:30).");
      return;
    }
    const data: Run = { km: form.km, seconds, type: form.type, feel: form.feel, notes: form.notes || undefined };
    if (form.id) await runs.update(form.id, { ...data, date: form.date });
    else await runs.add(data, form.date);
    setForm(null);
  }

  if (!runs.loaded) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="btn btn-primary" onClick={() => setForm(blank())}>
          + Nouvelle sortie
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card col-span-2 lg:col-span-1">
          <div className="text-xs tracking-wide text-zinc-400 uppercase">Km cette semaine</div>
          <div className="mt-1 text-3xl font-bold text-amber-300">
            {Math.round(weekKm * 10) / 10} <span className="text-base text-zinc-500">/ {settings.runWeeklyKm} km</span>
          </div>
          <div className="mt-2">
            <Progress value={weekKm} max={settings.runWeeklyKm} />
          </div>
        </div>
        <Stat label="Sorties" value={sorted.length} sub={`${Math.round(sorted.reduce((a, r) => a + r.km, 0))} km au total`} />
        <Stat label="Plus longue" value={longest ? `${longest.km} km` : "—"} sub={longest && fmtDate(longest.date)} />
        <Stat label="Meilleure allure" value={fastest ? fmtPace(paceOf(fastest)).replace("/km", "") : "—"} sub={fastest ? `/km · ${fastest.km} km` : "≥ 2 km"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 font-semibold">Kilomètres par semaine</h3>
          <Bars data={weekly} unit=" km" target={settings.runWeeklyKm} />
        </div>
        <div className="card">
          <h3 className="mb-1 font-semibold">🔮 Prédictions de temps</h3>
          {base ? (
            <>
              <p className="mb-3 text-xs text-zinc-500">
                Formule de Riegel à partir de ta sortie du {fmtDate(base.date)} ({base.km} km en {fmtTime(base.seconds)}).
              </p>
              <div className="space-y-2">
                {RACES.map((r) => {
                  const t = riegel(base.seconds, base.km, r.km);
                  return (
                    <div key={r.label} className="flex items-center justify-between rounded-xl bg-zinc-800/60 px-3 py-2">
                      <span>{r.label}</span>
                      <span className="text-right">
                        <b className="text-lg">{fmtTime(t)}</b>
                        <span className="ml-2 text-xs text-zinc-500">{fmtPace(t / r.km)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <Empty>Enregistre une sortie d&apos;au moins 3 km (ces 4 derniers mois) pour obtenir des prédictions.</Empty>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 font-semibold">🏆 Records</h3>
          <div className="space-y-1.5 text-sm">
            {[
              ["5 km", bestAt(4.8, 5.6)],
              ["10 km", bestAt(9.7, 10.8)],
              ["Semi", bestAt(20.5, 22)],
            ].map(([label, r]) => (
              <div key={label as string} className="flex justify-between rounded-xl bg-zinc-800/60 px-3 py-2">
                <span>{label as string}</span>
                <span>{r ? `${fmtTime((r as (typeof valid)[number]).seconds)} · ${fmtDate((r as (typeof valid)[number]).date)}` : "—"}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="mb-3 font-semibold">Évolution de l&apos;allure</h3>
          <Spark points={[...valid].reverse().slice(-15).map((r) => paceOf(r))} labels={["anciennes", "récentes (plus bas = plus rapide)"]} />
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-semibold">Historique</h3>
        {sorted.length === 0 ? (
          <Empty>Aucune sortie pour l&apos;instant 🏃</Empty>
        ) : (
          <div className="space-y-2">
            {sorted.map((r) => (
              <div key={r.id} className="card flex flex-wrap items-center justify-between gap-2 !p-3.5">
                <div>
                  <div className="font-semibold">
                    {r.km} km · {fmtTime(r.seconds)} · <span className="text-amber-300">{fmtPace(paceOf(r))}</span>
                  </div>
                  <div className="text-xs text-zinc-400">
                    {fmtDate(r.date, { weekday: "short", day: "numeric", month: "short" })} · {r.type}
                    {r.notes ? ` · ${r.notes}` : ""}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    className="btn btn-sm"
                    onClick={() => setForm({ id: r.id, date: r.date, km: r.km, time: fmtTime(r.seconds), type: r.type, feel: r.feel ?? 3, notes: r.notes ?? "" })}
                  >
                    ✏️
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => confirmDelete() && runs.remove(r.id)}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Modifier la sortie" : "Nouvelle sortie"}>
        {form && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </Field>
              <Field label="Type">
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {RUN_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Distance (km)">
                <NumInput value={form.km} step={0.01} onChange={(n) => setForm({ ...form, km: n })} />
              </Field>
              <Field label="Durée (mm:ss ou h:mm:ss)">
                <input className="input" placeholder="28:30" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </Field>
            </div>
            {form.km > 0 && parseTime(form.time) > 0 && (
              <div className="text-sm text-amber-300">Allure : {fmtPace(parseTime(form.time) / form.km)}</div>
            )}
            <Field label="Ressenti">
              <Rating value={form.feel} onChange={(v) => setForm({ ...form, feel: v })} />
            </Field>
            <Field label="Notes">
              <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
