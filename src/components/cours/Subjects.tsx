"use client";

import { useState } from "react";
import { ColorPicker, Empty, Field, Loading, Modal, NumInput, Progress, confirmDelete } from "@/components/ui";
import { COLORS } from "@/lib/schedule";
import { useItems } from "@/lib/store";
import type { Chapter, Grade, Subject } from "@/lib/types";

export const CHAPTER_STATUS: Record<Chapter["status"], { label: string; color: string; next: Chapter["status"] }> = {
  todo: { label: "À voir", color: "#71717a", next: "seen" },
  seen: { label: "Vu", color: "#3b82f6", next: "review" },
  review: { label: "À réviser", color: "#f59e0b", next: "mastered" },
  mastered: { label: "Maîtrisé", color: "#10b981", next: "todo" },
};

export const DEFAULT_SUBJECTS: Omit<Subject, never>[] = [
  { name: "Mathématiques", color: "#3b82f6", coef: 4 },
  { name: "Français", color: "#ec4899", coef: 4 },
  { name: "Physique-Chimie", color: "#06b6d4", coef: 3 },
  { name: "SVT", color: "#10b981", coef: 3 },
  { name: "Histoire-Géo", color: "#f59e0b", coef: 3 },
  { name: "Anglais", color: "#ef4444", coef: 3 },
  { name: "Philosophie", color: "#a855f7", coef: 3 },
  { name: "Musique / spécialité", color: "#fbbf24", coef: 5 },
  { name: "EPS", color: "#84cc16", coef: 2 },
];

export function average(grades: { value: number; outOf: number; coef: number }[]): number | null {
  const c = grades.reduce((a, g) => a + (g.coef || 1), 0);
  if (!c) return null;
  return grades.reduce((a, g) => a + (g.value / (g.outOf || 20)) * 20 * (g.coef || 1), 0) / c;
}

type SForm = { id?: number; name: string; color: string; coef: number; teacher: string };
type CForm = { id?: number; subjectId: number; title: string; status: Chapter["status"]; notes: string };

