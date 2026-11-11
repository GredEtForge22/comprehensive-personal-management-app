import type { SaxSession, ScaleLog } from "./types";
import type { Rec } from "./store";

export const KEYS = ["Do", "Réb", "Ré", "Mib", "Mi", "Fa", "Fa#", "Sol", "Lab", "La", "Sib", "Si"];

export const SCALE_TYPES = [
  "Majeure",
  "Mineure naturelle",
  "Mineure harmonique",
  "Mineure mélodique",
  "Pentatonique majeure",
  "Pentatonique mineure",
  "Blues",
  "Dorien",
  "Mixolydien",
  "Lydien",
  "Altérée",
  "Diminuée (t-ds)",
  "Tons entiers",
  "Chromatique",
  "Arpège maj7",
  "Arpège m7",
  "Arpège 7",
  "Arpège m7b5",
];

export const FOCUS = [
  "Sons tenus",
  "Gammes",
  "Arpèges",
  "Technique / études",
  "Morceaux",
  "Sonorité",
  "Articulation",
  "Aigus / altissimo",
  "Impro",
  "Déchiffrage",
  "Oreille",
  "Rythme",
  "Groupe / orchestre",
  "Transcription",
];

export const SATISFACTION = ["😫", "😕", "😐", "🙂", "🔥"];

export const PIECE_STATUS: Record<string, { label: string; color: string }> = {
  todo: { label: "À commencer", color: "#71717a" },
  learning: { label: "En apprentissage", color: "#3b82f6" },
  polish: { label: "À peaufiner", color: "#f59e0b" },
  done: { label: "Maîtrisé", color: "#10b981" },
};

export const ROUTINE = [
  { min: 10, label: "Sons tenus & harmoniques", hint: "Souffle, justesse, notes longues en nuance" },
  { min: 10, label: "Gammes & arpèges", hint: "2–3 tonalités du jour, tempo en progression" },
  { min: 15, label: "Technique / études", hint: "Klosé, Lacour, Londeix, Ferling…" },
  { min: 20, label: "Morceau en cours", hint: "Passage par passage, lent puis tempo cible" },
  { min: 5, label: "Oreille / impro", hint: "Chanter puis jouer, un chorus sur une grille" },
];

export type ScaleStat = { last: string; best: number; count: number };
export const scaleId = (key: string, type: string) => `${key}|${type}`;

export function scaleStats(sessions: Rec<SaxSession>[], quick: Rec<ScaleLog>[]): Map<string, ScaleStat> {
  const map = new Map<string, ScaleStat>();
  const push = (s: ScaleLog, date: string) => {
    const id = scaleId(s.key, s.type);
    const cur = map.get(id) ?? { last: "", best: 0, count: 0 };
    map.set(id, {
      last: date > cur.last ? date : cur.last,
      best: Math.max(cur.best, s.tempo || 0),
      count: cur.count + 1,
    });
  };
  sessions.forEach((s) => (s.scales ?? []).forEach((x) => push(x, s.date)));
  quick.forEach((q) => push(q, q.date));
  return map;
}
