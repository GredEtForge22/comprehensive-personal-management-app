// Types des enregistrements (champ `kind` côté base). `date` est géré par le store.

export type Course = {
  title: string;
  days: number[]; // 0 = lundi
  start: string;
  end: string;
  room?: string;
  teacher?: string;
  color: string;
  weeks: "all" | "A" | "B";
  validFrom?: string;
  validTo?: string;
};
export type OneOff = {
  title: string;
  start: string;
  end: string;
  room?: string;
  color: string;
  note?: string;
};
export type Cancel = { courseId: number };

export type SetEntry = { reps: number; added: number };
export type ExerciseEntry = { name: string; sets: SetEntry[] };
export type Workout = {
  name: string;
  exercises: ExerciseEntry[];
  notes?: string;
  duration?: number;
  feel?: number;
  bodyweight?: number;
};
export type Run = {
  km: number;
  seconds: number;
  type: string;
  feel?: number;
  notes?: string;
};

export type ScaleLog = { key: string; type: string; tempo: number };
export type PieceLog = { title: string; tempo: number };
export type SaxSession = {
  minutes: number;
  satisfaction: number; // 1-5
  focus: string[];
  scales: ScaleLog[];
  pieces: PieceLog[];
  notes?: string;
  toFix?: string;
};
export type ScaleQuick = ScaleLog;
export type Piece = {
  title: string;
  composer?: string;
  targetTempo: number;
  currentTempo: number;
  status: "todo" | "learning" | "polish" | "done";
  notes?: string;
  deadline?: string;
};

export type Meal = {
  meal: string;
  name: string;
  brand?: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  per100?: Macros;
};
export type Macros = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
};
export type WeightLog = { kg: number };
export type DayLog = { sleep: number; mood: number; energy: number; water?: number; note?: string };

export type Habit = { name: string; emoji: string; color: string; days: number[] };
export type HabitCheck = { habitId: number };

export type Subject = { name: string; color: string; coef: number; teacher?: string };
export type Chapter = {
  subjectId: number;
  title: string;
  status: "todo" | "seen" | "review" | "mastered";
  notes?: string;
};
export type Task = {
  type: "devoir" | "controle" | "audition" | "concert" | "autre";
  title: string;
  subjectId?: number | null;
  done: boolean;
  notes?: string;
};
export type Grade = { subjectId: number; title: string; value: number; outOf: number; coef: number };
export type Lesson = {
  teacher: string;
  summary: string;
  todos: { text: string; done: boolean }[];
  pieces?: string;
};
export type Card = { subjectId?: number | null; q: string; a: string; box: number };
