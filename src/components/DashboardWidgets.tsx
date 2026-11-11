"use client";

import { useState, useTransition } from "react";
import { setHabitDone } from "@/app/actions/habits";
import { saveCheckin } from "@/app/actions/life";

export function TodayHabits({
  habits,
  doneIds,
  today,
}: {
  habits: { id: number; name: string; emoji: string; color: string }[];
  doneIds: number[];
  today: string;
}) {
  const [done, setDone] = useState(new Set(doneIds));
  const [, start] = useTransition();
  return (
    <div className="space-y-1.5">
      {habits.map((h) => {
        const on = done.has(h.id);
        return (
          <button
            key={h.id}
            onClick={() => {
              const next = new Set(done);
              if (on) next.delete(h.id);
              else next.add(h.id);
              setDone(next);
              start(() => setHabitDone(h.id, today, !on));
            }}
            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
              on ? "border-transparent text-zinc-950" : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"
            }`}
            style={on ? { background: h.color } : undefined}
          >
            <span className="text-base">{h.emoji}</span>
            <span className={`flex-1 truncate ${on ? "font-medium" : ""}`}>{h.name}</span>
            <span className="text-xs">{on ? "✓" : ""}</span>
          </button>
        );
      })}
      {habits.length === 0 && <p className="text-sm text-zinc-500">Aucune habitude pour l&apos;instant.</p>}
    </div>
  );
}

const MOODS = ["😞", "😕", "😐", "🙂", "😄"];

export function CheckinCard({
  date,
  initial,
}: {
  date: string;
  initial: { sleepHours: number | null; mood: number | null; energy: number | null; note: string } | null;
}) {
  const [sleep, setSleep] = useState(initial?.sleepHours ? String(initial.sleepHours) : "");
  const [mood, setMood] = useState<number | null>(initial?.mood ?? null);
  const [energy, setEnergy] = useState<number | null>(initial?.energy ?? null);
  const [note, setNote] = useState(initial?.note ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const save = (patch?: Partial<{ mood: number | null; energy: number | null }>) =>
    start(async () => {
      const s = parseFloat(sleep.replace(",", "."));
      await saveCheckin({
        date,
        sleepHours: isFinite(s) ? s : null,
        mood: patch && "mood" in patch ? (patch.mood ?? null) : mood,
        energy: patch && "energy" in patch ? (patch.energy ?? null) : energy,
        note,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });

  return (
    <div className="space-y-3">
      <div>
        <div className="label">Humeur</div>
        <div className="flex gap-1">
          {MOODS.map((m, i) => (
            <button
              key={m}
              className={`h-9 flex-1 rounded-xl text-lg ${mood === i + 1 ? "bg-amber-400/20 ring-1 ring-amber-400" : "bg-zinc-800"}`}
              onClick={() => {
                const v = mood === i + 1 ? null : i + 1;
                setMood(v);
                save({ mood: v });
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="label">Énergie</div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={`h-8 flex-1 rounded-xl text-sm ${energy !== null && n <= energy ? "bg-emerald-400/20 text-emerald-300" : "bg-zinc-800 text-zinc-500"}`}
              onClick={() => {
                const v = energy === n ? null : n;
                setEnergy(v);
                save({ energy: v });
              }}
            >
              ⚡
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Sommeil (h)</label>
          <input className="input" inputMode="decimal" value={sleep} onChange={(e) => setSleep(e.target.value)} onBlur={() => save()} placeholder="7.5" />
        </div>
        <div>
          <label className="label">Note du jour</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => save()} placeholder="…" />
        </div>
      </div>
      <div className="h-4 text-xs text-emerald-400">{pending ? "Enregistrement…" : saved ? "✓ Enregistré" : ""}</div>
    </div>
  );
}
