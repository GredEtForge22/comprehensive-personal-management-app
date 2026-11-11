"use client";

import { useState } from "react";
import { Field, Modal, NumInput, Rating } from "@/components/ui";
import { FOCUS, KEYS, SATISFACTION, SCALE_TYPES } from "@/lib/sax";
import { useItems } from "@/lib/store";
import type { Piece, PieceLog, SaxSession, ScaleLog } from "@/lib/types";

export type SessionDraft = {
  id?: number;
  date: string;
  minutes: number;
  satisfaction: number;
  focus: string[];
  scales: ScaleLog[];
  pieces: PieceLog[];
  notes: string;
  toFix: string;
};

export default function SessionForm({ initial, onClose }: { initial: SessionDraft | null; onClose: () => void }) {
  const sessions = useItems<SaxSession>("sax");
  const pieces = useItems<Piece>("piece");
  const [f, setF] = useState<SessionDraft | null>(initial);
  const [prev, setPrev] = useState(initial);
  if (prev !== initial) {
    setPrev(initial);
    setF(initial);
  }

  async function save() {
    if (!f) return;
    if (f.minutes <= 0) {
      alert("Indique la durée de la séance.");
      return;
    }
    const data: SaxSession = {
      minutes: f.minutes,
      satisfaction: f.satisfaction,
      focus: f.focus,
      scales: f.scales.filter((s) => s.key && s.type),
      pieces: f.pieces.filter((p) => p.title.trim()),
      notes: f.notes || undefined,
      toFix: f.toFix || undefined,
    };
    if (f.id) await sessions.update(f.id, { ...data, date: f.date });
    else await sessions.add(data, f.date);
    // met à jour le tempo atteint dans le répertoire
    for (const p of data.pieces) {
      const rep = pieces.items.find((x) => x.title.toLowerCase() === p.title.trim().toLowerCase());
      if (rep && p.tempo > (rep.currentTempo || 0)) await pieces.update(rep.id, { currentTempo: p.tempo });
    }
    onClose();
  }

  return (
    <Modal open={!!f} onClose={onClose} title={f?.id ? "Modifier la séance" : "Nouvelle séance de sax"} wide>
      {f && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input type="date" className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
            </Field>
            <Field label="Durée (minutes)">
              <NumInput value={f.minutes} onChange={(n) => setF({ ...f, minutes: n })} />
            </Field>
          </div>
          <Field label="Satisfaction de la séance">
            <Rating value={f.satisfaction} onChange={(v) => setF({ ...f, satisfaction: v })} icons={SATISFACTION} />
          </Field>
          <Field label="Type de travail">
            <div className="flex flex-wrap gap-1.5">
              {FOCUS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`chip ${f.focus.includes(t) ? "chip-on" : ""}`}
                  onClick={() => setF({ ...f, focus: f.focus.includes(t) ? f.focus.filter((x) => x !== t) : [...f.focus, t] })}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Gammes travaillées">
            <div className="space-y-1.5">
              {f.scales.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <select className="input !w-24" value={s.key} onChange={(e) => setF({ ...f, scales: f.scales.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)) })}>
                    {KEYS.map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                  <select className="input" value={s.type} onChange={(e) => setF({ ...f, scales: f.scales.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)) })}>
                    {SCALE_TYPES.map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                  <div className="w-24 shrink-0">
                    <NumInput value={s.tempo} placeholder="♩ =" onChange={(n) => setF({ ...f, scales: f.scales.map((x, j) => (j === i ? { ...x, tempo: n } : x)) })} />
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setF({ ...f, scales: f.scales.filter((_, j) => j !== i) })}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              className="btn btn-sm mt-2"
              onClick={() => setF({ ...f, scales: [...f.scales, { key: "Do", type: "Majeure", tempo: 0 }] })}
            >
              + Gamme
            </button>
          </Field>

          <Field label="Morceaux travaillés">
            <datalist id="piece-list">
              {pieces.items.map((p) => (
                <option key={p.id} value={p.title} />
              ))}
            </datalist>
            <div className="space-y-1.5">
              {f.pieces.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    list="piece-list"
                    className="input"
                    placeholder="Titre du morceau"
                    value={p.title}
                    onChange={(e) => setF({ ...f, pieces: f.pieces.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })}
                  />
                  <div className="w-24 shrink-0">
                    <NumInput value={p.tempo} placeholder="♩ =" onChange={(n) => setF({ ...f, pieces: f.pieces.map((x, j) => (j === i ? { ...x, tempo: n } : x)) })} />
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setF({ ...f, pieces: f.pieces.filter((_, j) => j !== i) })}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button className="btn btn-sm mt-2" onClick={() => setF({ ...f, pieces: [...f.pieces, { title: "", tempo: 0 }] })}>
              + Morceau
            </button>
          </Field>

          <Field label="Notes">
            <textarea className="input" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Ce qui a bien marché, sensations…" />
          </Field>
          <Field label="À retravailler">
            <input className="input" value={f.toFix} onChange={(e) => setF({ ...f, toFix: e.target.value })} placeholder="Mesures 12–16, doigtés du si♭ aigu…" />
          </Field>
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={onClose}>
              Annuler
            </button>
            <button className="btn btn-primary" onClick={save}>
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
