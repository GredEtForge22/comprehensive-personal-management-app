"use client";

import { useMemo, useState } from "react";
import { ColorPicker, Empty, Field, Heatmap, Loading, Modal, PageHeader, Progress, Stat, confirmDelete } from "@/components/ui";
import { DAYS, DAYS_SHORT, addDays, dow, fmtDate, todayStr, weekDates } from "@/lib/dates";
import { HABIT_SUGGESTIONS, checksOf, scheduled, streaks } from "@/lib/habits";
import { COLORS } from "@/lib/schedule";
import { useItems } from "@/lib/store";
import type { Habit, HabitCheck } from "@/lib/types";

type Form = { id?: number; name: string; emoji: string; color: string; days: number[] };
const blank: Form = { name: "", emoji: "✨", color: COLORS[0], days: [] };

export default function HabitsPage() {
  const habits = useItems<Habit>("habit");
  const checks = useItems<HabitCheck>("habitcheck");
  const [form, setForm] = useState<Form | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [wkAnchor, setWkAnchor] = useState(todayStr());
  const today = todayStr();
  const week = weekDates(wkAnchor);

  const byHabit = useMemo(() => {
    const m = new Map<number, Set<string>>();
    habits.items.forEach((h) => m.set(h.id, checksOf(h.id, checks.items)));
    return m;
  }, [habits.items, checks.items]);

  function toggle(h: { id: number }, date: string) {
    const existing = checks.items.find((c) => c.habitId === h.id && c.date === date);
    if (existing) void checks.remove(existing.id);
    else void checks.add({ habitId: h.id }, date);
  }

  // régularité globale : part des habitudes prévues cochées ce jour-là
  const globalValues = useMemo(() => {
    const v: Record<string, number> = {};
    for (let i = 0; i < 16 * 7; i++) {
      const d = addDays(today, -i);
      const due = habits.items.filter((h) => scheduled(h, d, dow));
      if (!due.length) continue;
      const done = due.filter((h) => byHabit.get(h.id)?.has(d)).length;
      v[d] = done / due.length;
    }
    return v;
  }, [habits.items, byHabit, today]);

  const dueToday = habits.items.filter((h) => scheduled(h, today, dow));
  const doneToday = dueToday.filter((h) => byHabit.get(h.id)?.has(today)).length;

  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
  const rate7 = (() => {
    let due = 0;
    let done = 0;
    for (const d of last7) {
      for (const h of habits.items) {
        if (!scheduled(h, d, dow)) continue;
        due++;
        if (byHabit.get(h.id)?.has(d)) done++;
      }
    }
    return due ? Math.round((done / due) * 100) : 0;
  })();

  async function save() {
    if (!form || !form.name.trim()) return;
    const data: Habit = { name: form.name.trim(), emoji: form.emoji || "✨", color: form.color, days: form.days };
    if (form.id) await habits.update(form.id, data);
    else await habits.add(data);
    setForm(null);
  }

  if (!habits.loaded || !checks.loaded) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Habitudes"
        sub="Coche chaque jour, garde ta série"
        actions={
          <button className="btn btn-primary" onClick={() => setForm(blank)}>
            + Habitude
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="card col-span-2 lg:col-span-1">
          <div className="text-xs tracking-wide text-zinc-400 uppercase">Aujourd&apos;hui</div>
          <div className="mt-1 text-3xl font-bold text-amber-300">
            {doneToday}
            <span className="text-base font-normal text-zinc-500"> / {dueToday.length}</span>
          </div>
          <div className="mt-2">
            <Progress value={doneToday} max={dueToday.length} />
          </div>
        </div>
        <Stat label="Réussite 7 jours" value={`${rate7}%`} />
        <Stat label="Habitudes" value={habits.items.length} />
      </div>

      {habits.items.length === 0 ? (
        <div className="space-y-4">
          <Empty>Aucune habitude. Ajoute la tienne ou pars d&apos;une suggestion :</Empty>
          <div className="flex flex-wrap justify-center gap-2">
            {HABIT_SUGGESTIONS.map((s) => (
              <button key={s.name} className="chip" onClick={() => habits.add({ name: s.name, emoji: s.emoji, color: COLORS[0], days: [] })}>
                {s.emoji} {s.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card overflow-x-auto">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Semaine</h3>
              <div className="flex items-center gap-2">
                <button className="btn btn-sm" onClick={() => setWkAnchor(addDays(wkAnchor, -7))}>
                  ←
                </button>
                <span className="text-xs text-zinc-400">{fmtDate(week[0])} – {fmtDate(week[6])}</span>
                <button className="btn btn-sm" onClick={() => setWkAnchor(addDays(wkAnchor, 7))}>
                  →
                </button>
              </div>
            </div>
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-xs text-zinc-500">
                  <th className="pb-2 text-left font-normal">Habitude</th>
                  {week.map((d, i) => (
                    <th key={d} className={`pb-2 font-normal ${d === today ? "text-amber-300" : ""}`}>
                      {DAYS_SHORT[i]}
                      <div>{Number(d.slice(8))}</div>
                    </th>
                  ))}
                  <th className="pb-2 text-center font-normal">🔥</th>
                </tr>
              </thead>
              <tbody>
                {habits.items.map((h) => {
                  const set = byHabit.get(h.id) ?? new Set<string>();
                  const st = streaks(h, set, today, dow);
                  return (
                    <tr key={h.id} className="border-t border-zinc-800">
                      <td className="py-2 pr-3">
                        <button className="flex items-center gap-2 text-left font-medium" onClick={() => setOpen(open === h.id ? null : h.id)}>
                          <span>{h.emoji}</span>
                          <span>{h.name}</span>
                        </button>
                      </td>
                      {week.map((d) => {
                        const on = set.has(d);
                        const due = scheduled(h, d, dow);
                        return (
                          <td key={d} className="text-center">
                            <button
                              onClick={() => toggle(h, d)}
                              aria-label={`${h.name} ${d}`}
                              className={`h-8 w-8 cursor-pointer rounded-lg border text-sm transition ${due ? "" : "opacity-40"} ${
                                on ? "border-transparent font-bold text-zinc-950" : "border-zinc-700 text-transparent hover:border-zinc-500"
                              }`}
                              style={on ? { background: h.color } : undefined}
                            >
                              ✓
                            </button>
                          </td>
                        );
                      })}
                      <td className="text-center font-semibold">{st.current}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {habits.items.map((h) => {
              const set = byHabit.get(h.id) ?? new Set<string>();
              const st = streaks(h, set, today, dow);
              const isOpen = open === h.id;
              return (
                <div key={h.id} className="card space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggle(h, today)}
                        className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl text-2xl transition active:scale-95 ${set.has(today) ? "" : "opacity-60 grayscale"}`}
                        style={{ background: set.has(today) ? h.color : "#27272a" }}
                        aria-label="Cocher aujourd'hui"
                      >
                        {set.has(today) ? "✓" : h.emoji}
                      </button>
                      <div>
                        <div className="font-semibold">
                          {h.emoji} {h.name}
                        </div>
                        <div className="text-xs text-zinc-400">
                          🔥 {st.current} j · record {st.best} j · {h.days?.length ? h.days.map((d) => DAYS_SHORT[d]).join(" ") : "tous les jours"}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button className="btn btn-sm" onClick={() => setForm({ id: h.id, name: h.name, emoji: h.emoji, color: h.color, days: h.days ?? [] })}>
                        ✏️
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => confirmDelete(`Supprimer « ${h.name} » et son historique ?`) && habits.remove(h.id)}>
                        🗑️
                      </button>
                    </div>
                  </div>
                  <button className="text-left text-xs text-zinc-500 underline decoration-dotted" onClick={() => setOpen(isOpen ? null : h.id)}>
                    {isOpen ? "Masquer le calendrier" : "Voir le calendrier"}
                  </button>
                  {isOpen && (
                    <Heatmap
                      values={Object.fromEntries([...set].map((d) => [d, 1]))}
                      weeks={16}
                      color={h.color}
                      onDayClick={(d) => d <= today && toggle(h, d)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="card">
            <h3 className="mb-3 font-semibold">Régularité globale</h3>
            <Heatmap values={globalValues} weeks={20} />
          </div>
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Modifier l'habitude" : "Nouvelle habitude"}>
        {form && (
          <div className="space-y-3">
            <div className="flex gap-3">
              <Field label="Emoji" className="w-20">
                <input className="input text-center text-xl" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} maxLength={4} />
              </Field>
              <Field label="Nom" className="flex-1">
                <input className="input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
            </div>
            <Field label="Couleur">
              <ColorPicker colors={COLORS} value={form.color} onChange={(c) => setForm({ ...form, color: c })} />
            </Field>
            <Field label="Jours concernés (vide = tous les jours)">
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d, i) => (
                  <button
                    key={d}
                    className={`chip ${form.days.includes(i) ? "chip-on" : ""}`}
                    onClick={() => setForm({ ...form, days: form.days.includes(i) ? form.days.filter((x) => x !== i) : [...form.days, i] })}
                  >
                    {DAYS_SHORT[i]}
                  </button>
                ))}
              </div>
            </Field>
            {!form.id && (
              <Field label="Suggestions">
                <div className="flex flex-wrap gap-1.5">
                  {HABIT_SUGGESTIONS.map((s) => (
                    <button key={s.name} className="chip" onClick={() => setForm({ ...form, name: s.name, emoji: s.emoji })}>
                      {s.emoji} {s.name}
                    </button>
                  ))}
                </div>
              </Field>
            )}
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setForm(null)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={save} disabled={!form.name.trim()}>
                Enregistrer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
