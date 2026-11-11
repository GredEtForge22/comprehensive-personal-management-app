"use client";

import { useEffect, useRef, useState } from "react";
import { TRANSPOSE, type Instrument, INSTRUMENT_LABEL } from "@/lib/settings";
import { useSettings } from "@/lib/store";
import { NOTE_NAMES, freqOfMidi, getCtx } from "./audio";

export default function Drone() {
  const { settings } = useSettings();
  const [instr, setInstr] = useState<Instrument | null>(null);
  const instrument = instr ?? settings.saxInstrument;
  const [note, setNote] = useState(0); // Do écrit
  const [octave, setOctave] = useState(4);
  const [fifth, setFifth] = useState(false);
  const [vol, setVol] = useState(0.25);
  const [on, setOn] = useState(false);
  const gainRef = useRef<GainNode | null>(null);

  const writtenMidi = (octave + 1) * 12 + note;
  const concert = writtenMidi - TRANSPOSE[instrument];

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = vol;
  }, [vol]);

  useEffect(() => {
    if (!on) return;
    const c = getCtx();
    const gain = c.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(vol, c.currentTime + 0.3);
    gain.connect(c.destination);
    gainRef.current = gain;
    const oscs: OscillatorNode[] = [];
    const add = (midi: number, type: OscillatorType, level: number) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.value = freqOfMidi(midi);
      g.gain.value = level;
      o.connect(g).connect(gain);
      o.start();
      oscs.push(o);
    };
    add(concert, "triangle", 0.7);
    add(concert, "sine", 0.4);
    add(concert + 12, "sine", 0.15);
    if (fifth) add(concert + 7, "triangle", 0.4);
    return () => {
      const t = c.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.15);
      oscs.forEach((o) => o.stop(t + 0.2));
      gainRef.current = null;
    };
    // vol est géré par l'autre effet
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, concert, fifth]);

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold">Bourdon (intonation)</h3>
      <p className="text-xs text-zinc-500">Choisis la note comme sur ta partition : le son joué est transposé pour ton sax.</p>
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
          <span className="label">Octave écrite</span>
          <select className="input" value={octave} onChange={(e) => setOctave(Number(e.target.value))}>
            {[3, 4, 5, 6].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {NOTE_NAMES.map((n, i) => (
          <button key={n} className={`chip justify-center !px-0 ${note === i ? "chip-on" : ""}`} onClick={() => setNote(i)}>
            {n}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-400">Volume</span>
        <input type="range" min={0.02} max={0.6} step={0.01} value={vol} onChange={(e) => setVol(Number(e.target.value))} className="flex-1" />
        <button className={`chip ${fifth ? "chip-on" : ""}`} onClick={() => setFifth(!fifth)}>
          + quinte
        </button>
      </div>
      <button className={`btn w-full ${on ? "btn-danger" : "btn-primary"}`} onClick={() => setOn(!on)}>
        {on ? "⏹ Stop" : `▶ Jouer ${NOTE_NAMES[note]}${octave}`}
      </button>
    </div>
  );
}
