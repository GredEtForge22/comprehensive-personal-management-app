import type { ExerciseEntry, Run, Workout } from "./types";
import type { Rec } from "./store";

export type ExerciseDef = {
  name: string;
  group: string;
  /** part du poids du corps réellement soulevée */
  bw: number;
  /** série en secondes (gainage, L-sit...) */
  time?: boolean;
  /** objectif de répétitions sur une série (barre de progression) */
  goal?: number;
  main?: boolean;
};

export const EXERCISES: ExerciseDef[] = [
  { name: "Tractions", group: "Tirage", bw: 1, goal: 20, main: true },
  { name: "Tractions australiennes", group: "Tirage", bw: 0.6, goal: 30, main: true },
  { name: "Pompes", group: "Poussée", bw: 0.64, goal: 50, main: true },
  { name: "Dips", group: "Poussée", bw: 0.95, goal: 30, main: true },
  { name: "Tractions supination", group: "Tirage", bw: 1, goal: 20 },
  { name: "Tractions larges", group: "Tirage", bw: 1, goal: 15 },
  { name: "Muscle-up", group: "Skills", bw: 1, goal: 5 },
  { name: "Pompes diamant", group: "Poussée", bw: 0.64, goal: 30 },
  { name: "Pompes pike", group: "Poussée", bw: 0.6, goal: 20 },
  { name: "Pompes archer", group: "Poussée", bw: 0.7, goal: 10 },
  { name: "Dips banc", group: "Poussée", bw: 0.6, goal: 30 },
  { name: "Squats", group: "Jambes", bw: 0.7, goal: 50 },
  { name: "Fentes", group: "Jambes", bw: 0.7, goal: 40 },
  { name: "Pistol squat", group: "Jambes", bw: 0.9, goal: 10 },
  { name: "Relevés de jambes", group: "Abdos", bw: 0.4, goal: 20 },
  { name: "Gainage", group: "Abdos", bw: 0, time: true, goal: 120 },
  { name: "L-sit", group: "Skills", bw: 0, time: true, goal: 30 },
  { name: "Handstand", group: "Skills", bw: 0, time: true, goal: 60 },
  { name: "Front lever (tuck)", group: "Skills", bw: 0, time: true, goal: 20 },
  { name: "Planche (tuck)", group: "Skills", bw: 0, time: true, goal: 15 },
];

export const WORKOUT_TEMPLATES: { name: string; exercises: string[] }[] = [
  { name: "Full body", exercises: ["Tractions", "Dips", "Tractions australiennes", "Pompes"] },
  { name: "Pull", exercises: ["Tractions", "Tractions australiennes", "Tractions supination", "Relevés de jambes"] },
  { name: "Push", exercises: ["Dips", "Pompes", "Pompes pike", "Pompes diamant"] },
  { name: "Jambes + abdos", exercises: ["Squats", "Fentes", "Pistol squat", "Gainage"] },
  { name: "Skills", exercises: ["Muscle-up", "Handstand", "L-sit", "Front lever (tuck)"] },
];

export const RUN_TYPES = ["Footing", "Fractionné", "Sortie longue", "Tempo", "Récupération", "Course"];

export const defOf = (name: string): ExerciseDef =>
  EXERCISES.find((e) => e.name === name) ?? { name, group: "Autre", bw: 0.8 };

/** charge effective (kg) d'une répétition */
export const effectiveLoad = (name: string, added: number, bodyweight: number) =>
  defOf(name).bw * bodyweight + added;

/** 1RM estimé (Epley) en charge totale, kg */
export function est1RM(name: string, reps: number, added: number, bodyweight: number): number {
  const load = effectiveLoad(name, added, bodyweight);
  if (defOf(name).time || reps <= 0) return 0;
  return reps === 1 ? load : load * (1 + reps / 30);
}

export function exerciseVolume(ex: ExerciseEntry, bodyweight: number): number {
  if (defOf(ex.name).time) return 0;
  return ex.sets.reduce((s, x) => s + x.reps * effectiveLoad(ex.name, x.added || 0, bodyweight), 0);
}
export function workoutVolume(w: Workout, bodyweight: number): number {
  return w.exercises.reduce((s, e) => s + exerciseVolume(e, bodyweight), 0);
}
export const totalReps = (ex: ExerciseEntry) => ex.sets.reduce((s, x) => s + (x.reps || 0), 0);

export type ExerciseRecords = {
  bestReps: number; // meilleure série sans lest (ou temps)
  bestRepsDate: string;
  maxAdded: number; // plus gros lest avec au moins 1 rep
  maxAddedReps: number;
  best1RM: number;
  totalReps: number;
  sessions: number;
  history: { date: string; best: number; total: number }[];
};

export function recordsFor(name: string, workouts: Rec<Workout>[], bodyweight: number): ExerciseRecords {
  const r: ExerciseRecords = {
    bestReps: 0,
    bestRepsDate: "",
    maxAdded: 0,
    maxAddedReps: 0,
    best1RM: 0,
    totalReps: 0,
    sessions: 0,
    history: [],
  };
  const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date));
  for (const w of sorted) {
    const bw = w.bodyweight || bodyweight;
    let best = 0;
    let total = 0;
    let found = false;
    for (const ex of w.exercises) {
      if (ex.name !== name) continue;
      found = true;
      for (const s of ex.sets) {
        if (!s.reps) continue;
        total += s.reps;
        best = Math.max(best, s.reps);
        if (s.reps > r.bestReps && !(s.added > 0)) {
          r.bestReps = s.reps;
          r.bestRepsDate = w.date;
        }
        if (s.added > r.maxAdded || (s.added === r.maxAdded && s.reps > r.maxAddedReps)) {
          r.maxAdded = s.added;
          r.maxAddedReps = s.reps;
        }
        r.best1RM = Math.max(r.best1RM, est1RM(name, s.reps, s.added || 0, bw));
      }
    }
    if (found) {
      r.sessions++;
      r.totalReps += total;
      r.history.push({ date: w.date, best, total });
    }
  }
  return r;
}

// ---------- Course à pied ----------
export const paceOf = (r: Run) => (r.km > 0 ? r.seconds / r.km : 0);

/** Prédiction de Riegel : T2 = T1 × (D2/D1)^1.06 */
export const riegel = (t1: number, d1: number, d2: number) => t1 * Math.pow(d2 / d1, 1.06);

export const RACES = [
  { label: "5 km", km: 5 },
  { label: "10 km", km: 10 },
  { label: "Semi-marathon", km: 21.0975 },
  { label: "Marathon", km: 42.195 },
];
