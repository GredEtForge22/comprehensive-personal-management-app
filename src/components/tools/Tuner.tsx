"use client";

import { useEffect, useRef, useState } from "react";
import { INSTRUMENT_LABEL, TRANSPOSE, type Instrument } from "@/lib/settings";
import { useSettings } from "@/lib/store";
import { getCtx, midiOfFreq, noteLabel } from "./audio";

function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.012) return -1;

  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }
  }
  const b = buf.slice(r1, r2);
  const n = b.length;
  if (n < 64) return -1;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) c[i] += b[j] * b[j + i];

  let d = 0;
  while (d < n - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < n; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  if (maxpos <= 0 || maxpos >= n - 1) return -1;
  let T0 = maxpos;
  const x1 = c[T0 - 1];
  const x2 = c[T0];
  const x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const bb = (x3 - x1) / 2;
  if (a) T0 = T0 - bb / (2 * a);
  return sampleRate / T0;
}

export default function Tuner() {
  const { settings } = useSettings();
  const [instr, setInstr] = useState<Instrument | null>(null);
  const instrument = instr ?? settings.saxInstrument;
  const [a4, setA4] = useState(440);
  const [on, setOn] = useState(false);
  const [error, setError] = useState("");
  const [reading, setReading] = useState<{ freq: number; midi: number; cents: number } | null>(null);
  const params = useRef({ a4, instrument });
  const smooth = useRef<number[]>([]);

  useEffect(() => {
    params.current = { a4, instrument };
  }, [a4, instrument]);

  useEffect(() => {
    if (!on) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const ctx = getCtx();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 4096;
        src.connect(analyser);
        const buf = new Float32Array(analyser.fftSize);
        timer = setInterval(() => {
          analyser.getFloatTimeDomainData(buf);
          const f = autoCorrelate(buf, ctx.sampleRate);
          if (f > 50 && f < 2000) {
            const m = midiOfFreq(f, params.current.a4);
            const arr = smooth.current;
            arr.push(m);
            if (arr.length > 4) arr.shift();
            const med = [...arr].sort((x, y) => x - y)[Math.floor(arr.length / 2)];
            const nearest = Math.round(med);
            setReading({ freq: f, midi: nearest, cents: (med - nearest) * 100 });
          } else {
            smooth.current = [];
            setReading(null);
          }
        }, 100);
      } catch {
        setError("Micro inaccessible. Autorise le micro dans ton navigateur (HTTPS requis).");
        setOn(false);
      }
    })();
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
      smooth.current = [];
      setReading(null);
    };
  }, [on]);

  const written = reading ? reading.midi + TRANSPOSE[instrument] : null;
  const cents = reading?.cents ?? 0;
  const inTune = reading && Math.abs(cents) <= 7;

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold">Accordeur (note écrite pour sax)</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="label">Instrument</span>
          <select className="input" value={instrument} onChange={(e) => setInstr(e.target.value as Instrument)}>
            {(Object.keys(INSTRUMENT_LABEL) as Instrument[]).map((k) => (
              <option key={k} value={k}>
                {INSTRUMENT_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="label">La = {a4} Hz</span>
          <input type="range" min={430} max={450} value={a4} onChange={(e) => setA4(Number(e.target.value))} className="w-full" />
        </label>
      </div>
      <div className="rounded-2xl bg-zinc-950 p-5 text-center">
        {reading && written !== null ? (
          <>
            <div className={`text-6xl font-bold ${inTune ? "text-emerald-400" : "text-zinc-100"}`}>{noteLabel(written)}</div>
            <div className="mt-1 text-sm text-zinc-400">
              écrit · son réel {noteLabel(reading.midi)} · {reading.freq.toFixed(1)} Hz
            </div>
            <div className="relative mx-auto mt-5 h-3 max-w-sm rounded-full bg-zinc-800">
              <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-zinc-500" />
              <div className="absolute inset-y-0 left-1/2 w-6 -translate-x-1/2 rounded-full bg-emerald-500/20" />
              <div
                className={`absolute top-1/2 h-6 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all ${inTune ? "bg-emerald-400" : "bg-amber-400"}`}
                style={{ left: `${50 + Math.max(-50, Math.min(50, cents))}%` }}
              />
            </div>
            <div className="mt-2 text-sm">
              {inTune ? "✅ Juste" : cents > 0 ? `Trop haut (+${Math.round(cents)} cents)` : `Trop bas (${Math.round(cents)} cents)`}
            </div>
          </>
        ) : (
          <div className="py-6 text-zinc-500">{on ? "🎷 Joue une note…" : "Micro éteint"}</div>
        )}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button className={`btn w-full ${on ? "btn-danger" : "btn-primary"}`} onClick={() => { setError(""); setOn(!on); }}>
        {on ? "⏹ Arrêter" : "🎤 Activer le micro"}
      </button>
    </div>
  );
}