export default function Subjects() {
  const subjects = useItems<Subject>("subject");
  const chapters = useItems<Chapter>("chapter");
  const grades = useItems<Grade>("grade");
  const [sForm, setSForm] = useState<SForm | null>(null);
  const [cForm, setCForm] = useState<CForm | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [newCh, setNewCh] = useState("");

  if (!subjects.loaded || !chapters.loaded) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        {subjects.items.length === 0 && (
          <button
            className="btn"
            onClick={async () => {
              for (const s of DEFAULT_SUBJECTS) await subjects.add(s);
            }}
          >
            ✨ Ajouter les matières types
          </button>
        )}
        <button className="btn btn-primary" onClick={() => setSForm({ name: "", color: COLORS[5], coef: 1, teacher: "" })}>
          + Matière
        </button>
      </div>

      {subjects.items.length === 0 ? (
        <Empty>Crée tes matières pour y suivre les chapitres à réviser, tes notes et tes fiches.</Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {subjects.items.map((s) => {
            const chs = chapters.items.filter((c) => c.subjectId === s.id);
            const mastered = chs.filter((c) => c.status === "mastered").length;
            const avg = average(grades.items.filter((g) => g.subjectId === s.id));
            const isOpen = open === s.id;
            return (
              <div key={s.id} className="card space-y-3" style={{ borderLeft: `4px solid ${s.color}` }}>
                <div className="flex items-start justify-between gap-2">
                  <button className="text-left" onClick={() => setOpen(isOpen ? null : s.id)}>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-zinc-400">
                      coef {s.coef}
                      {s.teacher ? ` · ${s.teacher}` : ""}
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-xl font-bold" style={{ color: s.color }}>
                        {avg !== null ? avg.toFixed(1) : "—"}
                      </div>
                      <div className="text-[10px] text-zinc-500">/20</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSForm({ id: s.id, name: s.name, color: s.color, coef: s.coef, teacher: s.teacher ?? "" })}>
                      ✏️
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => confirmDelete(`Supprimer « ${s.name} » (chapitres, notes et fiches liés) ?`) && subjects.remove(s.id)}>
                      ✕
                    </button>
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-zinc-400">
                    <span>Chapitres maîtrisés</span>
                    <span>
                      {mastered}/{chs.length}
                    </span>
                  </div>
                  <Progress value={mastered} max={chs.length || 1} color={s.color} height={6} />
                </div>
                {isOpen && (
                  <div className="space-y-1.5 border-t border-zinc-800 pt-3">
                    {chs.map((c) => {
                      const st = CHAPTER_STATUS[c.status];
                      return (
                        <div key={c.id} className="flex items-center gap-2">
                          <button
                            className="w-24 shrink-0 cursor-pointer rounded-full py-0.5 text-[11px] font-medium"
                            style={{ background: st.color + "30", color: st.color }}
                            onClick={() => chapters.update(c.id, { status: st.next })}
                          >
                            {st.label}
                          </button>
                          <button className="min-w-0 flex-1 truncate text-left text-sm" onClick={() => setCForm({ id: c.id, subjectId: s.id, title: c.title, status: c.status, notes: c.notes ?? "" })}>
                            {c.title} {c.notes && <span className="text-zinc-600">📝</span>}
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => chapters.remove(c.id)}>
                            ✕
                          </button>
                        </div>
                      );
                    })}
                    <form
                      className="flex gap-2 pt-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newCh.trim()) return;
                        void chapters.add({ subjectId: s.id, title: newCh.trim(), status: "todo" });
                        setNewCh("");
                      }}
                    >
                      <input className="input" placeholder="Nouveau chapitre / leçon…" value={newCh} onChange={(e) => setNewCh(e.target.value)} />
                      <button className="btn">+</button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!sForm} onClose={() => setSForm(null)} title={sForm?.id ? "Modifier la matière" : "Nouvelle matière"}>
        {sForm && (
          <div className="space-y-3">
            <Field label="Nom">
              <input className="input" autoFocus value={sForm.name} onChange={(e) => setSForm({ ...sForm, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Coefficient">
                <NumInput value={sForm.coef} step={0.5} onChange={(n) => setSForm({ ...sForm, coef: n })} />
              </Field>
              <Field label="Prof">
                <input className="input" value={sForm.teacher} onChange={(e) => setSForm({ ...sForm, teacher: e.target.value })} />
              </Field>
            </div>
            <Field label="Couleur">
              <ColorPicker colors={COLORS} value={sForm.color} onChange={(c) => setSForm({ ...sForm, color: c })} />
            </Field>
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setSForm(null)}>
                Annuler
              </button>
              <button
                className="btn btn-primary"
                disabled={!sForm.name.trim()}
                onClick={async () => {
                  const { id, ...rest } = sForm;
                  const data: Subject = { ...rest, name: rest.name.trim(), teacher: rest.teacher || undefined };
                  if (id) await subjects.update(id, data);
                  else await subjects.add(data);
                  setSForm(null);
                }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!cForm} onClose={() => setCForm(null)} title="Chapitre">
        {cForm && (
          <div className="space-y-3">
            <Field label="Titre">
              <input className="input" value={cForm.title} onChange={(e) => setCForm({ ...cForm, title: e.target.value })} />
            </Field>
            <Field label="Statut">
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(CHAPTER_STATUS) as Chapter["status"][]).map((k) => (
                  <button key={k} className={`chip ${cForm.status === k ? "chip-on" : ""}`} onClick={() => setCForm({ ...cForm, status: k })}>
                    {CHAPTER_STATUS[k].label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Notes / fiche de révision">
              <textarea className="input" rows={7} value={cForm.notes} onChange={(e) => setCForm({ ...cForm, notes: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setCForm(null)}>
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  if (cForm.id) await chapters.update(cForm.id, { title: cForm.title, status: cForm.status, notes: cForm.notes || undefined });
                  setCForm(null);
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
