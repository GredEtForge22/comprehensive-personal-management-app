"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/charts";
import { addDays, diffDays, fmtDate } from "@/lib/dates";
import { deleteTask, saveTask, setTaskDone } from "@/app/actions/life";

type Task = { id: number; title: string; kind: string; subject: string; dueDate: string | null; done: boolean; notes: string };

export const TASK_KINDS = [
  { id: "devoir", label: "Devoir", icon: "📘", color: "#6366f1" },
  { id: "controle", label: "Contrôle", icon: "⚠️", color: "#ef4444" },
  { id: "projet", label: "Projet", icon: "🧩", color: "#06b6d4" },
  { id: "musique", label: "Musique (audition, concert…)", icon: "🎷", color: "#f59e0b" },
  { id: "autre", label: "Autre", icon: "📌", color: "#71717a" },
];

export default function TasksView({ tasks, today }: { tasks: Task[]; today: string }) {
  const [form, setForm] = useState<Task | "new" | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [quick, setQuick] = useState("");
  const [quickKind, setQuickKind] = useState("devoir");
  const [quickDate, setQuickDate] = useState("");
  const [, start] = useTransition();

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done).reverse();
  const groups = [
    { title: "En retard", color: "text-red-300", list: open.filter((t) => t.dueDate && t.dueDate < today) },
    { title: "Aujourd'hui & demain", color: "text-amber-300", list: open.filter((t) => t.dueDate && t.dueDate >= today && t.dueDate <= addDays(today, 1)) },
    { title: "Cette semaine", color: "text-zinc-300", list: open.filter((t) => t.dueDate && t.dueDate > addDays(today, 1) && t.dueDate <= addDays(today, 7)) },
    { title: "Plus tard", color: "text-zinc-400", list: open.filter((t) => t.dueDate && t.dueDate > addDays(today, 7)) },
    { title: "Sans date", color: "text-zinc-400", list: open.filter((t) => !t.dueDate) },
  ];

  const addQuick = () => {
    if (!quick.trim()) return;
    start(async () => {
      await saveTask({ title: quick, kind: quickKind, subject: "", dueDate: quickDate || null, notes: "" });
      setQuick("");
    });
  };

  return (
    <div>
      <PageHeader title="À faire & échéances" icon="📝" subtitle={`${open.length} en cours`}>
        <button className="btn btn-primary" onClick={() => setForm("new")}>
          + Détaillé
        </button>
      </PageHeader>

      <div className="card mb-4 flex flex-wrap gap-2">
        <input
          className="input min-w-48 flex-1"
          placeholder="Ajout rapide : exo de maths p.54…"
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addQuick()}
        />
        <select className="input !w-auto" value={quickKind} onChange={(e) => setQuickKind(e.target.value)}>
          {TASK_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.icon} {k.label.split(" (")[0]}
            </option>
          ))}
        </select>
        <input type="date" className="input !w-auto" value={quickDate} onChange={(e) => setQuickDate(e.target.value)} />
        <button className="btn btn-primary" onClick={addQuick}>
          Ajouter
        </button>
      </div>

      <div className="space-y-5">
        {groups
          .filter((g) => g.list.length > 0)
          .map((g) => (
            <div key={g.title}>
              <div className={`h-section ${g.color}`}>
                {g.title} ({g.list.length})
              </div>
              <div className="space-y-2">
                {g.list.map((t) => (
                  <TaskRow key={t.id} t={t} today={today} onEdit={() => setForm(t)} />
                ))}
              </div>
            </div>
          ))}
        {open.length === 0 && <div className="card text-center text-sm text-zinc-500">Rien à faire. Profites-en pour jouer du sax 🎷</div>}
      </div>

      {done.length > 0 && (
        <div className="mt-6">
          <button className="text-sm text-zinc-400 underline" onClick={() => setShowDone(!showDone)}>
            {showDone ? "Masquer" : "Voir"} les terminées ({done.length})
          </button>
          {showDone && (
            <div className="mt-2 space-y-2">
              {done.slice(0, 30).map((t) => (
                <TaskRow key={t.id} t={t} today={today} onEdit={() => setForm(t)} />
              ))}
            </div>
          )}
        </div>
      )}

      {form && <TaskForm task={form === "new" ? null : form} onClose={() => setForm(null)} />}
    </div>
  );
}

function TaskRow({ t, today, onEdit }: { t: Task; today: string; onEdit: () => void }) {
  const [done, setDone] = useState(t.done);
  const [, start] = useTransition();
  const kind = TASK_KINDS.find((k) => k.id === t.kind) ?? TASK_KINDS[4];
  const left = t.dueDate ? diffDays(t.dueDate, today) : null;
  return (
    <div className={`card flex items-center gap-3 !py-3 ${done ? "opacity-50" : ""}`}>
      <button
        aria-label="Terminer"
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-xs ${done ? "border-emerald-400 bg-emerald-400 text-zinc-950" : "border-zinc-600"}`}
        onClick={() => {
          const v = !done;
          setDone(v);
          start(() => setTaskDone(t.id, v));
        }}
      >
        {done ? "✓" : ""}
      </button>
      <button className="min-w-0 flex-1 text-left" onClick={onEdit}>
        <div className={`truncate text-sm ${done ? "line-through" : ""}`}>
          {kind.icon} {t.title}
        </div>
        <div className="truncate text-xs text-zinc-500">
          {t.subject ? `${t.subject} · ` : ""}
          {kind.label.split(" (")[0]}
          {t.notes ? ` · ${t.notes}` : ""}
        </div>
      </button>
      {t.dueDate && (
        <div className="shrink-0 text-right">
          <div className={`text-xs font-medium ${left !== null && left < 0 && !done ? "text-red-300" : left !== null && left <= 1 ? "text-amber-300" : "text-zinc-300"}`}>
            {left === 0 ? "Aujourd'hui" : left === 1 ? "Demain" : left !== null && left < 0 ? `J+${-left}` : `J-${left}`}
          </div>
          <div className="text-[11px] capitalize text-zinc-500">{fmtDate(t.dueDate, { weekday: "short", day: "numeric", month: "short" })}</div>
        </div>
      )}
    </div>
  );
}

function TaskForm({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [f, setF] = useState({
    title: task?.title ?? "",
    kind: task?.kind ?? "devoir",
    subject: task?.subject ?? "",
    dueDate: task?.dueDate ?? "",
    notes: task?.notes ?? "",
  });
  return (
    <Modal open onClose={onClose} title={task ? "Modifier" : "Nouvelle tâche"}>
      <div className="space-y-4">
        <div>
          <label className="label">Titre</label>
          <input className="input" autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TASK_KINDS.map((k) => (
            <button key={k.id} className={`btn btn-sm ${f.kind === k.id ? "btn-primary" : "btn-ghost"}`} onClick={() => setF({ ...f, kind: k.id })}>
              {k.icon} {k.label.split(" (")[0]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Matière</label>
            <input className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="Maths, Philo…" />
          </div>
          <div>
            <label className="label">Pour le</label>
            <input type="date" className="input" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input min-h-16" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-between">
          {task ? (
            <button
              className="btn btn-danger"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await deleteTask(task.id);
                  onClose();
                })
              }
            >
              Supprimer
            </button>
          ) : (
            <span />
          )}
          <button
            className="btn btn-primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await saveTask({ id: task?.id, ...f, dueDate: f.dueDate || null });
                if (res.error) setError(res.error);
                else onClose();
              })
            }
          >
            Enregistrer
          </button>
        </div>
      </div>
    </Modal>
  );
}
