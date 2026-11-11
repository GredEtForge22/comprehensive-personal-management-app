import {
  boolean,
  customType,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

/* ------------------------------------------------------------------ */
/* Réglages (clé / valeur JSON)                                        */
/* ------------------------------------------------------------------ */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/* ------------------------------------------------------------------ */
/* Emploi du temps                                                     */
/* ------------------------------------------------------------------ */
export const scheduleEvents = pgTable("schedule_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull().default("cours"),
  color: text("color").notNull().default("#f59e0b"),
  startTime: text("start_time").notNull(), // HH:MM
  endTime: text("end_time").notNull(), // HH:MM
  location: text("location").notNull().default(""),
  notes: text("notes").notNull().default(""),
  repeat: text("repeat").notNull().default("weekly"), // weekly | once
  daysOfWeek: integer("days_of_week").array().notNull().default([]), // 1 = lundi … 7 = dimanche
  date: date("date", { mode: "string" }), // pour repeat = once
  weekParity: text("week_parity").notNull().default("all"), // all | A | B
  validFrom: date("valid_from", { mode: "string" }),
  validUntil: date("valid_until", { mode: "string" }),
  createdAt: createdAt(),
});

export const scheduleExceptions = pgTable(
  "schedule_exceptions",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => scheduleEvents.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
  },
  (t) => [unique("schedule_exceptions_unique").on(t.eventId, t.date)],
);

/* ------------------------------------------------------------------ */
/* Habitudes                                                           */
/* ------------------------------------------------------------------ */
export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("✅"),
  color: text("color").notNull().default("#f59e0b"),
  weeklyTarget: integer("weekly_target").notNull().default(7),
  position: integer("position").notNull().default(0),
  createdAt: createdAt(),
});

export const habitLogs = pgTable(
  "habit_logs",
  {
    id: serial("id").primaryKey(),
    habitId: integer("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
  },
  (t) => [unique("habit_logs_unique").on(t.habitId, t.date), index("habit_logs_date_idx").on(t.date)],
);

/* ------------------------------------------------------------------ */
/* Sport : musculation                                                 */
/* ------------------------------------------------------------------ */
export const workouts = pgTable(
  "workouts",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    name: text("name").notNull().default("Séance"),
    durationMin: integer("duration_min"),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("workouts_date_idx").on(t.date)],
);

export const workoutSets = pgTable(
  "workout_sets",
  {
    id: serial("id").primaryKey(),
    workoutId: integer("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    exercise: text("exercise").notNull(),
    exerciseOrder: integer("exercise_order").notNull().default(0),
    setOrder: integer("set_order").notNull().default(0),
    reps: integer("reps").notNull().default(0),
    weight: doublePrecision("weight").notNull().default(0),
  },
  (t) => [index("workout_sets_workout_idx").on(t.workoutId)],
);

/* ------------------------------------------------------------------ */
/* Sport : course                                                      */
/* ------------------------------------------------------------------ */
export const runs = pgTable(
  "runs",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    distanceKm: doublePrecision("distance_km").notNull(),
    durationSec: integer("duration_sec").notNull(),
    kind: text("kind").notNull().default("footing"),
    feeling: integer("feeling"),
    avgHr: integer("avg_hr"),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("runs_date_idx").on(t.date)],
);

/* ------------------------------------------------------------------ */
/* Musique : saxophone                                                 */
/* ------------------------------------------------------------------ */
export const practiceSessions = pgTable(
  "practice_sessions",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    minutes: integer("minutes").notNull(),
    category: text("category").notNull().default("technique"),
    piece: text("piece").notNull().default(""),
    tempoBpm: integer("tempo_bpm"),
    quality: integer("quality"),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("practice_date_idx").on(t.date)],
);

export const pieces = pgTable("pieces", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  composer: text("composer").notNull().default(""),
  status: text("status").notNull().default("en_travail"), // a_dechiffrer | en_travail | presque | maitrise
  currentBpm: integer("current_bpm"),
  targetBpm: integer("target_bpm"),
  deadline: date("deadline", { mode: "string" }),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------ */
/* Partitions (images stockées en base)                                */
/* ------------------------------------------------------------------ */
export const scores = pgTable("scores", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  composer: text("composer").notNull().default(""),
  tags: text("tags").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
});

export const scoreImages = pgTable(
  "score_images",
  {
    id: serial("id").primaryKey(),
    scoreId: integer("score_id")
      .notNull()
      .references(() => scores.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    mime: text("mime").notNull().default("image/jpeg"),
    data: bytea("data").notNull(),
    thumb: bytea("thumb"),
    createdAt: createdAt(),
  },
  (t) => [index("score_images_score_idx").on(t.scoreId)],
);

/* ------------------------------------------------------------------ */
/* Nutrition                                                           */
/* ------------------------------------------------------------------ */
export const foods = pgTable(
  "foods",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    brand: text("brand").notNull().default(""),
    kcal100: doublePrecision("kcal_100").notNull().default(0),
    protein100: doublePrecision("protein_100").notNull().default(0),
    carbs100: doublePrecision("carbs_100").notNull().default(0),
    fat100: doublePrecision("fat_100").notNull().default(0),
    fiber100: doublePrecision("fiber_100").notNull().default(0),
    sugar100: doublePrecision("sugar_100").notNull().default(0),
    lastGrams: doublePrecision("last_grams"),
    useCount: integer("use_count").notNull().default(0),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("foods_name_brand_unique").on(t.name, t.brand)],
);

export const foodEntries = pgTable(
  "food_entries",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    meal: text("meal").notNull().default("dejeuner"), // petit_dej | dejeuner | collation | diner
    name: text("name").notNull(),
    grams: doublePrecision("grams").notNull().default(100),
    kcal: doublePrecision("kcal").notNull().default(0),
    protein: doublePrecision("protein").notNull().default(0),
    carbs: doublePrecision("carbs").notNull().default(0),
    fat: doublePrecision("fat").notNull().default(0),
    fiber: doublePrecision("fiber").notNull().default(0),
    sugar: doublePrecision("sugar").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("food_entries_date_idx").on(t.date)],
);

export const bodyWeights = pgTable("body_weights", {
  id: serial("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull().unique(),
  kg: doublePrecision("kg").notNull(),
});

/* ------------------------------------------------------------------ */
/* Lycée : à faire, notes                                              */
/* ------------------------------------------------------------------ */
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  kind: text("kind").notNull().default("devoir"), // devoir | controle | projet | musique | autre
  subject: text("subject").notNull().default(""),
  dueDate: date("due_date", { mode: "string" }),
  done: boolean("done").notNull().default(false),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
});

export const grades = pgTable("grades", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  title: text("title").notNull().default(""),
  grade: doublePrecision("grade").notNull(),
  outOf: doublePrecision("out_of").notNull().default(20),
  coef: doublePrecision("coef").notNull().default(1),
  date: date("date", { mode: "string" }).notNull(),
});

/* ------------------------------------------------------------------ */
/* Bilan du jour (sommeil, humeur, énergie)                            */
/* ------------------------------------------------------------------ */
export const checkins = pgTable("checkins", {
  date: date("date", { mode: "string" }).primaryKey(),
  sleepHours: doublePrecision("sleep_hours"),
  mood: integer("mood"),
  energy: integer("energy"),
  note: text("note").notNull().default(""),
});
