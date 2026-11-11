import { addDays, diffDays } from "./dates";
import type { Habit, HabitCheck } from "./types";
import type { Rec } from "./store";

export const scheduled = (h: Habit, date: string, dowFn: (s: string) => number) =>
  !h.days || h.days.length === 0 || h.days.includes(dowFn(date));

export function checksOf(habitId: number, checks: Rec<HabitCheck>[]): Set<string> {
  return new Set(checks.filter((c) => c.habitId === habitId).map((c) => c.date));
}

export function streaks(
  h: Habit,
  set: Set<string>,
  today: string,
  dowFn: (s: string) => number,
): { current: number; best: number } {
  // série en cours (aujourd'hui pas encore coché ne casse pas la série)
  let current = 0;
  let d = set.has(today) || !scheduled(h, today, dowFn) ? today : addDays(today, -1);
  for (let i = 0; i < 800; i++) {
    if (scheduled(h, d, dowFn)) {
      if (set.has(d)) current++;
      else break;
    }
    d = addDays(d, -1);
  }
  // meilleure série
  let best = 0;
  const dates = [...set].sort();
  if (dates.length) {
    let run = 0;
    const span = diffDays(dates[0], today);
    for (let i = 0; i <= span; i++) {
      const day = addDays(dates[0], i);
      if (!scheduled(h, day, dowFn)) continue;
      if (set.has(day)) {
        run++;
        best = Math.max(best, run);
      } else if (day !== today) {
        run = 0;
      }
    }
  }
  return { current, best: Math.max(best, current) };
}

export const HABIT_SUGGESTIONS = [
  { name: "Boire 2 L d'eau", emoji: "💧" },
  { name: "Dormir avant 23h", emoji: "😴" },
  { name: "Étirements", emoji: "🧘" },
  { name: "Sax 30 min", emoji: "🎷" },
  { name: "Gammes", emoji: "🎼" },
  { name: "Lecture 20 min", emoji: "📖" },
  { name: "Pas d'écran avant de dormir", emoji: "📵" },
  { name: "Tractions du jour", emoji: "💪" },
  { name: "Manger 3 repas complets", emoji: "🍽️" },
  { name: "Réviser 30 min", emoji: "🎓" },
];
