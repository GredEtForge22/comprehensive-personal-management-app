"use client";

export const INSTRUMENTS = [
  { id: "alto", label: "Sax alto (Mi♭)", transpose: 9 },
  { id: "tenor", label: "Sax ténor (Si♭)", transpose: 14 },
  { id: "soprano", label: "Sax soprano (Si♭)", transpose: 2 },
  { id: "bari", label: "Sax baryton (Mi♭)", transpose: 21 },
  { id: "concert", label: "Do (son réel)", transpose: 0 },
];

export const NOTE_NAMES = ["Do", "Do♯", "Ré", "Mi♭", "Mi", "Fa", "Fa♯", "Sol", "La♭", "La", "Si♭", "Si"];

export function midiName(midi: number): string {
  const n = ((midi % 12) + 12) % 12;
  return `${NOTE_NAMES[n]}${Math.floor(midi / 12) - 1}`;
}

export function midiToFreq(midi: number, a4 = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

let ctx: AudioContext | null = null;
export function getAudioContext(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function beep(freq = 880, duration = 0.25, volume = 0.3) {
  const c = getAudioContext();
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.value = freq;
  g.gain.setValueAtTime(volume, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + duration);
}

/** Détection de hauteur par autocorrélation. Retourne la fréquence en Hz ou -1. */
export function detectPitch(buf: Float32Array, sampleRate: number): number {
  const n = buf.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < 0.008) return -1;

  const maxLag = Math.floor(n / 2);
  const c = new Float32Array(maxLag);
  for (let lag = 0; lag < maxLag; lag++) {
    let sum = 0;
    for (let j = 0; j < n - lag; j++) sum += buf[j] * buf[j + lag];
    c[lag] = sum;
  }
  let d = 0;
  while (d < maxLag - 1 && c[d] > c[d + 1]) d++;
  let maxVal = -Infinity;
  let maxPos = -1;
  for (let i = d; i < maxLag; i++) {
    if (c[i] > maxVal) {
      maxVal = c[i];
      maxPos = i;
    }
  }
  if (maxPos <= 0 || maxPos >= maxLag - 1) return -1;
  // clarté du pic
  if (maxVal / c[0] < 0.5) return -1;
  const x1 = c[maxPos - 1];
  const x2 = c[maxPos];
  const x3 = c[maxPos + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  const t0 = a ? maxPos - b / (2 * a) : maxPos;
  return sampleRate / t0;
}
