"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioContext } from "./audio";

export default function Metronome() {
  const [bpm, setBpm] = useState(80);
  const [beats, setBeats] = useState(4);
  const [sub, setSub] = useState(1);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState(-1);

  const bpmRef = useRef(bpm);
  const beatsRef = useRef(beats);
  const subRef = useRef(sub);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextTime = useRef(0);
  const tick = useRef(0);
  const taps = useRef<number[]>([]);

  useEffect(() => {
    bpmRef.current = bpm;
    beatsRef.current = beats;
    subRef.current = sub;
  }, [bpm, beats, sub]);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRunning(false);
    setCurrent(-1);
  }, []);

  const start = useCallback(() => {
    const ctx = getAudioContext();
    tick.current = 0;
    nextTime.current = ctx.currentTime + 0.08;
    const schedule = () => {
      while (nextTime.current < ctx.currentTime + 0.12) {
        const s = subRef.current;
        const t = tick.current;
        const beat = Math.floor(t / s) % beatsRef.current;
        const isMain = t % s === 0;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const accent = isMain && beat === 0;
        o.frequency.value = accent ? 1600 : isMain ? 1100 : 800;
        const vol = accent ? 0.7 : isMain ? 0.5 : 0.22;
        const when = nextTime.current;
        g.gain.setValueAtTime(0.0001, when);
        g.gain.exponentialRampToValueAtTime(vol, when + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
        o.connect(g).connect(ctx.destination);
        o.start(when);
        o.stop(when + 0.06);
        if (isMain) setTimeout(() => setCurrent(beat), Math.max(0, (when - ctx.currentTime) * 1000));
        nextTime.current += 60 / bpmRef.current / s;
        tick.current = t + 1;
      }
    };
    schedule();
    timer.current = setInterval(schedule, 25);
    setRunning(true);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const tap = () => {
    const now = performance.now();
    const arr = taps.current;
    if (arr.length && now - arr[arr.length - 1] > 2000) arr.length = 0;
    arr.push(now);
    if (arr.length > 6) arr.shift();
    if (arr.length >= 2) {
      const avg = (arr[arr.length - 1] - arr[0]) / (arr.length - 1);
      setBpm(Math.min(260, Math.max(30, Math.round(60000 / avg))));
    }
  };

  const tempoName =
    bpm < 60 ? "Largo" : bpm < 76 ? "Adagio" : bpm < 108 ? "Andante" : bpm < 120 ? "Moderato" : bpm < 156 ? "Allegro" : bpm < 176 ? "Vivace" : "Presto";

  return (
    <div className="card">
      <div className="h-section">🥁 Métronome</div>
      <div className="mb-3 flex items-end justify-center gap-3">
        <button className="btn btn-ghost" onClick={() => setBpm(Math.max(30, bpm - 1))}>
          −
        </button>
        <div className="text-center">
          <div className="text-6xl font-semibold tabular-nums text-amber-300">{bpm}</div>
          <div className="text-xs text-zinc-400">BPM · {tempoName}</div>
        </div>
        <button className="btn btn-ghost" onClick={() => setBpm(Math.min(260, bpm + 1))}>
          +
        </button>
      </div>
      <input type="range" min={30} max={260} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="mb-3 w-full accent-amber-400" />
      <div className="mb-3 flex justify-center gap-2">
        {Array.from({ length: beats }).map((_, i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full transition ${current === i ? (i === 0 ? "scale-125 bg-amber-400" : "scale-125 bg-white") : "bg-zinc-700"}`}
          />
        ))}
      </div>
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <label className="label">Temps par mesure</label>
          <select className="input" value={beats} onChange={(e) => setBeats(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Subdivision</label>
          <select className="input" value={sub} onChange={(e) => setSub(Number(e.target.value))}>
            <option value={1}>Noires</option>
            <option value={2}>Croches (×2)</option>
            <option value={3}>Triolets (×3)</option>
            <option value={4}>Doubles (×4)</option>
          </select>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {[60, 72, 84, 96, 108, 120, 138, 160].map((b) => (
          <button key={b} className="chip hover:!border-amber-400" onClick={() => setBpm(b)}>
            {b}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button className="btn btn-primary flex-1" onClick={running ? stop : start}>
          {running ? "■ Stop" : "▶ Démarrer"}
        </button>
        <button className="btn btn-ghost" onClick={tap}>
          Tap tempo
        </button>
      </div>
    </div>
  );
}
