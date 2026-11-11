"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { INSTRUMENTS, detectPitch, midiName } from "./audio";

export default function Tuner() {
  const [on, setOn] = useState(false);
  const [error, setError] = useState("");
  const [instrument, setInstrument] = useState("alto");
  const [a4, setA4] = useState(440);
  const [reading, setReading] = useState<{ note: string; cents: number; hz: number; concert: string } | null>(null);

  const stream = useRef<MediaStream | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const raf = useRef<number | null>(null);
  const settings = useRef({ transpose: 9, a4: 440 });
  const history = useRef<number[]>([]);
  const lastSeen = useRef(0);

  useEffect(() => {
    settings.current = { transpose: INSTRUMENTS.find((i) => i.id === instrument)?.transpose ?? 0, a4 };
  }, [instrument, a4]);

  const stop = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void audioCtx.current?.close();
    audioCtx.current = null;
    setOn(false);
    setReading(null);
  }, []);

  const start = useCallback(async () => {
    setError("");
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      stream.current = media;
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      audioCtx.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      ctx.createMediaStreamSource(media).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      let lastRun = 0;
      const loop = (t: number) => {
        raf.current = requestAnimationFrame(loop);
        if (t - lastRun < 70) return;
        lastRun = t;
        analyser.getFloatTimeDomainData(buf);
        const f = detectPitch(buf, ctx.sampleRate);
        if (f > 60 && f < 2000) {
          const h = history.current;
          h.push(f);
          if (h.length > 5) h.shift();
          const sorted = [...h].sort((a, b) => a - b);
          const med = sorted[Math.floor(sorted.length / 2)];
          const { transpose, a4: ref } = settings.current;
          const midiF = 69 + 12 * Math.log2(med / ref);
          const nearest = Math.round(midiF);
          lastSeen.current = t;
          setReading({
            note: midiName(nearest + transpose),
            concert: midiName(nearest),
            cents: Math.round((midiF - nearest) * 100),
            hz: Math.round(med * 10) / 10,
          });
        } else if (t - lastSeen.current > 700) {
          history.current = [];
          setReading(null);
        }
      };
      raf.current = requestAnimationFrame(loop);
      setOn(true);
    } catch {
      setError("Micro inaccessible : autorise l'accès au micro dans ton navigateur (HTTPS requis).");
      stop();
    }
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  const cents = reading?.cents ?? 0;
  const inTune = reading !== null && Math.abs(cents) <= 5;

  return (
    <div className="card">
      <div className="h-section">🎙️ Accordeur</div>
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <label className="label">Instrument (note affichée = note écrite)</label>
          <select className="input" value={instrument} onChange={(e) => setInstrument(e.target.value)}>
            {INSTRUMENTS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">La = {a4} Hz</label>
          <input type="range" min={432} max={446} value={a4} onChange={(e) => setA4(Number(e.target.value))} className="mt-2 w-full accent-amber-400" />
        </div>
      </div>

      <div className="mb-3 rounded-2xl bg-zinc-950 p-4 text-center">
        <div className={`text-6xl font-semibold ${inTune ? "text-emerald-400" : "text-zinc-100"}`}>{reading?.note ?? "—"}</div>
        <div className="mt-1 h-5 text-xs text-zinc-400">{reading ? `${reading.hz} Hz · son réel ${reading.concert}` : on ? "Joue une note…" : "Micro éteint"}</div>
        <div className="relative mx-auto mt-3 h-3 max-w-xs rounded-full bg-zinc-800">
          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-zinc-500" />
          <div className="absolute inset-y-0 left-[45%] right-[45%] rounded-full bg-emerald-500/30" />
          {reading && (
            <div
              className={`absolute top-1/2 h-5 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all ${inTune ? "bg-emerald-400" : Math.abs(cents) > 25 ? "bg-red-400" : "bg-amber-400"}`}
              style={{ left: `${50 + Math.max(-50, Math.min(50, cents)) }%` }}
            />
          )}
        </div>
        <div className="mt-1 flex max-w-xs justify-between text-[10px] text-zinc-500 mx-auto">
          <span>♭ bas</span>
          <span>{reading ? `${cents > 0 ? "+" : ""}${cents} cents` : ""}</span>
          <span>haut ♯</span>
        </div>
      </div>
      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
      <button className="btn btn-primary w-full" onClick={on ? stop : start}>
        {on ? "■ Couper le micro" : "🎙️ Activer l'accordeur"}
      </button>
    </div>
  );
}
