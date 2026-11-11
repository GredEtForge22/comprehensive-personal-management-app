"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { BarChart, Heatmap, PageHeader, ProgressBar, StatCard } from "@/components/charts";
import { addDays, diffDays, fmtDate, fmtMinutes, fmtShort, startOfWeek } from "@/lib/dates";
import { PIECE_STATUS, PRACTICE_CATEGORIES } from "@/lib/music";
import { deletePiece, deletePractice, savePiece, savePractice } from "@/app/actions/music";

type Session = {
  id: number;
  date: string;
  minutes: number;
  category: string;
  piece: string;
  tempoBpm: number | null;
  quality: number | null;
  notes: string;
};
type Piece = {
  id: number;
  title: string;
  composer: string;
  status: string;
  currentBpm: number | null;
  targetBpm: number | null;
  deadline: string | null;
  notes: string;
};

const toNum = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return isFinite(n) ? n : 0;
};
const catOf = (id: string) => PRACTICE_CATEGORIES.find((c) => c.id === id);
const TIMER_KEY = "planner-practice-timer";

export default function MusicView({
  sessions,
  pieces,
  today,
  weeklyGoalMin,
}: {
  sessions: Session[];
  pieces: Piece[];
  today: string;
  weeklyGoalMin: number;
}) {
  const [tab, setTab] = useState<"seances" | "repertoire">("seances");
  const [sessionForm, setSessionForm] = useState<{ s: Session | null; minutes?: number; piece?: string } | null>(null);
  const [pieceForm, setPieceForm] = useState<Piece | "new" | null>(null);

  const weekStart = startOfWeek(today);
  const weekMin = sessions.filter((s) => s.date >= weekStart).reduce((a, s) => a + s.minutes, 0);
  const totalMin = sessions.reduce((a, s) => a + s.minutes, 0);

  const byDay = useMemo(() => {
    const m: Record<string, number> = {};
    sessions.forEach((s) => (m[s.date] = (m[s.date] ?? 0) + s.minutes));
    return m;
  }, [sessions]);

  const streak = useMemo(() => {
    let d = byDay[today] ? today : addDays(today, -1);
    let n = 0;
    while (byDay[d]) {
      n++;
      d = addDays(d, -1);
    }
    return n;
  }, [byDay, today]);

  const quality30 = useMemo(() => {
    const q = sessions.filter((s) => s.quality && s.date > addDays(today, -30));
    return q.length ? q.reduce((a, s) => a + (s.quality ?? 0), 0) / q.length : null;
  }, [sessions, today]);

  const weekly = Array.from({ length: 12 }, (_, i) => {
    const ws = addDays(weekStart, (i - 11) * 7);
    const we = addDays(ws, 6);
    return {
      label: fmtShort(ws).replace(" ", "\u00a0"),
      value: Math.round(sessions.filter((s) => s.date >= ws && s.date <= we).reduce((a, s) => a + s.minutes, 0) / 6) / 10,
    };
  });

  const cats = useMemo(() => {
    const m = new Map<string, number>();
    sessions.filter((s) => s.date > addDays(today, -30)).forEach((s) => m.set(s.category, (m.get(s.category) ?? 0) + s.minutes));
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    return { total, list: [...m.entries()].sort((a, b) => b[1] - a[1]) };
  }, [sessions, today]);

  return (
    <div>
      <PageHeader title="Saxophone" icon="🎷" subtitle="Travail quotidien, répertoire, objectifs">
        <button className="btn btn-primary" onClick={() => setSessionForm({ s: null })}>
          + Séance de travail
        </button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card">
          <div className="stat-label">Cette semaine</div>
          <div className="stat-value">
            {fmtMinutes(weekMin)} <span className="text-sm font-normal text-zinc-500">/ {fmtMinutes(weeklyGoalMin)}</span>
          </div>
          <div className="mt-2">
            <ProgressBar value={weekMin} max={weeklyGoalMin} />
          </div>
        </div>
        <StatCard label="Série en cours" value={`🔥 ${streak} j`} sub="jours consécutifs" />
        <StatCard label="Total 12 mois" value={`${Math.round(totalMin / 60)} h`} sub={`${sessions.length} séances`} />
        <StatCard label="Qualité moyenne (30 j)" value={quality30 ? `${quality30.toFixed(1)} / 5` : "–"} />
      </div>

      <PracticeTimer onStop={(minutes) => setSessionForm({ s: null, minutes })} />

      <div className="my-4 flex gap-2">
        <button className={`btn btn-sm ${tab === "seances" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("seances")}>
          Séances
        </button>
        <button className={`btn btn-sm ${tab === "repertoire" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("repertoire")}>
          Répertoire ({pieces.length})
        </button>
      </div>

      {tab === "seances" ? (
        <>
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <div className="card">
              <div className="h-section">Heures par semaine</div>
              <BarChart data={weekly} goal={weeklyGoalMin / 60} format={(n) => `${n}h`} />
            </div>
            <div className="card">
              <div className="h-section">Répartition (30 jours)</div>
              <div className="space-y-2">
                {cats.list.map(([id, min]) => (
                  <div key={id}>
                    <div className="mb-0.5 flex justify-between text-xs">
                      <span>{catOf(id)?.label ?? id}</span>
                      <span className="text-zinc-400">{fmtMinutes(min)}</span>
                    </div>
                    <ProgressBar value={min} max={cats.total} color={catOf(id)?.color} height={6} />
                  </div>
                ))}
                {cats.list.length === 0 && <p className="text-sm text-zinc-500">Pas encore de données.</p>}
              </div>
            </div>
          </div>
          <div className="card mb-4">
            <div className="h-section">Régularité (26 semaines)</div>
            <Heatmap values={byDay} endDate={today} weeks={26} max={90} cell={13} />
          </div>

          <div className="h-section">Dernières séances</div>
          <div className="space-y-2">
            {sessions.slice(0, 40).map((s) => (
              <button key={s.id} onClick={() => setSessionForm({ s })} className="card flex w-full items-start gap-3 text-left hover:border-zinc-600">
                <div className="mt-1 h-8 w-1.5 shrink-0 rounded-full" style={{ background: catOf(s.category)?.color }} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {fmtMinutes(s.minutes)} · {catOf(s.category)?.label}
                    {s.piece ? <span className="text-zinc-400"> — {s.piece}</span> : null}
                  </div>
                  <div className="truncate text-xs capitalize text-zinc-500">
                    {fmtDate(s.date, { weekday: "short", day: "numeric", month: "long" })}
                    {s.tempoBpm ? ` · ♩=${s.tempoBpm}` : ""}
                    {s.notes ? ` · ${s.notes}` : ""}
                  </div>
                </div>
                {s.quality ? <div className="text-sm text-amber-300">{"★".repeat(s.quality)}</div> : null}
              </button>
            ))}
            {sessions.length === 0 && <div className="card text-center text-sm text-zinc-500">Aucune séance. Sors le sax 🎷</div>}
          </div>
        </>
      ) : (
        <>
          <div className="mb-3 flex justify-end">
            <button className="btn btn-primary btn-sm" onClick={() => setPieceForm("new")}>
              + Morceau
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[...pieces]
              .sort((a, b) => PIECE_STATUS.findIndex((x) => x.id === a.status) - PIECE_STATUS.findIndex((x) => x.id === b.status))
              .map((p) => {
                const st = PIECE_STATUS.find((x) => x.id === p.status);
                const left = p.deadline ? diffDays(p.deadline, today) : null;
                return (
                  <div key={p.id} className="card">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <button className="min-w-0 text-left" onClick={() => setPieceForm(p)}>
                        <div className="truncate font-medium">{p.title}</div>
                        <div className="truncate text-xs text-zinc-400">{p.composer || "—"}</div>
                      </button>
                      <span className="chip shrink-0" style={{ borderColor: st?.color, color: st?.color }}>
                        {st?.label}
                      </span>
                    </div>
                    {p.targetBpm ? (
                      <div className="mb-2">
                        <div className="mb-1 flex justify-between text-xs text-zinc-400">
                          <span>Tempo</span>
                          <span>
                            ♩={p.currentBpm ?? 0} / {p.targetBpm}
                          </span>
                        </div>
                        <ProgressBar value={p.currentBpm ?? 0} max={p.targetBpm} color={st?.color} height={6} />
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between text-xs">
                      <span className={left !== null && left <= 7 ? "text-red-300" : "text-zinc-500"}>
                        {left === null ? "Pas d'échéance" : left < 0 ? `Échéance passée (${fmtShort(p.deadline!)})` : `J-${left} · ${fmtShort(p.deadline!)}`}
                      </span>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSessionForm({ s: null, piece: p.title })}>
                        ▶ Travailler
                      </button>
                    </div>
                    {p.notes && <p className="mt-2 text-xs italic text-zinc-500">{p.notes}</p>}
                  </div>
                );
              })}
          </div>
          {pieces.length === 0 && <div className="card text-center text-sm text-zinc-500">Ajoute les morceaux que tu travailles (et le tempo cible !).</div>}
        </>
      )}

      {sessionForm && (
        <SessionForm
          key={sessionForm.s?.id ?? "new"}
          session={sessionForm.s}
          initialMinutes={sessionForm.minutes}
          initialPiece={sessionForm.piece}
          today={today}
          pieces={pieces}
          recentPieces={[...new Set(sessions.map((s) => s.piece).filter(Boolean))].slice(0, 20)}
          onClose={() => setSessionForm(null)}
        />
      )}
      {pieceForm && <PieceForm piece={pieceForm === "new" ? null : pieceForm} onClose={() => setPieceForm(null)} />}
    </div>
  );
}

function PracticeTimer({ onStop }: { onStop: (minutes: number) => void }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const v = localStorage.getItem(TIMER_KEY);
    if (v) setStartedAt(Number(v));
    setNow(Date.now());
  }, []);
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="stat-label">Chrono de travail</div>
        <div className="font-mono text-3xl tabular-nums">
          {mm}:{ss}
        </div>
      </div>
      {startedAt ? (
        <div className="flex gap-2">
          <button
            className="btn btn-ghost"
            onClick={() => {
              localStorage.removeItem(TIMER_KEY);
              setStartedAt(null);
            }}
          >
            Annuler
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              const minutes = Math.max(1, Math.round(elapsed / 60));
              localStorage.removeItem(TIMER_KEY);
              setStartedAt(null);
              onStop(minutes);
            }}
          >
            ■ Terminer & enregistrer
          </button>
        </div>
      ) : (
        <button
          className="btn btn-primary"
          onClick={() => {
            const t = Date.now();
            localStorage.setItem(TIMER_KEY, String(t));
            setStartedAt(t);
            setNow(t);
          }}
        >
          ▶ Démarrer
        </button>
      )}
    </div>
  );
}

