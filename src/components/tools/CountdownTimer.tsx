"use client";

import { useEffect, useRef, useState } from "react";
import { beep } from "./audio";

const PRESETS = [
  { label: "Pomodoro 25 min", sec: 25 * 60 },
  { label: "Pause 5 min", sec: 5 * 60 },
  { label: "Repos muscu 90 s", sec: 90 },
  { label: "Repos 2 min", sec: 120 },
  { label: "Étude 45 min", sec: 45 * 60 },
];

export default function CountdownTimer() {
  const [total, setTotal] = useState(25 * 60);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const endAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining <= 0) {
        setRunning(false);
        beep(880, 0.2);
        setTimeout(() => beep(880, 0.2), 300);
        setTimeout(() => beep(1175, 0.5), 600);
      }
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  const choose = (sec: number) => {
    setRunning(false);
    setTotal(sec);
    setLeft(sec);
  };

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="card">
      <div className="h-section">⏱️ Minuteur</div>
      <div className="mb-3 text-center">
        <div className="font-mono text-6xl tabular-nums">
          {mm}:{ss}
        </div>
        <div className="mx-auto mt-3 h-1.5 max-w-xs overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full bg-amber-400 transition-all" style={{ width: `${total ? (left / total) * 100 : 0}%` }} />
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button key={p.label} className="chip hover:!border-amber-400" onClick={() => choose(p.sec)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          className="btn btn-primary flex-1"
          onClick={() => {
            if (running) setRunning(false);
            else {
              if (left <= 0) setLeft(total);
              endAt.current = Date.now() + (left > 0 ? left : total) * 1000;
              setRunning(true);
            }
          }}
        >
          {running ? "❚❚ Pause" : "▶ Démarrer"}
        </button>
        <button className="btn btn-ghost" onClick={() => choose(total)}>
          Reset
        </button>
      </div>
    </div>
  );
}
