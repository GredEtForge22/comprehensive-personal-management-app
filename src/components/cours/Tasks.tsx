"use client";

import { useState } from "react";
import { Empty, Field, Loading, Modal, confirmDelete } from "@/components/ui";
import { countdown, diffDays, fmtDate, todayStr } from "@/lib/dates";
import { useItems } from "@/lib/store";
import type { Subject, Task } from "@/lib/types";

export const TASK_TYPES: Record<Task["type"], { label: string; icon: string; color: string }> = {
  devoir: { label: "Devoir", icon: "📝", color: "#3b82f6" },
  controle: { label: "Contrôle", icon: "📚", color: "#ef4444" },
  audition: { label: "Audition", icon: "🎷", color: "#f59e0b" },
  concert: { label: "Concert", icon: "🎤", color: "#a855f7" },
  autre: { label: "Autre", icon: "📌", color: "#71717a" },
};

type Form = { id?: number; type: Task["type"]; title: string; date: string; subjectId: number | null; notes: string };

export default function Tasks() {
  const tasks = useItems<Task>("task");
  const subjects = useItems<Subject>("subject");
  const [form, setForm] = useState<Form | null>(null);
  const [showDone, setShowDone] = useState(false);
  const today = todayStr();

  if (!tasks.loaded) return <Loading />;

  const open = tasks.items.filter((t) => !t.done).sort((a, b) => a.date.localeCompare(b.date));
  const done = tasks.items.filter((t) => t.done).sort((a, b) => b.date.localeCompare(a.date));
  const big = open.filter((t) => ["controle", "audition", "concert"].includes(t.type) && t.date >= today).slice(0, 4);
  const groups: [string, typeof open][] = [
    ["⚠️ En retard", open.filter((t) => t.date < today)],
    ["Aujourd'hui", open.filter((t) => t.date === today)],
    ["Cette semaine", open.filter((t) => diffDays(today, t.date) > 0 && diffDays(today, t.date) <= 7)],
    ["Plus tard", open.filter((t) => diffDays(today, t.date) > 7)],
  ];
  const subj = (id?: number | null) => subjects.items.find((s) => s.id === id);

  async function save() {
    if (!form || !form.title.trim()) return;
    const data: Task = {
      type: form.type,
      title: form.title.trim(),
      subjectId: form.subjectId,
      notes: form.notes || undefined,
      done: false,
    };
    if (form.id) {
      const { done: _d, ...patch } = data;
      void _d;
      await tasks.update(form.id, { ...patch, date: form.date });
    } else await tasks.add(data, form.date);
    setForm(null);
  }

  const Row = ({ t }: { t: (typeof open)[number] }) => {
    const ty = TASK_TYPES[t.type] ?? TASK_TYPES.autre;
    const s = subj(t.subjectId);
    return (
      <div className="flex items-center gap-3 rounded-xl bg-zinc-800/50 px-3 py-2.5">
        <input type="checkbox" className="h-5 w-5 cursor-pointer accent-amber-400" checked={t.done} onChange={() => tasks.update(t.id, { done: !t.done })} />
        <div className="min-w-0 flex-1">
          <div className={`truncate text-sm font-medium ${t.done ? "text-zinc-500 line-through" : ""}`}>
            {ty.icon} {t.title}
          </div>
          <div className="text-xs text-zinc-500">
            {s && <span style={{ color: s.color }}>{s.name} · </span>}
            {ty.label} · {fmtDate(t.date, { weekday: "short", day: "numeric", month: "short" })}
            {t.notes ? ` · ${t.notes}` : ""}
          </div>
        </div>
        {!t.done && <span className={`text-xs font-semibold ${t.date < today ? "text-red-400" : "text-zinc-400"}`}>{countdown(t.date)}</span>}
        <button className="btn btn-ghost btn-sm" onClick={() => setForm({ id: t.id, type: t.type, title: t.title, date: t.date, subjectId: t.subjectId ?? null, notes: t.notes ?? "" })}>
          ✏️
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => confirmDelete() && tasks.remove(t.id)}>
          ✕
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button className="btn btn-primary" onClick={() => setForm({ type: "devoir", title: "", date: today, subjectId: null, notes: "" })}>
          + Ajouter
        </button>
      </div>

      {big.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {big.map((t) => {
            const ty = TASK_TYPES[t.type];
            const d = diffDays(today, t.date);
            return (
              <div key={t.id} className="card" style={{ borderColor: ty.color + "66" }}>
                <div className="text-xs text-zinc-400">
                  {ty.icon} {ty.label}
                </div>
                <div className="my-1 text-3xl font-bold" style={{ color: ty.color }}>
                  {d === 0 ? "Aujourd'hui" : `J-${d}`}
                </div>
                <div className="truncate text-sm font-medium">{t.title}</div>
                <div className="text-xs text-zinc-500">{fmtDate(t.date, { weekday: "long", day: "numeric", month: "short" })}</div>
              </div>
            );
          })}
        </div>
      )}

      {open.length === 0 ? (
        <Empty>Rien à faire 🎉 Ajoute tes devoirs, contrôles, auditions et concerts.</Empty>
      ) : (
        groups.map(([label, list]) =>
          list.length ? (
            <div key={label}>
              <h3 className="mb-2 text-sm font-semibold text-zinc-300">{label}</h3>
              <div className="space-y-1.5">
                {list.map((t) => (
                  <Row key={t.id} t={t} />
                ))}
              </div>
            </div>
          ) : null,
        )
      )}

      {done.length > 0 && (
        <div>
          <button className="text-sm text-zinc-400 underline decoration-dotted" onClick={() => setShowDone(!showDone)}>
            {showDone ? "Masquer" : "Afficher"} les {done.length} terminés
          </button>
          {showDone && (
            <div className="mt-2 space-y-1.5">
              {done.slice(0, 30).map((t) => (
                <Row key={t.id} t={t} />
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Modifier" : "Nouvelle échéance"}>
        {form && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TASK_TYPES) as Task["type"][]).map((k) => (
                <button key={k} className={`chip ${form.type === k ? "chip-on" : ""}`} onClick={() => setForm({ ...form, type: k })}>
                  {TASK_TYPES[k].icon} {TASK_TYPES[k].label}
                </button>
              ))}
            </div>
            <Field label="Titre">
              <input className="input" autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Exo 12 p.84, DS de maths, audition conservatoire…" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pour le">
                <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </Field>
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
            </div>
            <Field label="Notes">
              <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setForm(null)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={save} disabled={!form.title.trim()}>
                Enregistrer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
