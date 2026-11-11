"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { LineChart, PageHeader, ProgressBar, StatCard } from "@/components/charts";
import { fmtShort } from "@/lib/dates";
import { deleteGrade, saveGrade } from "@/app/actions/life";

type Grade = { id: number; subject: string; title: string; grade: number; outOf: number; coef: number; date: string };

const SUBJECTS = [
  "Français",
  "Mathématiques",
  "Histoire-Géographie",
  "Anglais",
  "Espagnol",
  "Allemand",
  "Physique-Chimie",
  "SVT",
  "SES",
  "NSI",
  "Philosophie",
  "EPS",
  "Spécialité Musique",
  "Enseignement scientifique",
  "EMC",
];

const on20 = (g: Grade) => (g.grade / g.outOf) * 20;
const toNum = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return isFinite(n) ? n : 0;
};
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function GradesView({ grades, today }: { grades: Grade[]; today: string }) {
  const [form, setForm] = useState<Grade | "new" | null>(null);

  const subjects = useMemo(() => {
    const map = new Map<string, Grade[]>();
    grades.forEach((g) => map.set(g.subject, [...(map.get(g.subject) ?? []), g]));
    return [...map.entries()]
      .map(([name, list]) => {
        const totalCoef = list.reduce((s, g) => s + g.coef, 0);
        const avg = list.reduce((s, g) => s + on20(g) * g.coef, 0) / (totalCoef || 1);
        return { name, list, avg };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [grades]);

  const general = subjects.length ? subjects.reduce((s, x) => s + x.avg, 0) / subjects.length : null;
  const trend = grades.slice(-20).map((g) => ({ label: fmtShort(g.date), value: r2(on20(g)) }));
  const best = subjects.length ? subjects.reduce((b, s) => (s.avg > b.avg ? s : b)) : null;
  const worst = subjects.length ? subjects.reduce((b, s) => (s.avg < b.avg ? s : b)) : null;

  return (
    <div>
      <PageHeader title="Notes & moyennes" icon="🎓" subtitle="Moyennes pondérées par coefficient">
        <button className="btn btn-primary" onClick={() => setForm("new")}>
          + Ajouter une note
        </button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Moyenne générale" value={general !== null ? `${r2(general)} / 20` : "–"} accent={general !== null && general >= 10 ? "#34d399" : undefined} />
        <StatCard label="Matières" value={subjects.length} />
        <StatCard label="Meilleure matière" value={best ? best.name : "–"} sub={best ? `${r2(best.avg)} / 20` : undefined} />
        <StatCard label="À travailler" value={worst ? worst.name : "–"} sub={worst ? `${r2(worst.avg)} / 20` : undefined} />
      </div>

      {trend.length > 1 && (
        <div className="card mb-4">
          <div className="h-section">Évolution des notes (/20)</div>
          <LineChart points={trend} color="#818cf8" />
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {subjects.map((s) => (
          <div key={s.name} className="card">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-medium">{s.name}</div>
              <div className={`text-lg font-semibold ${s.avg >= 10 ? "text-emerald-300" : "text-red-300"}`}>{r2(s.avg)}</div>
            </div>
            <ProgressBar value={s.avg} max={20} color={s.avg >= 10 ? "#34d399" : "#f87171"} height={6} />
            <div className="mt-3 divide-y divide-zinc-800">
              {[...s.list].reverse().map((g) => (
                <button key={g.id} className="flex w-full items-center justify-between py-1.5 text-left text-sm hover:text-amber-300" onClick={() => setForm(g)}>
                  <span className="min-w-0 truncate">
                    {g.title || "Note"} <span className="text-xs text-zinc-500">· {fmtShort(g.date)} · coef {g.coef}</span>
                  </span>
                  <span className="shrink-0">
                    {g.grade}/{g.outOf}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {subjects.length === 0 && <div className="card text-center text-sm text-zinc-500">Ajoute tes notes pour suivre tes moyennes.</div>}

      {form && <GradeForm grade={form === "new" ? null : form} today={today} onClose={() => setForm(null)} />}
    </div>
  );
}

function GradeForm({ grade, today, onClose }: { grade: Grade | null; today: string; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [f, setF] = useState({
    subject: grade?.subject ?? "",
    title: grade?.title ?? "",
    grade: grade ? String(grade.grade) : "",
    outOf: grade ? String(grade.outOf) : "20",
    coef: grade ? String(grade.coef) : "1",
    date: grade?.date ?? today,
  });
  return (
    <Modal open onClose={onClose} title={grade ? "Modifier la note" : "Nouvelle note"}>
      <div className="space-y-4">
        <div>
          <label className="label">Matière</label>
          <input className="input" list="subjects" autoFocus value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
          <datalist id="subjects">
            {SUBJECTS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label">Intitulé (DS, interro…)</label>
          <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Note</label>
            <input className="input" inputMode="decimal" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} />
          </div>
          <div>
            <label className="label">Sur</label>
            <input className="input" inputMode="decimal" value={f.outOf} onChange={(e) => setF({ ...f, outOf: e.target.value })} />
          </div>
          <div>
            <label className="label">Coef</label>
            <input className="input" inputMode="decimal" value={f.coef} onChange={(e) => setF({ ...f, coef: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-between">
          {grade ? (
            <button
              className="btn btn-danger"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await deleteGrade(grade.id);
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
                const res = await saveGrade({
                  id: grade?.id,
                  subject: f.subject,
                  title: f.title,
                  grade: toNum(f.grade),
                  outOf: toNum(f.outOf),
                  coef: toNum(f.coef),
                  date: f.date,
                });
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
