"use client";

import { useState } from "react";
import { Empty, Field, Loading, Modal, confirmDelete } from "@/components/ui";
import { fmtDate, todayStr } from "@/lib/dates";
import { useItems } from "@/lib/store";
import type { Lesson } from "@/lib/types";

type Form = { id?: number; date: string; teacher: string; summary: string; pieces: string; todos: string };

/** Comptes rendus de cours de saxophone / conservatoire */
export default function Lessons() {
  const lessons = useItems<Lesson>("lesson");
  const [form, setForm] = useState<Form | null>(null);
  const sorted = [...lessons.items].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  if (!lessons.loaded) return <Loading />;

  const pending = sorted.flatMap((l) => l.todos.filter((t) => !t.done).map((t) => ({ l, t })));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-400">Notes de tes cours de sax / conservatoire : ce que le prof a dit, ce qu&apos;il faut travailler.</p>
        <button
          className="btn btn-primary"
          onClick={() => setForm({ date: todayStr(), teacher: sorted[0]?.teacher ?? "", summary: "", pieces: "", todos: "" })}
        >
          + Compte rendu
        </button>
      </div>

      {pending.length > 0 && (
        <div className="card">
          <h3 className="mb-2 font-semibold">🎯 À travailler pour le prochain cours</h3>
          <div className="space-y-1.5">
            {pending.map(({ l, t }, i) => (
              <label key={l.id + "-" + i} className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-amber-400"
                  checked={false}
                  onChange={() => lessons.update(l.id, { todos: l.todos.map((x) => (x === t ? { ...x, done: true } : x)) })}
                />
                <span>{t.text}</span>
                <span className="text-xs text-zinc-600">{fmtDate(l.date)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <Empty>Aucun cours noté. Après chaque cours, écris 2 minutes ce qu&apos;il faut retenir 🎷</Empty>
      ) : (
        <div className="space-y-3">
          {sorted.map((l) => (
            <div key={l.id} className="card space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold capitalize">{fmtDate(l.date, { weekday: "long", day: "numeric", month: "long" })}</div>
                  {l.teacher && <div className="text-xs text-zinc-400">avec {l.teacher}</div>}
                </div>
                <div className="flex gap-1.5">
                  <button
                    className="btn btn-sm"
                    onClick={() => setForm({ id: l.id, date: l.date, teacher: l.teacher, summary: l.summary, pieces: l.pieces ?? "", todos: l.todos.map((t) => t.text).join("\n") })}
                  >
                    ✏️
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => confirmDelete() && lessons.remove(l.id)}>
                    🗑️
                  </button>
                </div>
              </div>
              {l.pieces && <div className="text-sm text-amber-300">🎶 {l.pieces}</div>}
              {l.summary && <p className="text-sm whitespace-pre-wrap text-zinc-300">{l.summary}</p>}
              {l.todos.length > 0 && (
                <div className="space-y-1">
                  {l.todos.map((t, i) => (
                    <label key={i} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-amber-400"
                        checked={t.done}
                        onChange={() => lessons.update(l.id, { todos: l.todos.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) })}
                      />
                      <span className={t.done ? "text-zinc-500 line-through" : ""}>{t.text}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Modifier le cours" : "Compte rendu de cours"} wide>
        {form && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </Field>
              <Field label="Prof">
                <input className="input" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} />
              </Field>
            </div>
            <Field label="Morceaux / études vus">
              <input className="input" value={form.pieces} onChange={(e) => setForm({ ...form, pieces: e.target.value })} />
            </Field>
            <Field label="Remarques du prof">
              <textarea className="input" rows={4} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Sonorité, phrasé, justesse, doigtés…" />
            </Field>
            <Field label="À travailler (une ligne = une tâche)">
              <textarea className="input" rows={4} value={form.todos} onChange={(e) => setForm({ ...form, todos: e.target.value })} placeholder={"Gamme de Fa# mineur mélodique ♩=80\nMesures 20–32 en détaché"} />
            </Field>
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setForm(null)}>
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  const old = form.id ? lessons.items.find((x) => x.id === form.id) : undefined;
                  const todos = form.todos
                    .split("\n")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((text) => ({ text, done: old?.todos.find((x) => x.text === text)?.done ?? false }));
                  const data: Lesson = { teacher: form.teacher, summary: form.summary, pieces: form.pieces || undefined, todos };
                  if (form.id) await lessons.update(form.id, { ...data, date: form.date });
                  else await lessons.add(data, form.date);
                  setForm(null);
                }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
