"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { beep, getCtx } from "./audio";

const TEMPO_NAMES: [number, string][] = [
  [60, "Largo"],
  [76, "Adagio"],
  [108, "Andante"],
  [120, "Moderato"],
  [156, "Allegro"],
  [176, "Vivace"],
  [999, "Presto"],
];

export default function Metronome() {
  const [bpm, setBpm] = useState(100);
  const [beats, setBeats] = useState(4);
  const [sub, setSub] = useState(1);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState(-1);
  const taps = useRef<number[]>([]);
  const state = useRef({ bpm, beats, sub });
  const next = useRef({ time: 0, tick: 0 });
  const queue = useRef<{ time: number; beat: number }[]>([]);

  useEffect(() => {
    state.current = { bpm, beats, sub };
  }, [bpm, beats, sub]);

  const schedule = useCallback(() => {
    const c = getCtx();
    const s = state.current;
    while (next.current.time < c.currentTime + 0.12) {
      const perBeat = s.sub;
      const tick = next.current.tick;
      const beat = Math.floor(tick / perBeat) % s.beats;
      const subIdx = tick % perBeat;
      if (subIdx === 0) {
        beep(beat === 0 ? 1500 : 1000, 0.05, beat === 0 ? 0.6 : 0.4, next.current.time);
        queue.current.push({ time: next.current.time, beat });
      } else {
        beep(700, 0.03, 0.18, next.current.time);
      }
      next.current.time += 60 / s.bpm / perBeat;
      next.current.tick = tick + 1;
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    const c = getCtx();
    next.current = { time: c.currentTime + 0.05, tick: 0 };
    queue.current = [];
    const timer = setInterval(schedule, 25);
    let raf = 0;
    const draw = () => {
      const now = getCtx().currentTime;
      while (queue.current.length && queue.current[0].time <= now) {
        setCurrent(queue.current.shift()!.beat);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      clearInterval(timer);
      cancelAnimationFrame(raf);
      setCurrent(-1);
    };
  }, [running, schedule]);

  function tap() {
    const now = performance.now();
    const t = taps.current;
    if (t.length && now - t[t.length - 1] > 2000) t.length = 0;
    t.push(now);
    if (t.length > 6) t.shift();
    if (t.length >= 2) {
      const intervals = t.slice(1).map((x, i) => x - t[i]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      setBpm(Math.min(240, Math.max(30, Math.round(60000 / avg))));
    }
  }

  const name = TEMPO_NAMES.find(([max]) => bpm < max)?.[1];

  return (
    <div className="card space-y-5">
      <h3 className="font-semibold">Métronome</h3>
      <div className="text-center">
        <div className="text-6xl font-bold tabular-nums">{bpm}</div>
        <div className="text-sm text-zinc-400">♩ = {bpm} · {name}</div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn" onClick={() => setBpm(Math.max(30, bpm - 1))}>
          −
        </button>
        <input type="range" min={30} max={240} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="flex-1" />
        <button className="btn" onClick={() => setBpm(Math.min(240, bpm + 1))}>
          +
        </button>
      </div>
      <div className="flex justify-center gap-2.5">
        {Array.from({ length: beats }, (_, i) => (
          <div
            key={i}
            className={`h-5 w-5 rounded-full transition ${current === i ? (i === 0 ? "scale-125 bg-amber-300" : "scale-125 bg-white") : "bg-zinc-700"}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="space-y-1">
          <span className="label">Temps par mesure</span>
          <select className="input" value={beats} onChange={(e) => setBeats(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 9, 12].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="label">Subdivision</span>
          <select className="input" value={sub} onChange={(e) => setSub(Number(e.target.value))}>
            <option value={1}>Noires</option>
            <option value={2}>Croches</option>
            <option value={3}>Triolets</option>
            <option value={4}>Doubles croches</option>
          </select>
        </label>
      </div>
      <div className="flex gap-2">
        <button className={`btn flex-1 ${running ? "btn-danger" : "btn-primary"}`} onClick={() => setRunning(!running)}>
          {running ? "⏹ Stop" : "▶ Démarrer"}
        </button>
        <button className="btn" onClick={tap}>
          👆 Tap
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[60, 80, 100, 120, 140, 160, 180, 200].map((b) => (
          <button key={b} className="chip" onClick={() => setBpm(b)}>
            {b}
          </button>
        ))}
      </div>
    </div>
  );
}
