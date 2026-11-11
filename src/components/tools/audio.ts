let ctx: AudioContext | null = null;

export function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function beep(freq = 880, dur = 0.15, vol = 0.3, at?: number) {
  const c = getCtx();
  const t = at ?? c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function alarm() {
  const c = getCtx();
  for (let i = 0; i < 3; i++) beep(i === 2 ? 1175 : 880, 0.25, 0.4, c.currentTime + i * 0.35);
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
}

export const NOTE_NAMES = ["Do", "Do#", "Ré", "Ré#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
export const freqOfMidi = (m: number, a4 = 440) => a4 * Math.pow(2, (m - 69) / 12);
export const midiOfFreq = (f: number, a4 = 440) => 69 + 12 * Math.log2(f / a4);
export const noteLabel = (midi: number) => `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
