import { db } from "@/db";
import { settings } from "@/db/schema";

export const DEFAULT_SETTINGS = {
  kcalGoal: 2500,
  proteinGoal: 120,
  carbsGoal: 300,
  fatGoal: 80,
  musicWeeklyGoalMin: 420,
  runWeeklyGoalKm: 15,
  muscuWeeklyGoal: 3,
  weekAOdd: true,
};

export type Settings = typeof DEFAULT_SETTINGS;

export async function getSettings(): Promise<Settings> {
  const rows = await db.select().from(settings);
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    if (!(r.key in DEFAULT_SETTINGS)) continue;
    try {
      out[r.key] = JSON.parse(r.value);
    } catch {
      /* ignore */
    }
  }
  return out as Settings;
}

export async function saveSettings(partial: Partial<Settings>) {
  for (const [key, value] of Object.entries(partial)) {
    if (!(key in DEFAULT_SETTINGS) || value === undefined) continue;
    const v = JSON.stringify(value);
    await db
      .insert(settings)
      .values({ key, value: v })
      .onConflictDoUpdate({ target: settings.key, set: { value: v } });
  }
}
