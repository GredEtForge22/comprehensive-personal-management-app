"use client";

import { useState } from "react";
import { Empty, Field, Loading, Modal, NumInput, Progress, confirmDelete } from "@/components/ui";
import { countdown, diffDays, fmtDate, todayStr } from "@/lib/dates";
import { PIECE_STATUS } from "@/lib/sax";
import { useItems } from "@/lib/store";
import type { Piece } from "@/lib/types";

type Form = {
  id?: number;
  title: string;
  composer: string;
  targetTempo: number;
  currentTempo: number;
  status: Piece["status"];
  deadline: string;
  notes: string;
};
const blank: Form = { title: "", composer: "", targetTempo: 100, currentTempo: 0, status: "learning", deadline: "", notes: "" };

export default function Repertoire() {
  const pieces = useItems<Piece>("piece");
  const [form, setForm] = useState<Form | null>(null);
  const [filter, setFilter] = useState("all");
  const today = todayStr();

  if (!pieces.loaded) return <Loading />;

  const list = pieces.items
    .filter((p) => filter === "all" || p.status === filter)
    .sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999") || a.title.localeCompare(b.title));

  async function save() {
    if (!form || !form.title.trim()) return;
    const { id, deadline, ...rest } = form;
    const data: Piece = { ...rest, title: rest.title.trim(), deadline: deadline || undefined };
    if (id) await pieces.update(id, data);
    else await pieces.add(data);
    setForm(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button className={`chip ${filter === "all" ? "chip-on" : ""}`} onClick={() => setFilter("all")}>
            Tous ({pieces.items.length})
          </button>
          {Object.entries(PIECE_STATUS).map(([k, v]) => (
            <button key={k} className={`chip ${filter === k ? "chip-on" : ""}`} onClick={() => setFilter(k)}>
              {v.label}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setForm(blank)}>
          + Morceau
        </button>
      </div>

      {list.length === 0 ? (
        <Empty>Ton répertoire est vide. Ajoute les morceaux que tu travailles, avec un tempo cible et une échéance 🎶</Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((p) => {
            const st = PIECE_STATUS[p.status] ?? PIECE_STATUS.learning;
            const late = p.deadline && diffDays(today, p.deadline) < 0 && p.status !== "done";
            return (
              <div key={p.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{p.title}</div>
                    {p.composer && <div className="text-xs text-zinc-400">{p.composer}</div>}
                  </div>
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: st.color + "30", color: st.color }}>
                    {st.label}
                  </span>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-zinc-400">
                    <span>
                      ♩ = <b className="text-zinc-100">{p.currentTempo || 0}</b> / {p.targetTempo}
                    </span>
                    <span>{p.targetTempo ? Math.round(((p.currentTempo || 0) / p.targetTempo) * 100) : 0}%</span>
                  </div>
                  <Progress value={p.currentTempo || 0} max={p.targetTempo || 1} color={st.color} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className={late ? "font-semibold text-red-400" : "text-zinc-400"}>
                    {p.deadline ? `📅 ${fmtDate(p.deadline)} · ${countdown(p.deadline)}` : "Pas d'échéance"}
                  </span>
                  <div className="flex gap-1.5">
                    <button className="btn btn-sm" onClick={() => pieces.update(p.id, { currentTempo: Math.max(0, (p.currentTempo || 0) - 5) })}>
                      −5
                    </button>
                    <button className="btn btn-sm" onClick={() => pieces.update(p.id, { currentTempo: (p.currentTempo || 0) + 5 })}>
                      +5
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => setForm({ id: p.id, title: p.title, composer: p.composer ?? "", targetTempo: p.targetTempo, currentTempo: p.currentTempo || 0, status: p.status, deadline: p.deadline ?? "", notes: p.notes ?? "" })}
                    >
                      ✏️
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => confirmDelete() && pieces.remove(p.id)}>
                      🗑️
                    </button>
                  </div>
                </div>
                {p.notes && <p className="text-xs text-zinc-400">📝 {p.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Modifier le morceau" : "Nouveau morceau"}>
        {form && (
          <div className="space-y-3">
            <Field label="Titre">
              <input className="input" autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Compositeur">
              <input className="input" value={form.composer} onChange={(e) => setForm({ ...form, composer: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tempo actuel">
                <NumInput value={form.currentTempo} onChange={(n) => setForm({ ...form, currentTempo: n })} />
              </Field>
              <Field label="Tempo cible">
                <NumInput value={form.targetTempo} onChange={(n) => setForm({ ...form, targetTempo: n })} />
              </Field>
              <Field label="Statut">
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Piece["status"] })}>
                  {Object.entries(PIECE_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Échéance">
                <input type="date" className="input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
