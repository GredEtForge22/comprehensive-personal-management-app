"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { Heatmap, PageHeader, ProgressBar } from "@/components/charts";
import { addDays, DAY_SHORT, fmtShort, startOfWeek, weekDates } from "@/lib/dates";
import { PALETTE } from "@/lib/schedule";
import { deleteHabit, saveHabit, setHabitDone } from "@/app/actions/habits";

type Habit = { id: number; name: string; emoji: string; color: string; weeklyTarget: number };

const SUGGESTIONS = [
  { name: "Boire 2 L d'eau", emoji: "💧", weeklyTarget: 7 },
  { name: "Jouer du saxophone", emoji: "🎷", weeklyTarget: 6 },
  { name: "Dormir 8 h", emoji: "😴", weeklyTarget: 7 },
  { name: "Lire 20 min", emoji: "📚", weeklyTarget: 5 },
  { name: "Étirements / mobilité", emoji: "🧘", weeklyTarget: 5 },
  { name: "Pas d'écran avant de dormir", emoji: "📵", weeklyTarget: 6 },
  { name: "Écouter un disque en entier", emoji: "🎧", weeklyTarget: 3 },
  { name: "Repasser mes cours", emoji: "🧠", weeklyTarget: 5 },
];

const EMOJIS = ["✅", "💧", "🎷", "🎼", "😴", "📚", "🧘", "🏋️", "🏃", "🥗", "🧠", "🎧", "📵", "☀️", "🦷", "✍️"];

function streakOf(h: Habit, logs: Set<string>, today: string): { n: number; unit: string } {
  const has = (d: string) => logs.has(`${h.id}|${d}`);
  if (h.weeklyTarget >= 7) {
    let d = has(today) ? today : addDays(today, -1);
    let n = 0;
    while (has(d)) {
      n++;
      d = addDays(d, -1);
    }
    return { n, unit: "j" };
  }
  // objectif hebdo < 7 : série en semaines réussies
  const countWeek = (monday: string) => weekDates(monday).filter(has).length;
  let monday = startOfWeek(today);
  if (countWeek(monday) < h.weeklyTarget) monday = addDays(monday, -7);
  let n = 0;
  while (countWeek(monday) >= h.weeklyTarget && n < 100) {
    n++;
    monday = addDays(monday, -7);
  }
  return { n, unit: "sem" };
}

