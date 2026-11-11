"use client";

import { useState } from "react";
import { Empty, Field, Loading, Modal, NumInput, Spark, Stat, confirmDelete } from "@/components/ui";
import { fmtDate, todayStr } from "@/lib/dates";
import { useItems } from "@/lib/store";
import type { Grade, Subject } from "@/lib/types";
import { average } from "./Subjects";

type Form = { date: string; subjectId: number; title: string; value: number; outOf: number; coef: number };

export default function Grades() {
  const grades = useItems<Grade>("grade");
  const subjects = useItems<Subject>("subject");
  const [form, setForm] = useState<Form | null>(null);

  if (!grades.loaded || !subjects.loaded) return <Loading />;

  const rows = subjects.items
    .map((s) => ({ s, avg: average(grades.items.filter((g) => g.subjectId === s.id)) }))
    .filter((r) => r.avg !== null) as { s: (typeof subjects.items)[number]; avg: number }[];
  const coefSum = rows.reduce((a, r) => a + (r.s.coef || 1), 0);
  const general = coefSum ? rows.reduce((a, r) => a + r.avg * (r.s.coef || 1), 0) / coefSum : null;
  const sorted = [...grades.items].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const sj = (id: number) => subjects.items.find((s) => s.id === id);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          className="btn btn-primary"
          disabled={subjects.items.length === 0}
          onClick={() => setForm({ date: todayStr(), subjectId: subjects.items[0].id, title: "", value: 0, outOf: 20, coef: 1 })}
        >
          + Note
        </button>
      </div>
      {subjects.items.length === 0 && <Empty>Crée d&apos;abord tes matières dans l&apos;onglet « Matières ».</Empty>}

      {general !== null && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Moyenne générale" value={`${general.toFixed(2)}/20`} sub="pondérée par coef. des matières" accent="#fbbf24" />
          <Stat label="Meilleure matière" value={[...rows].sort((a, b) => b.avg - a.avg)[0].s.name} sub={`${[...rows].sort((a, b) => b.avg - a.avg)[0].avg.toFixed(1)}/20`} />
          <Stat label="À travailler" value={[...rows].sort((a, b) => a.avg - b.avg)[0].s.name} sub={`${[...rows].sort((a, b) => a.avg - b.avg)[0].avg.toFixed(1)}/20`} />
          <div className="card !p-3.5">
            <div className="mb-1 text-xs tracking-wide text-zinc-400 uppercase">Tendance des notes</div>
            <Spark points={[...grades.items].sort((a, b) => a.date.localeCompare(b.date)).slice(-12).map((g) => (g.value / (g.outOf || 20)) * 20)} height={50} labels={["", ""]} />
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="card space-y-2">
          <h3 className="font-semibold">Moyennes par matière</h3>
          {rows.map(({ s, avg }) => (
            <div key={s.id} className="flex items-center gap-3 text-sm">
              <span className="w-40 truncate">{s.name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full" style={{ width: `${(avg / 20) * 100}%`, background: s.color }} />
              </div>
              <b className="w-12 text-right">{avg.toFixed(1)}</b>
            </div>
          ))}
        </div>
      )}

      {sorted.length > 0 && (
        <div className="card divide-y divide-zinc-800 !py-2">
          {sorted.map((g) => {
            const s = sj(g.subjectId);
            return (
              <div key={g.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    <span style={{ color: s?.color }}>{s?.name ?? "?"}</span> · {g.title || "Note"}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {fmtDate(g.date)} · coef {g.coef}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <b>
                    {g.value}/{g.outOf}
                  </b>
                  <button className="btn btn-ghost btn-sm" onClick={() => confirmDelete() && grades.remove(g.id)}>
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title="Nouvelle note">
        {form && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Matière">
                <select className="input" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: Number(e.target.value) })}>
                  {subjects.items.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date">
                <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </Field>
            </div>
            <Field label="Intitulé">
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="DS n°2, oral…" />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Note">
                <NumInput value={form.value} step={0.25} onChange={(n) => setForm({ ...form, value: n })} />
              </Field>
              <Field label="Sur">
                <NumInput value={form.outOf} onChange={(n) => setForm({ ...form, outOf: n })} />
              </Field>
              <Field label="Coef.">
                <NumInput value={form.coef} step={0.5} onChange={(n) => setForm({ ...form, coef: n })} />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setForm(null)}>
                Annuler
              </button>
              <button
                className="btn btn-primary"
                disabled={form.outOf <= 0}
                onClick={async () => {
                  const { date, ...data } = form;
                  await grades.add(data, date);
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
