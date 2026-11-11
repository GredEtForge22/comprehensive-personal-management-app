"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { INSTRUMENTS, NOTE_NAMES, getAudioContext, midiToFreq } from "./audio";

export default function Drone() {
  const [instrument, setInstrument] = useState("alto");
  const [pc, setPc] = useState(0); // classe de hauteur écrite
  const [octave, setOctave] = useState(4);
  const [playing, setPlaying] = useState(false);
  const nodes = useRef<{ osc: OscillatorNode[]; gain: GainNode } | null>(null);

  const transpose = INSTRUMENTS.find((i) => i.id === instrument)?.transpose ?? 0;
  const writtenMidi = (octave + 1) * 12 + pc;
  const freq = midiToFreq(writtenMidi - transpose);

  const stop = useCallback(() => {
    const n = nodes.current;
    if (!n) return;
    const ctx = getAudioContext();
    n.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
    n.osc.forEach((o) => o.stop(ctx.currentTime + 0.3));
    nodes.current = null;
    setPlaying(false);
  }, []);

  const play = useCallback(
    (f: number) => {
      const ctx = getAudioContext();
      if (nodes.current) {
        nodes.current.osc.forEach((o) => o.frequency.setTargetAtTime(f, ctx.currentTime, 0.02));
        return;
      }
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      gain.gain.setTargetAtTime(0.25, ctx.currentTime, 0.05);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1800;
      filter.connect(gain).connect(ctx.destination);
      const osc = [ctx.createOscillator(), ctx.createOscillator()];
      osc[0].type = "triangle";
      osc[1].type = "sine";
      osc[1].detune.value = 3;
      osc.forEach((o) => {
        o.frequency.value = f;
        o.connect(filter);
        o.start();
      });
      nodes.current = { osc, gain };
      setPlaying(true);
    },
    [],
  );

  useEffect(() => {
    if (playing) play(freq);
  }, [freq, playing, play]);

  useEffect(() => () => stop(), [stop]);

  return (
    <div className="card">
      <div className="h-section">🔊 Bourdon / note de référence</div>
      <div className="mb-3">
        <label className="label">Instrument</label>
        <select className="input" value={instrument} onChange={(e) => setInstrument(e.target.value)}>
          {INSTRUMENTS.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
      </div>
      <label className="label">Note écrite</label>
      <div className="mb-3 grid grid-cols-6 gap-1.5">
        {NOTE_NAMES.map((n, i) => (
          <button key={n} className={`btn btn-sm ${pc === i ? "btn-primary" : "btn-ghost"}`} onClick={() => setPc(i)}>
            {n}
          </button>
        ))}
      </div>
      <div className="mb-3 flex items-center gap-2">
        <span className="label !mb-0">Octave</span>
        {[3, 4, 5, 6].map((o) => (
          <button key={o} className={`btn btn-sm ${octave === o ? "btn-primary" : "btn-ghost"}`} onClick={() => setOctave(o)}>
            {o}
          </button>
        ))}
        <span className="ml-auto text-xs text-zinc-400">{Math.round(freq * 10) / 10} Hz (son réel)</span>
      </div>
      <button className="btn btn-primary w-full" onClick={() => (playing ? stop() : play(freq))}>
        {playing ? "■ Arrêter" : "▶ Jouer la note"}
      </button>
      <p className="mt-2 text-xs text-zinc-500">Idéal pour travailler l&apos;intonation et les sons tenus.</p>
    </div>
  );
}
