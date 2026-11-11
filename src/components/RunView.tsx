"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { BarChart, LineChart, PageHeader, ProgressBar, StatCard } from "@/components/charts";
import { addDays, fmtDate, fmtDuration, fmtPace, fmtShort, startOfWeek } from "@/lib/dates";
import { deleteRun, saveRun } from "@/app/actions/sport";

type Run = {
  id: number;
  date: string;
  distanceKm: number;
  durationSec: number;
  kind: string;
  feeling: number | null;
  avgHr: number | null;
  notes: string;
};

const KINDS = [
  { id: "footing", label: "Footing" },
  { id: "tempo", label: "Tempo / seuil" },
  { id: "fractionne", label: "Fractionné" },
  { id: "longue", label: "Sortie longue" },
  { id: "cotes", label: "Côtes" },
  { id: "course", label: "Compétition" },
];
const FEELINGS = ["😫", "😕", "😐", "🙂", "🤩"];
const toNum = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return isFinite(n) ? n : 0;
};
const pace = (r: Run) => r.durationSec / r.distanceKm;

export default function RunView({ runs, today, weeklyGoalKm }: { runs: Run[]; today: string; weeklyGoalKm: number }) {
  const [form, setForm] = useState<Run | "new" | null>(null);
  const [, start] = useTransition();

  const weekStart = startOfWeek(today);
  const weekKm = runs.filter((r) => r.date >= weekStart).reduce((s, r) => s + r.distanceKm, 0);
  const monthKm = runs.filter((r) => r.date > addDays(today, -30)).reduce((s, r) => s + r.distanceKm, 0);
  const totalKm = runs.reduce((s, r) => s + r.distanceKm, 0);
  const totalSec = runs.reduce((s, r) => s + r.durationSec, 0);

  const weekly = Array.from({ length: 12 }, (_, i) => {
    const ws = addDays(weekStart, (i - 11) * 7);
    const we = addDays(ws, 6);
    return {
      label: fmtShort(ws).replace(" ", "\u00a0"),
      value: Math.round(runs.filter((r) => r.date >= ws && r.date <= we).reduce((s, r) => s + r.distanceKm, 0) * 10) / 10,
    };
  });

  const paceTrend = [...runs]
    .filter((r) => r.distanceKm >= 3)
    .slice(0, 15)
    .reverse()
    .map((r) => ({ label: fmtShort(r.date), value: Math.round(pace(r)) }));

  const records = useMemo(() => {
    const longest = runs.reduce<Run | null>((b, r) => (!b || r.distanceKm > b.distanceKm ? r : b), null);
    const eligible = runs.filter((r) => r.distanceKm >= 3);
    const fastest = eligible.reduce<Run | null>((b, r) => (!b || pace(r) < pace(b) ? r : b), null);
    // Prédiction Riegel à partir de la meilleure performance (équivalent 10 km)
    let base: { d: number; t: number } | null = null;
    let bestT10 = Infinity;
    for (const r of eligible) {
      const t10 = r.durationSec * Math.pow(10 / r.distanceKm, 1.06);
      if (t10 < bestT10) {
        bestT10 = t10;
        base = { d: r.distanceKm, t: r.durationSec };
      }
    }
    const predict = (d: number) => (base ? base.t * Math.pow(d / base.d, 1.06) : 0);
    return { longest, fastest, predictions: base ? [5, 10, 21.0975, 42.195].map((d) => ({ d, t: predict(d) })) : [] };
  }, [runs]);

  return (
    <div>
      <PageHeader title="Course à pied" icon="🏃" subtitle="Distance, allure, progression">
        <button className="btn btn-primary" onClick={() => setForm("new")}>
          + Nouvelle sortie
        </button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card">
          <div className="stat-label">Cette semaine</div>
          <div className="stat-value">
            {Math.round(weekKm * 10) / 10} <span className="text-base font-normal text-zinc-500">/ {weeklyGoalKm} km</span>
          </div>
          <div className="mt-2">
            <ProgressBar value={weekKm} max={weeklyGoalKm} color="#38bdf8" />
          </div>
        </div>
        <StatCard label="30 derniers jours" value={`${Math.round(monthKm * 10) / 10} km`} />
        <StatCard label="Total 12 mois" value={`${Math.round(totalKm)} km`} sub={`${runs.length} sorties`} />
        <StatCard label="Allure moyenne" value={`${fmtPace(totalSec / (totalKm || 1))}/km`} sub={totalKm ? undefined : "—"} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="h-section">Kilomètres par semaine</div>
          <BarChart data={weekly} color="#38bdf8" goal={weeklyGoalKm} />
        </div>
        <div className="card">
          <div className="h-section">Allure (sorties ≥ 3 km, s/km — plus bas = plus rapide)</div>
          <LineChart points={paceTrend} color="#38bdf8" invert format={(n) => fmtPace(n)} />
        </div>
      </div>

      {(records.longest || records.predictions.length > 0) && (
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <div className="card">
            <div className="h-section">🏆 Records</div>
            <div className="space-y-2 text-sm">
              {records.longest && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Plus longue sortie</span>
                  <span>
                    {records.longest.distanceKm} km <span className="text-zinc-500">· {fmtShort(records.longest.date)}</span>
                  </span>
                </div>
              )}
              {records.fastest && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Meilleure allure (≥ 3 km)</span>
                  <span>
                    {fmtPace(pace(records.fastest))}/km <span className="text-zinc-500">· {records.fastest.distanceKm} km</span>
                  </span>
                </div>
              )}
            </div>
          </div>
          {records.predictions.length > 0 && (
            <div className="card">
              <div className="h-section">🔮 Temps prédits (formule de Riegel)</div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {records.predictions.map((p) => (
                  <div key={p.d} className="rounded-xl bg-zinc-950 p-2">
                    <div className="text-[11px] text-zinc-500">
                      {p.d === 21.0975 ? "Semi" : p.d === 42.195 ? "Marathon" : `${p.d} km`}
                    </div>
                    <div className="font-semibold text-sky-300">{fmtDuration(p.t)}</div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-zinc-500">Estimation théorique basée sur ta meilleure sortie récente.</p>
            </div>
          )}
        </div>
      )}

      <div className="h-section">Sorties</div>
      <div className="space-y-2">
        {runs.slice(0, 40).map((r) => (
          <button key={r.id} onClick={() => setForm(r)} className="card flex w-full items-center justify-between gap-3 text-left hover:border-zinc-600">
            <div className="min-w-0">
              <div className="font-medium">
                {r.distanceKm} km <span className="text-zinc-400">· {fmtDuration(r.durationSec)}</span>{" "}
                <span className="text-sky-300">{fmtPace(pace(r))}/km</span>
              </div>
              <div className="truncate text-xs capitalize text-zinc-400">
                {fmtDate(r.date, { weekday: "short", day: "numeric", month: "long" })} · {KINDS.find((k) => k.id === r.kind)?.label ?? r.kind}
                {r.avgHr ? ` · ${r.avgHr} bpm` : ""}
                {r.notes ? ` · ${r.notes}` : ""}
              </div>
            </div>
            <div className="text-2xl">{r.feeling ? FEELINGS[r.feeling - 1] : ""}</div>
          </button>
        ))}
        {runs.length === 0 && <div className="card text-center text-sm text-zinc-500">Pas encore de sortie. Mets tes baskets 👟</div>}
      </div>

      {form && (
        <RunForm
          run={form === "new" ? null : form}
          today={today}
          onClose={() => setForm(null)}
          onDelete={(id) => {
            if (confirm("Supprimer cette sortie ?")) start(async () => { await deleteRun(id); setForm(null); });
          }}
        />
      )}
    </div>
  );
}

function RunForm({
  run,
  today,
  onClose,
  onDelete,
}: {
  run: Run | null;
  today: string;
  onClose: () => void;
  onDelete: (id: number) => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [date, setDate] = useState(run?.date ?? today);
  const [km, setKm] = useState(run ? String(run.distanceKm) : "");
  const [h, setH] = useState(run ? String(Math.floor(run.durationSec / 3600)) : "0");
  const [m, setM] = useState(run ? String(Math.floor((run.durationSec % 3600) / 60)) : "");
  const [s, setS] = useState(run ? String(run.durationSec % 60) : "0");
  const [kind, setKind] = useState(run?.kind ?? "footing");
  const [feeling, setFeeling] = useState<number | null>(run?.feeling ?? null);
  const [hr, setHr] = useState(run?.avgHr ? String(run.avgHr) : "");
  const [notes, setNotes] = useState(run?.notes ?? "");

  const dur = toNum(h) * 3600 + toNum(m) * 60 + toNum(s);
  const livePace = toNum(km) > 0 && dur > 0 ? dur / toNum(km) : 0;

  return (
    <Modal open onClose={onClose} title={run ? "Modifier la sortie" : "Nouvelle sortie"}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Distance (km)</label>
            <input className="input" inputMode="decimal" autoFocus value={km} onChange={(e) => setKm(e.target.value)} placeholder="8.5" />
          </div>
        </div>
        <div>
          <label className="label">Durée (h / min / s)</label>
          <div className="grid grid-cols-3 gap-2">
            <input className="input" inputMode="numeric" value={h} onChange={(e) => setH(e.target.value)} placeholder="h" />
            <input className="input" inputMode="numeric" value={m} onChange={(e) => setM(e.target.value)} placeholder="min" />
            <input className="input" inputMode="numeric" value={s} onChange={(e) => setS(e.target.value)} placeholder="s" />
          </div>
          {livePace > 0 && <p className="mt-1 text-xs text-sky-300">Allure : {fmtPace(livePace)}/km</p>}
        </div>
        <div>
          <label className="label">Type</label>
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button key={k.id} onClick={() => setKind(k.id)} className={`btn btn-sm ${kind === k.id ? "btn-primary" : "btn-ghost"}`}>
                {k.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ressenti</label>
            <div className="flex gap-1">
              {FEELINGS.map((f, i) => (
                <button key={f} onClick={() => setFeeling(feeling === i + 1 ? null : i + 1)} className={`h-9 flex-1 rounded-xl text-lg ${feeling === i + 1 ? "bg-amber-400/20 ring-1 ring-amber-400" : "bg-zinc-800"}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">FC moyenne (bpm)</label>
            <input className="input" inputMode="numeric" value={hr} onChange={(e) => setHr(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Parcours, météo, sensations…" />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-between">
          {run ? (
            <button className="btn btn-danger" onClick={() => onDelete(run.id)}>
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
                const res = await saveRun({
                  id: run?.id,
                  date,
                  distanceKm: toNum(km),
                  durationSec: dur,
                  kind,
                  feeling,
                  avgHr: toNum(hr) || null,
                  notes,
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
