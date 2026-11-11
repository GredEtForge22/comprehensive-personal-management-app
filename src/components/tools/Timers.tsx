"use client";

import { useEffect, useRef, useState } from "react";
import { NumInput } from "@/components/ui";
import { alarm, getCtx } from "./audio";

type Mode = "pomodoro" | "rest" | "custom";

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function Timers() {
  const [mode, setMode] = useState<Mode>("pomodoro");
  const [work, setWork] = useState(25);
  const [brk, setBrk] = useState(5);
  const [custom, setCustom] = useState(10);
  const [phase, setPhase] = useState<"work" | "break">("work");
  const [cycles, setCycles] = useState(0);
  const [total, setTotal] = useState(25 * 60);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const endAt = useRef(0);

  const begin = (seconds: number, run = true) => {
    setTotal(seconds);
    setLeft(seconds);
    if (run) {
      getCtx();
      endAt.current = Date.now() + seconds * 1000;
    }
    setRunning(run);
  };

  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => {
      const l = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(l);
      if (l <= 0) {
        alarm();
        if (mode === "pomodoro") {
          if (phase === "work") {
            setCycles((c) => c + 1);
            setPhase("break");
            begin(brk * 60);
          } else {
            setPhase("work");
            begin(work * 60);
          }
        } else {
          setRunning(false);
        }
      }
    }, 250);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode, phase, brk, work]);

  function pause() {
    setRunning(false);
  }
  function resume() {
    endAt.current = Date.now() + left * 1000;
    setRunning(true);
  }

  const pct = total > 0 ? ((total - left) / total) * 100 : 0;

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold">Minuteurs</h3>
      <div className="flex gap-2">
        {(
          [
            ["pomodoro", "🍅 Pomodoro"],
            ["rest", "💪 Repos muscu"],
            ["custom", "⏱ Libre"],
          ] as const
        ).map(([m, l]) => (
          <button
            key={m}
            className={`chip ${mode === m ? "chip-on" : ""}`}
            onClick={() => {
              setMode(m);
              setRunning(false);
              setPhase("work");
              const s = m === "pomodoro" ? work * 60 : m === "rest" ? 90 : custom * 60;
              setTotal(s);
              setLeft(s);
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="relative mx-auto flex h-48 w-48 items-center justify-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#27272a" strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={mode === "pomodoro" && phase === "break" ? "#10b981" : "#fbbf24"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 45}
            strokeDashoffset={2 * Math.PI * 45 * (1 - pct / 100)}
          />
        </svg>
        <div className="text-center">
          <div className="text-4xl font-bold tabular-nums">{fmt(left)}</div>
          {mode === "pomodoro" && (
            <div className="text-xs text-zinc-400">
              {phase === "work" ? "Travail" : "Pause"} · {cycles} cycle(s)
            </div>
          )}
        </div>
      </div>

      {mode === "pomodoro" && (
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="label">Travail (min)</span>
            <NumInput value={work} onChange={(n) => { setWork(n); if (!running && phase === "work") { setTotal(n * 60); setLeft(n * 60); } }} />
          </label>
          <label className="space-y-1">
            <span className="label">Pause (min)</span>
            <NumInput value={brk} onChange={setBrk} />
          </label>
        </div>
      )}
      {mode === "rest" && (
        <div className="flex flex-wrap justify-center gap-2">
          {[45, 60, 90, 120, 180].map((s) => (
            <button key={s} className="chip" onClick={() => begin(s)}>
              {s >= 60 ? `${s / 60 >= 1 && s % 60 === 0 ? s / 60 + " min" : fmt(s)}` : `${s} s`}
            </button>
          ))}
        </div>
      )}
      {mode === "custom" && (
        <label className="block space-y-1">
          <span className="label">Minutes</span>
          <NumInput value={custom} onChange={(n) => { setCustom(n); if (!running) { setTotal(n * 60); setLeft(n * 60); } }} />
        </label>
      )}

      <div className="flex gap-2">
        {running ? (
          <button className="btn flex-1" onClick={pause}>
            ⏸ Pause
          </button>
        ) : (
          <button
            className="btn btn-primary flex-1"
            onClick={() => (left > 0 && left < total ? resume() : begin(mode === "pomodoro" ? (phase === "work" ? work : brk) * 60 : mode === "rest" ? total : custom * 60))}
          >
            ▶ {left > 0 && left < total ? "Reprendre" : "Démarrer"}
          </button>
        )}
        <button
          className="btn"
          onClick={() => {
            setRunning(false);
            setPhase("work");
            setCycles(0);
            const s = mode === "pomodoro" ? work * 60 : mode === "rest" ? 90 : custom * 60;
            setTotal(s);
            setLeft(s);
          }}
        >
          ↺
        </button>
      </div>
    </div>
  );
}