export default function HabitsView({
  habits,
  logs: initialLogs,
  today,
}: {
  habits: Habit[];
  logs: string[];
  today: string;
}) {
  const [logs, setLogs] = useState(() => new Set(initialLogs));
  const [offset, setOffset] = useState(0);
  const [form, setForm] = useState<Habit | "new" | null>(null);
  const [, start] = useTransition();

  const monday = addDays(startOfWeek(today), offset * 7);
  const days = weekDates(monday);

  const toggle = (h: Habit, date: string) => {
    const key = `${h.id}|${date}`;
    const done = !logs.has(key);
    setLogs((prev) => {
      const next = new Set(prev);
      if (done) next.add(key);
      else next.delete(key);
      return next;
    });
    start(() => setHabitDone(h.id, date, done));
  };

  const doneToday = habits.filter((h) => logs.has(`${h.id}|${today}`)).length;

  const addSuggestion = (s: (typeof SUGGESTIONS)[number]) =>
    start(async () => {
      await saveHabit({ ...s, color: PALETTE[Math.floor(Math.random() * PALETTE.length)] });
    });

  return (
    <div>
      <PageHeader
        title="Habitudes"
        icon="✅"
        subtitle={habits.length ? `${doneToday}/${habits.length} faites aujourd'hui` : "Crée tes premières habitudes"}
      >
        <button className="btn btn-primary" onClick={() => setForm("new")}>
          + Nouvelle habitude
        </button>
      </PageHeader>

      {habits.length > 0 && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setOffset(offset - 1)} disabled={offset <= -16}>
              ←
            </button>
            <span className="text-sm text-zinc-300">
              {offset === 0 ? "Cette semaine" : `${fmtShort(days[0])} – ${fmtShort(days[6])}`}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setOffset(offset + 1)} disabled={offset >= 0}>
              →
            </button>
          </div>
          <div className="w-32 sm:w-56">
            <ProgressBar value={doneToday} max={habits.length} />
          </div>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {habits.map((h) => (
          <HabitCard
            key={h.id}
            h={h}
            days={days}
            today={today}
            logs={logs}
            onToggle={toggle}
            onEdit={() => setForm(h)}
          />
        ))}
      </div>

      {habits.length === 0 && (
        <div className="card text-center">
          <p className="mb-3 text-sm text-zinc-400">Quelques idées pour démarrer (un clic = ajoutée) :</p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s.name} className="chip hover:!border-amber-400" onClick={() => addSuggestion(s)}>
                {s.emoji} {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {form && <HabitForm habit={form === "new" ? null : form} onClose={() => setForm(null)} />}
    </div>
  );
}

function HabitCard({
  h,
  days,
  today,
  logs,
  onToggle,
  onEdit,
}: {
  h: Habit;
  days: string[];
  today: string;
  logs: Set<string>;
  onToggle: (h: Habit, d: string) => void;
  onEdit: () => void;
}) {
  const streak = useMemo(() => streakOf(h, logs, today), [h, logs, today]);
  const weekCount = days.filter((d) => logs.has(`${h.id}|${d}`)).length;
  const heat = useMemo(() => {
    const v: Record<string, number> = {};
    for (let i = 0; i < 126; i++) {
      const d = addDays(today, -i);
      if (logs.has(`${h.id}|${d}`)) v[d] = 1;
    }
    return v;
  }, [logs, h.id, today]);
  const last30 = useMemo(() => {
    let n = 0;
    for (let i = 0; i < 30; i++) if (logs.has(`${h.id}|${addDays(today, -i)}`)) n++;
    return n;
  }, [logs, h.id, today]);

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button onClick={onEdit} className="flex min-w-0 items-center gap-2 text-left">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg" style={{ background: `${h.color}26` }}>
            {h.emoji}
          </span>
          <div className="min-w-0">
            <div className="truncate font-medium">{h.name}</div>
            <div className="text-xs text-zinc-500">
              {weekCount}/{h.weeklyTarget} cette semaine · {last30}/30 j
            </div>
          </div>
        </button>
        <div className="shrink-0 rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-medium text-amber-300">
          🔥 {streak.n} {streak.unit}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const done = logs.has(`${h.id}|${d}`);
          const future = d > today;
          return (
            <button
              key={d}
              disabled={future}
              onClick={() => onToggle(h, d)}
              className={`flex flex-col items-center rounded-xl border py-1.5 text-[10px] transition ${
                done ? "border-transparent text-zinc-950" : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600"
              } ${future ? "opacity-30" : ""} ${d === today && !done ? "!border-amber-400/70" : ""}`}
              style={done ? { background: h.color } : undefined}
            >
              <span>{DAY_SHORT[i]}</span>
              <span className="text-base leading-5">{done ? "✓" : d.slice(8)}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 overflow-hidden">
        <Heatmap values={heat} endDate={today} weeks={18} max={1} cell={9} rgb={hexToRgb(h.color)} />
      </div>
    </div>
  );
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

function HabitForm({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [f, setF] = useState<Habit>(habit ?? { id: 0, name: "", emoji: "✅", color: "#f59e0b", weeklyTarget: 7 });
  return (
    <Modal open onClose={onClose} title={habit ? "Modifier l'habitude" : "Nouvelle habitude"}>
      <div className="space-y-4">
        <div>
          <label className="label">Nom</label>
          <input className="input" autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex : Gammes avant le dîner" />
        </div>
        <div>
          <label className="label">Emoji</label>
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => setF({ ...f, emoji: e })} className={`h-9 w-9 rounded-xl text-lg ${f.emoji === e ? "bg-amber-400/20 ring-1 ring-amber-400" : "bg-zinc-800"}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Objectif : {f.weeklyTarget} jour(s) par semaine</label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button key={n} type="button" onClick={() => setF({ ...f, weeklyTarget: n })} className={`btn btn-sm flex-1 ${f.weeklyTarget === n ? "btn-primary" : "btn-ghost"}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Couleur</label>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button key={c} type="button" onClick={() => setF({ ...f, color: c })} className={`h-7 w-7 rounded-full border-2 ${f.color === c ? "border-white" : "border-transparent"}`} style={{ background: c }} />
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-between gap-2">
          {habit ? (
            <button
              className="btn btn-danger"
              disabled={pending}
              onClick={() => {
                if (confirm("Supprimer cette habitude et tout son historique ?"))
                  start(async () => {
                    await deleteHabit(habit.id);
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
                const res = await saveHabit({ ...f, id: habit?.id });
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
