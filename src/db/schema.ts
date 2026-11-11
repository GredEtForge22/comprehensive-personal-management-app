import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Table générique : chaque ligne est un enregistrement typé par `kind`
 * (course, workout, run, sax, meal, habit, task, grade...).
 * `date` (YYYY-MM-DD, fuseau Europe/Paris) est indexée pour les requêtes par jour.
 */
export const items = pgTable(
  "items",
  {
    id: serial("id").primaryKey(),
    kind: text("kind").notNull(),
    date: text("date"),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("items_kind_date_idx").on(t.kind, t.date)],
);

/** Réglages de l'application (une seule ligne, clé "app"). */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull().default({}),
});

/** Photos de partitions : miniature + image réduite, stockées en data-URL. */
export const scores = pgTable("scores", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default(""),
  tags: text("tags").notNull().default(""),
  pos: integer("pos").notNull().default(0),
  thumb: text("thumb").notNull(),
  image: text("image").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
