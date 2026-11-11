"use client";

import { useState } from "react";
import { Empty, Field, Loading, Modal, Progress, Stat, confirmDelete } from "@/components/ui";
import { addDays, todayStr } from "@/lib/dates";
import { useItems } from "@/lib/store";
import type { Card, Subject } from "@/lib/types";

const INTERVALS = [1, 2, 4, 8, 16, 32];

/** Fiches de révision (répétition espacée type Leitner) */
export default function Cards() {
  const cards = useItems<Card>("card");
  const subjects = useItems<Subject>("subject");
  const [form, setForm] = useState<{ subjectId: number | null; q: string; a: string } | null>(null);
  const [review, setReview] = useState(false);
  const [reveal, setReveal] = useState(false);
  const today = todayStr();

  if (!cards.loaded) return <Loading />;

  const due = cards.items.filter((c) => c.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  const current = due[0];
  const subj = (id?: number | null) => subjects.items.find((s) => s.id === id);
  const learned = cards.items.filter((c) => c.box >= 3).length;

  async function answer(level: "again" | "ok" | "easy") {
    if (!current) return;
    const box = level === "again" ? 0 : level === "ok" ? current.box : Math.min(INTERVALS.length - 1, current.box + 1);
    await cards.update(current.id, { box, date: addDays(today, INTERVALS[box]) });
    setReveal(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-400">Révision espacée : les fiches difficiles reviennent plus souvent.</p>
        <div className="flex gap-2">
          <button className="btn" disabled={due.length === 0} onClick={() => { setReview(true); setReveal(false); }}>
            🧠 Réviser ({due.length})
          </button>
          <button className="btn btn-primary" onClick={() => setForm({ subjectId: null, q: "", a: "" })}>
            + Fiche
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Fiches" value={cards.items.length} />
        <Stat label="À réviser" value={due.length} accent={due.length ? "#fbbf24" : undefined} />
        <Stat label="Bien connues" value={learned} />
      </div>

      {cards.items.length === 0 ? (
        <Empty>Crée des fiches question / réponse : formules, dates, vocabulaire, théorie musicale (intervalles, accords)…</Empty>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {[...cards.items].sort((a, b) => a.date.localeCompare(b.date)).map((c) => {
            const s = subj(c.subjectId);
            return (
              <div key={c.id} className="card !p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {s && (
                      <div className="mb-0.5 text-[11px]" style={{ color: s.color }}>
                        {s.name}
                      </div>
                    )}
                    <div className="text-sm font-medium">{c.q}</div>
                    <div className="mt-1 text-sm text-zinc-400">{c.a}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => confirmDelete() && cards.remove(c.id)}>
                    ✕
                  </button>
                </div>
                <div className="mt-2">
                  <Progress value={c.box + 1} max={INTERVALS.length} height={4} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={review} onClose={() => setReview(false)} title={`Révision · ${due.length} restante(s)`}>
        {current ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-zinc-950 p-6 text-center">
              {subj(current.subjectId) && <div className="mb-2 text-xs" style={{ color: subj(current.subjectId)!.color }}>{subj(current.subjectId)!.name}</div>}
              <div className="text-lg font-semibold">{current.q}</div>
              {reveal && <div className="mt-4 border-t border-zinc-800 pt-4 text-amber-300">{current.a}</div>}
            </div>
            {!reveal ? (
              <button className="btn btn-primary w-full" onClick={() => setReveal(true)}>
                Voir la réponse
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <button className="btn btn-danger" onClick={() => answer("again")}>
                  😵 Raté
                </button>
                <button className="btn" onClick={() => answer("ok")}>
                  🤔 Moyen
                </button>
                <button className="btn btn-primary" onClick={() => answer("easy")}>
                  😎 Facile
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 text-center">
            <div className="text-4xl">🎉</div>
            <p className="mt-2 text-zinc-300">Plus rien à réviser aujourd&apos;hui !</p>
          </div>
        )}
      </Modal>

      <Modal open={!!form} onClose={() => setForm(null)} title="Nouvelle fiche">
        {form && (
          <div className="space-y-3">
            <Field label="Matière">
              <select className="input" value={form.subjectId ?? ""} onChange={(e) => setForm({ ...form, subjectId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">—</option>
                {subjects.items.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Question">
              <textarea className="input" rows={2} autoFocus value={form.q} onChange={(e) => setForm({ ...form, q: e.target.value })} />
            </Field>
            <Field label="Réponse">
              <textarea className="input" rows={3} value={form.a} onChange={(e) => setForm({ ...form, a: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setForm(null)}>
                Fermer
              </button>
              <button
                className="btn btn-primary"
                disabled={!form.q.trim() || !form.a.trim()}
                onClick={async () => {
                  await cards.add({ subjectId: form.subjectId, q: form.q.trim(), a: form.a.trim(), box: 0 }, today);
                  setForm({ ...form, q: "", a: "" });
                }}
              >
                Ajouter et continuer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