function SessionForm({
  session,
  initialMinutes,
  initialPiece,
  today,
  pieces,
  recentPieces,
  onClose,
}: {
  session: Session | null;
  initialMinutes?: number;
  initialPiece?: string;
  today: string;
  pieces: Piece[];
  recentPieces: string[];
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [date, setDate] = useState(session?.date ?? today);
  const [minutes, setMinutes] = useState(session ? String(session.minutes) : initialMinutes ? String(initialMinutes) : "30");
  const [category, setCategory] = useState(session?.category ?? (initialPiece ? "repertoire" : "technique"));
  const [piece, setPiece] = useState(session?.piece ?? initialPiece ?? "");
  const [tempo, setTempo] = useState(session?.tempoBpm ? String(session.tempoBpm) : "");
  const [quality, setQuality] = useState<number | null>(session?.quality ?? null);
  const [notes, setNotes] = useState(session?.notes ?? "");

  const titles = [...new Set([...pieces.map((p) => p.title), ...recentPieces])];

  return (
    <Modal open onClose={onClose} title={session ? "Modifier la séance" : "Séance de travail"}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Durée (min)</label>
            <input className="input" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[15, 30, 45, 60, 90, 120].map((m) => (
            <button key={m} className="chip hover:!border-amber-400" onClick={() => setMinutes(String(m))}>
              {m} min
            </button>
          ))}
        </div>
        <div>
          <label className="label">Type de travail</label>
          <div className="flex flex-wrap gap-1.5">
            {PRACTICE_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`chip ${category === c.id ? "!border-amber-400 !text-amber-300" : ""}`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="label">Morceau / exercice</label>
            <input className="input" list="piece-titles" value={piece} onChange={(e) => setPiece(e.target.value)} placeholder="Ex : Cadenza Ibert" />
            <datalist id="piece-titles">
              {titles.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label">Tempo (♩=)</label>
            <input className="input" inputMode="numeric" value={tempo} onChange={(e) => setTempo(e.target.value)} placeholder="bpm" />
          </div>
        </div>
        <div>
          <label className="label">Qualité de la séance</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((q) => (
              <button
                key={q}
                onClick={() => setQuality(quality === q ? null : q)}
                className={`h-9 flex-1 rounded-xl text-lg ${quality !== null && q <= quality ? "bg-amber-400/20 text-amber-300" : "bg-zinc-800 text-zinc-500"}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Notes (ce qui marche, ce qui bloque, prochain objectif)</label>
          <textarea className="input min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-between">
          {session ? (
            <button
              className="btn btn-danger"
              disabled={pending}
              onClick={() => {
                if (confirm("Supprimer cette séance ?"))
                  start(async () => {
                    await deletePractice(session.id);
                    onClose();
                  });
              }}
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
                const res = await savePractice({
                  id: session?.id,
                  date,
                  minutes: toNum(minutes),
                  category,
                  piece,
                  tempoBpm: toNum(tempo) || null,
                  quality,
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

function PieceForm({ piece, onClose }: { piece: Piece | null; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [title, setTitle] = useState(piece?.title ?? "");
  const [composer, setComposer] = useState(piece?.composer ?? "");
  const [status, setStatus] = useState(piece?.status ?? "en_travail");
  const [cur, setCur] = useState(piece?.currentBpm ? String(piece.currentBpm) : "");
  const [target, setTarget] = useState(piece?.targetBpm ? String(piece.targetBpm) : "");
  const [deadline, setDeadline] = useState(piece?.deadline ?? "");
  const [notes, setNotes] = useState(piece?.notes ?? "");
  return (
    <Modal open onClose={onClose} title={piece ? "Modifier le morceau" : "Nouveau morceau"}>
      <div className="space-y-4">
        <div>
          <label className="label">Titre</label>
          <input className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">Compositeur</label>
          <input className="input" value={composer} onChange={(e) => setComposer(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PIECE_STATUS.map((s) => (
            <button key={s.id} className={`btn btn-sm ${status === s.id ? "btn-primary" : "btn-ghost"}`} onClick={() => setStatus(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Tempo actuel</label>
            <input className="input" inputMode="numeric" value={cur} onChange={(e) => setCur(e.target.value)} />
          </div>
          <div>
            <label className="label">Tempo cible</label>
            <input className="input" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
          <div>
            <label className="label">Échéance</label>
            <input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input min-h-16" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-between">
          {piece ? (
            <button
              className="btn btn-danger"
              disabled={pending}
              onClick={() => {
                if (confirm("Supprimer ce morceau ?"))
                  start(async () => {
                    await deletePiece(piece.id);
                    onClose();
                  });
              }}
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
                const res = await savePiece({
                  id: piece?.id,
                  title,
                  composer,
                  status,
                  currentBpm: toNum(cur) || null,
                  targetBpm: toNum(target) || null,
                  deadline: deadline || null,
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
