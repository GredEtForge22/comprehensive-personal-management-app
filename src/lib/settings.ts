export type Instrument = "alto" | "tenor" | "soprano" | "baryton";

export type Settings = {
  weight: number;
  height: number;
  age: number;
  sex: "m" | "f";
  activity: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  saxWeeklyMin: number;
  saxInstrument: Instrument;
  runWeeklyKm: number;
  workoutsPerWeek: number;
  sleepGoal: number;
  weekAParity: number;
};

export const DEFAULT_SETTINGS: Settings = {
  weight: 61,
  height: 186,
  age: 17,
  sex: "m",
  activity: 1.7,
  kcal: 3000,
  protein: 125,
  carbs: 430,
  fat: 85,
  fiber: 30,
  sugar: 60,
  saxWeeklyMin: 510, // 8h30
  saxInstrument: "alto",
  runWeeklyKm: 15,
  workoutsPerWeek: 4,
  sleepGoal: 8,
  weekAParity: 0,
};

/** Demi-tons à ajouter à la note réelle (concert) pour obtenir la note écrite. */
export const TRANSPOSE: Record<Instrument, number> = {
  soprano: 2, // Sib : écrit un ton au-dessus
  alto: 9, // Mib : écrit une sixte majeure au-dessus
  tenor: 14, // Sib : écrit une neuvième majeure au-dessus
  baryton: 21, // Mib : écrit une sixte + octave au-dessus
};
export const INSTRUMENT_LABEL: Record<Instrument, string> = {
  soprano: "Soprano (Sib)",
  alto: "Alto (Mib)",
  tenor: "Ténor (Sib)",
  baryton: "Baryton (Mib)",
};
