"use client";

import { useItems, useSettings } from "./store";
import type { WeightLog } from "./types";

/** Dernier poids pesé, sinon poids des réglages (61 kg par défaut). */
export function useBodyweight(): number {
  const weights = useItems<WeightLog>("weight");
  const { settings } = useSettings();
  const latest = [...weights.items].sort((a, b) => b.date.localeCompare(a.date))[0];
  return latest?.kg || settings.weight;
}
