"use client";

import { useEffect, useMemo, useState } from "react";
import Repertoire from "@/components/sax/Repertoire";
import Scales from "@/components/sax/Scales";
import SessionForm, { type SessionDraft } from "@/components/sax/SessionForm";
import { Bars, Empty, Heatmap, Loading, PageHeader, Progress, Stat, Tabs, confirmDelete, NumInput } from "@/components/ui";
import { addDays, diffDays, fmtDate, fmtDuration, DAYS_SHORT, todayStr, weekDates, weekStart } from "@/lib/dates";
import { PIECE_STATUS, ROUTINE, SATISFACTION, scaleStats, scaleId, KEYS, SCALE_TYPES } from "@/lib/sax";
import { useItems, useSettings } from "@/lib/store";
import type { Piece, SaxSession, ScaleQuick } from "@/lib/types";

type Tab = "suivi" | "seances" | "gammes" | "repertoire";

type Timer = { running: boolean; startedAt: number; acc: number };
const KEY = "sax-stopwatch-v1";

function useStopwatch() {
  const [t, setT] = useState<Timer>({ running: false, startedAt: 0, acc: 0 });
  const [now, setNow] = useState(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setT(JSON.parse(raw) as Timer);
    } catch {
      /* ignore */
    }
    setNow(Date.now());
  }, []);
  useEffect(() => {
    if (!t.running) return;
    const i = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(i);
  }, [t.running]);
  const persist = (n: Timer) => {
    setT(n);
    localStorage.setItem(KEY, JSON.stringify(n));
    setNow(Date.now());
  };
  const elapsed = t.acc + (t.running ? Math.max(0, now - t.startedAt) : 0);
  return {
    running: t.running,
    elapsed,
    start: () => persist({ running: true, startedAt: Date.now(), acc: t.acc }),
    pause: () => persist({ running: false, startedAt: 0, acc: t.acc + (Date.now() - t.startedAt) }),
    reset: () => persist({ running: false, startedAt: 0, acc: 0 }),
  };
}

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export default function SaxPage() {
  const sessions = useItems<SaxSession>("sax");
  const quick = useItems<ScaleQuick>("scalelog");
  const pieces = useItems<Piece>("piece");
  const { settings, set } = useSettings();
  const [tab, setTab] = useState<Tab>("suivi");
  const [draft, setDraft] = useState<SessionDraft | null>(null);
  const [editGoal, setEditGoal] = useState(false);
  const sw = useStopwatch();
  const today = todayStr();

  const blank = (minutes = 0): SessionDraft => ({
    date: today,
    minutes,
    satisfaction: 4,
    focus: [],
    scales: [],
    pieces: [],
    notes: "",
    toFix: "",
  });

  const sorted = useMemo(() => [...sessions.items].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id), [sessions.items]);

  const minutesByDay = useMemo(() => {
    const m: Record<string, number> = {};
    sessions.items.forEach((s) => (m[s.date] = (m[s.date] ?? 0) + s.minutes));
    return m;
  }, [sessions.items]);

  const goal = settings.saxWeeklyMin;
  const wk = weekStart(today);
  const week = weekDates(today);
  const weekMin = week.reduce((a, d) => a + (minutesByDay[d] ?? 0), 0);
  const daysLeft = 7 - week.indexOf(today);
  const remaining = Math.max(0, goal - weekMin);

  // série de jours consécutifs
  let streak = 0;
  for (let d = minutesByDay[today] ? today : addDays(today, -1); minutesByDay[d]; d = addDays(d, -1)) streak++;

  const last10 = sorted.slice(0, 10);
  const avgSat = last10.length ? last10.reduce((a, s) => a + s.satisfaction, 0) / last10.length : 0;
  const totalMin = sessions.items.reduce((a, s) => a + s.minutes, 0);

  const weekly = Array.from({ length: 8 }, (_, i) => {
    const s = addDays(wk, -7 * (7 - i));
    const total = weekDates(s).reduce((a, d) => a + (minutesByDay[d] ?? 0), 0);
    return { label: fmtDate(s, { day: "numeric", month: "numeric" }), value: Math.round((total / 60) * 10) / 10, highlight: i === 7 };
  });

  const focusCount = useMemo(() => {
    const since = addDays(today, -30);
    const m: Record<string, number> = {};
    sessions.items.filter((s) => s.date >= since).forEach((s) => (s.focus ?? []).forEach((f) => (m[f] = (m[f] ?? 0) + s.minutes / Math.max(1, s.focus.length))));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [sessions.items, today]);

  const stats = useMemo(() => scaleStats(sessions.items, quick.items), [sessions.items, quick.items]);
  const suggestScales = useMemo(() => {
    const all = KEYS.flatMap((k) => ["Majeure", "Mineure mélodique", "Arpège 7", "Pentatonique mineure", "Blues"].map((t) => ({ k, t })));
    return all
      .map((x) => ({ ...x, last: stats.get(scaleId(x.k, x.t))?.last ?? "" }))
      .sort((a, b) => a.last.localeCompare(b.last) || KEYS.indexOf(a.k) - KEYS.indexOf(b.k))
      .slice(0, 3);
  }, [stats]);
  const upcoming = pieces.items
    .filter((p) => p.status !== "done")
    .sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"))
    .slice(0, 3);

  void SCALE_TYPES;

  if (!sessions.loaded) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Saxophone"
        sub="Séances, gammes, répertoire — vers le pro 🎷"
        actions={
          <button className="btn btn-primary" onClick={() => setDraft(blank())}>
            + Séance
          </button>
        }
      />
      <Tabs
        tabs={[
          { id: "suivi", label: "Suivi" },
          { id: "seances", label: "Séances" },
          { id: "gammes", label: "Gammes" },
          { id: "repertoire", label: "Répertoire" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "suivi" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Chrono */}
            <div className="card flex flex-col items-center justify-center gap-3 text-center">
              <div className="text-xs tracking-wide text-zinc-400 uppercase">Chrono de séance</div>
              <div className={`font-mono text-5xl font-bold tabular-nums ${sw.running ? "text-amber-300" : ""}`}>{clock(sw.elapsed)}</div>
              <div className="flex flex-wrap justify-center gap-2">
                {sw.running ? (
                  <button className="btn" onClick={sw.pause}>
                    ⏸ Pause
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={sw.start}>
                    ▶ {sw.elapsed > 0 ? "Reprendre" : "Démarrer"}
                  </button>
                )}
                {sw.elapsed > 0 && (
                  <>
                    <button
                      className="btn"
                      onClick={() => {
                        const mins = Math.max(1, Math.round(sw.elapsed / 60000));
                        if (sw.running) sw.pause();
                        setDraft(blank(mins));
                        sw.reset();
                      }}
                    >
                      ✅ Terminer
                    </button>
                    <button className="btn btn-ghost" onClick={sw.reset}>
                      Reset
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-zinc-500">Le chrono continue même si tu changes de page.</p>
            </div>

            {/* Objectif hebdo */}
            <div className="card lg:col-span-2">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs tracking-wide text-zinc-400 uppercase">Objectif de la semaine</div>
                  <div className="mt-1 text-3xl font-bold text-amber-300">
                    {fmtDuration(weekMin)} <span className="text-base font-normal text-zinc-500">/ {fmtDuration(goal)}</span>
                  </div>
                </div>
                <button className="btn btn-sm" onClick={() => setEditGoal(!editGoal)}>
                  ⚙️ Objectif
                </button>
              </div>
              {editGoal && (
                <div className="mb-3 flex items-center gap-2">
                  <div className="w-28">
                    <NumInput value={goal} step={30} onChange={(n) => set({ saxWeeklyMin: n })} />
                  </div>
                  <span className="text-sm text-zinc-400">minutes par semaine (510 = 8h30)</span>
                </div>
              )}
              <Progress value={weekMin} max={goal} height={12} color={weekMin >= goal ? "#10b981" : "#fbbf24"} />
              <p className="mt-2 text-sm text-zinc-400">
                {remaining === 0
                  ? "🎉 Objectif atteint, bravo !"
                  : `Reste ${fmtDuration(remaining)} → environ ${fmtDuration(Math.ceil(remaining / daysLeft))} par jour jusqu'à dimanche.`}
              </p>
              <div className="mt-4">
                <Bars
                  data={week.map((d, i) => ({ label: DAYS_SHORT[i], value: minutesByDay[d] ?? 0, highlight: d === today }))}
                  height={100}
                  unit=" min"
                  target={goal / 7}
                />
                <p className="mt-1 text-center text-[10px] text-zinc-600">Ligne verte : moyenne quotidienne visée ({fmtDuration(goal / 7)})</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Série en cours" value={`${streak} j`} sub="jours consécutifs" accent={streak > 0 ? "#fbbf24" : undefined} />
            <Stat label="Satisfaction" value={avgSat ? `${SATISFACTION[Math.round(avgSat) - 1]} ${avgSat.toFixed(1)}/5` : "—"} sub="10 dernières séances" />
            <Stat label="Total travaillé" value={`${Math.round(totalMin / 60)} h`} sub={`${sessions.items.length} séances`} />
            <Stat label="Gammes explorées" value={`${stats.size}`} sub={`sur ${KEYS.length * SCALE_TYPES.length}`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <h3 className="mb-3 font-semibold">Régularité</h3>
              <Heatmap values={Object.fromEntries(Object.entries(minutesByDay).map(([d, m]) => [d, m / (goal / 7)]))} weeks={16} />
              <p className="mt-2 text-xs text-zinc-500">Plus la case est claire, plus tu as dépassé ton quota quotidien.</p>
            </div>
            <div className="card">
              <h3 className="mb-3 font-semibold">Heures par semaine</h3>
              <Bars data={weekly} unit=" h" target={goal / 60} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <h3 className="mb-3 font-semibold">Répartition du travail (30 j)</h3>
              {focusCount.length === 0 ? (
                <p className="text-sm text-zinc-500">Coche les types de travail dans tes séances pour voir la répartition.</p>
              ) : (
                <div className="space-y-2">
                  {focusCount.slice(0, 7).map(([name, min]) => (
                    <div key={name}>
                      <div className="mb-0.5 flex justify-between text-xs">
                        <span>{name}</span>
                        <span className="text-zinc-400">{fmtDuration(min)}</span>
                      </div>
                      <Progress value={min} max={focusCount[0][1]} height={6} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card">
              <h3 className="mb-3 font-semibold">💡 Idée de séance (≈ 60 min)</h3>
              <ul className="space-y-1.5 text-sm">
                {ROUTINE.map((r) => (
                  <li key={r.label} className="flex gap-2">
                    <span className="w-10 shrink-0 text-amber-300">{r.min}&apos;</span>
                    <span>
                      <b>{r.label}</b> <span className="text-zinc-500">— {r.hint}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 border-t border-zinc-800 pt-3 text-sm">
                <div className="mb-1 text-xs text-zinc-400 uppercase">Gammes les moins travaillées</div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestScales.map((s) => (
                    <span key={s.k + s.t} className="chip">
                      {s.k} {s.t}
                    </span>
                  ))}
                </div>
                {upcoming.length > 0 && (
                  <>
                    <div className="mt-3 mb-1 text-xs text-zinc-400 uppercase">Morceaux prioritaires</div>
                    <div className="flex flex-wrap gap-1.5">
                      {upcoming.map((p) => (
                        <span key={p.id} className="chip" style={{ borderColor: PIECE_STATUS[p.status]?.color }}>
                          {p.title}
                          {p.deadline ? ` · ${diffDays(today, p.deadline)} j` : ""}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "seances" && (
        <div className="space-y-2">
          {sorted.length === 0 ? (
            <Empty>Pas encore de séance. Lance le chrono ou ajoute-en une à la main.</Empty>
          ) : (
            sorted.map((s) => (
              <div key={s.id} className="card !p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">
                      {SATISFACTION[(s.satisfaction || 3) - 1]} {fmtDuration(s.minutes)}{" "}
                      <span className="text-sm font-normal text-zinc-400">· {fmtDate(s.date, { weekday: "short", day: "numeric", month: "short" })}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(s.focus ?? []).map((f) => (
                        <span key={f} className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      className="btn btn-sm"
                      onClick={() =>
                        setDraft({
                          id: s.id,
                          date: s.date,
                          minutes: s.minutes,
                          satisfaction: s.satisfaction,
                          focus: s.focus ?? [],
                          scales: s.scales ?? [],
                          pieces: s.pieces ?? [],
                          notes: s.notes ?? "",
                          toFix: s.toFix ?? "",
                        })
                      }
                    >
                      ✏️
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => confirmDelete() && sessions.remove(s.id)}>
                      🗑️
                    </button>
                  </div>
                </div>
                {((s.scales?.length ?? 0) > 0 || (s.pieces?.length ?? 0) > 0) && (
                  <div className="mt-2 space-y-0.5 text-xs text-zinc-400">
                    {s.scales?.length > 0 && (
                      <div>
                        🎼 {s.scales.map((x) => `${x.key} ${x.type}${x.tempo ? ` ♩${x.tempo}` : ""}`).join(" · ")}
                      </div>
                    )}
                    {s.pieces?.length > 0 && <div>🎶 {s.pieces.map((x) => `${x.title}${x.tempo ? ` ♩${x.tempo}` : ""}`).join(" · ")}</div>}
                  </div>
                )}
                {s.notes && <p className="mt-1 text-sm text-zinc-300">📝 {s.notes}</p>}
                {s.toFix && <p className="mt-1 text-sm text-amber-300">🔧 {s.toFix}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "gammes" && <Scales />}
      {tab === "repertoire" && <Repertoire />}

      <SessionForm initial={draft} onClose={() => setDraft(null)} />
    </div>
  );
}
