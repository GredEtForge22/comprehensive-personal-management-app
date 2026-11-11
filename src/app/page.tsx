"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
import { Progress, Rating } from "@/components/ui";
import { TASK_TYPES } from "@/components/cours/Tasks";
import { addDays, countdown, dow, fmtDate, fmtDuration, fmtLong, nowMinutes, todayStr, toMin, weekDates, weekType } from "@/lib/dates";
import { scheduled } from "@/lib/habits";
import { eventsForDay } from "@/lib/schedule";
import { SATISFACTION } from "@/lib/sax";
import { useItems, useSettings } from "@/lib/store";
import type { Cancel, Course, DayLog, Habit, HabitCheck, Meal, OneOff, Piece, Run, SaxSession, Task, Workout } from "@/lib/types";

export default function HomePage() {
  const { settings } = useSettings();
  const courses = useItems<Course>("course");
  const events = useItems<OneOff>("event");
  const cancels = useItems<Cancel>("cancel");
  const habits = useItems<Habit>("habit");
  const checks = useItems<HabitCheck>("habitcheck");
  const meals = useItems<Meal>("meal");
  const sax = useItems<SaxSession>("sax");
  const workouts = useItems<Workout>("workout");
  const runs = useItems<Run>("run");
  const tasks = useItems<Task>("task");
  const pieces = useItems<Piece>("piece");
  const logs = useItems<DayLog>("daylog");
  const today = todayStr();
  const now = nowMinutes();
  const week = weekDates(today);

  const todayEvents = useMemo(
    () => eventsForDay(today, courses.items, events.items, cancels.items, settings.weekAParity),
    [today, courses.items, events.items, cancels.items, settings.weekAParity],
  );
  const dueHabits = habits.items.filter((h) => scheduled(h, today, dow));
  const isDone = (id: number, d = today) => checks.items.some((c) => c.habitId === id && c.date === d);
  const doneCount = dueHabits.filter((h) => isDone(h.id)).length;

  const todayMeals = meals.items.filter((m) => m.date === today);
  const kcal = todayMeals.reduce((a, m) => a + m.kcal, 0);
  const prot = todayMeals.reduce((a, m) => a + m.protein, 0);

  const saxWeek = sax.items.filter((s) => week.includes(s.date)).reduce((a, s) => a + s.minutes, 0);
  const wkWorkouts = workouts.items.filter((w) => week.includes(w.date)).length;
  const wkKm = runs.items.filter((r) => week.includes(r.date)).reduce((a, r) => a + r.km, 0);

  const upcoming = [
    ...tasks.items
      .filter((t) => !t.done && t.date <= addDays(today, 14))
      .map((t) => ({ key: "t" + t.id, date: t.date, label: t.title, icon: TASK_TYPES[t.type]?.icon ?? "📌", sub: TASK_TYPES[t.type]?.label ?? "" })),
    ...pieces.items
      .filter((p) => p.deadline && p.status !== "done" && p.deadline <= addDays(today, 30))
      .map((p) => ({ key: "p" + p.id, date: p.deadline!, label: p.title, icon: "🎶", sub: "Morceau" })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  // bilan du jour
  const log = logs.items.find((l) => l.date === today);
  const last7 = logs.items.filter((l) => l.date >= addDays(today, -6));
  const avg = (k: "sleep" | "mood" | "energy") => (last7.length ? last7.reduce((a, l) => a + (l[k] || 0), 0) / last7.length : 0);
  const saving = useRef(false);
  async function changeLog(patch: Partial<DayLog>) {
    if (log) {
      await logs.update(log.id, patch);
    } else if (!saving.current) {
      saving.current = true;
      await logs.add({ sleep: 0, mood: 0, energy: 0, ...patch }, today);
      saving.current = false;
    }
  }

  const hour = Math.floor(now / 60);
  const greeting = hour < 6 ? "Bonne nuit" : hour < 18 ? "Bonjour" : "Bonsoir";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greeting} 👋</h1>
          <p className="text-sm text-zinc-400 capitalize">
            {fmtLong(today)} · semaine {weekType(today, settings.weekAParity)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/sax" className="btn">🎷 Séance sax</Link>
          <Link href="/sport" className="btn">💪 Séance sport</Link>
          <Link href="/nutrition" className="btn">🍽️ Repas</Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Planning */}
        <div className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">📅 Planning du jour</h2>
            <Link href="/edt" className="text-xs text-amber-300">Voir l&apos;EDT →</Link>
          </div>
          {todayEvents.length === 0 ? (
            <p className="text-sm text-zinc-500">Rien de prévu aujourd&apos;hui 🎉</p>
          ) : (
            <div className="space-y-1.5">
              {todayEvents.map((e) => {
                const current = !e.cancelled && toMin(e.start) <= now && now < toMin(e.end);
                const past = toMin(e.end) <= now;
                return (
                  <div
                    key={e.key}
                    className={`flex items-center gap-3 rounded-xl border-l-4 px-3 py-2 ${current ? "bg-amber-400/10 ring-1 ring-amber-400/40" : "bg-zinc-800/50"} ${past || e.cancelled ? "opacity-50" : ""}`}
                    style={{ borderColor: e.color }}
                  >
                    <div className="w-24 text-xs text-zinc-400">
                      {e.start} – {e.end}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-sm font-medium ${e.cancelled ? "line-through" : ""}`}>{e.title}</div>
                      {e.room && <div className="text-xs text-zinc-500">{e.room}</div>}
                    </div>
                    {current && <span className="text-xs font-semibold text-amber-300">en cours</span>}
                    {e.cancelled && <span className="text-xs text-red-400">annulé</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Habitudes */}
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">✅ Habitudes</h2>
            <span className="text-sm text-zinc-400">
              {doneCount}/{dueHabits.length}
            </span>
          </div>
          <Progress value={doneCount} max={dueHabits.length} />
          <div className="mt-3 space-y-1.5">
            {dueHabits.length === 0 && (
              <p className="text-sm text-zinc-500">
                Aucune habitude. <Link href="/habitudes" className="text-amber-300">En créer →</Link>
              </p>
            )}
            {dueHabits.map((h) => {
              const on = isDone(h.id);
              return (
                <button
                  key={h.id}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-zinc-800/50 px-3 py-2 text-left text-sm transition hover:bg-zinc-800"
                  onClick={() => {
                    const ex = checks.items.find((c) => c.habitId === h.id && c.date === today);
                    if (ex) void checks.remove(ex.id);
                    else void checks.add({ habitId: h.id }, today);
                  }}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-md border text-xs font-bold text-zinc-950"
                    style={on ? { background: h.color, borderColor: h.color } : { borderColor: "#52525b", color: "transparent" }}
                  >
                    ✓
                  </span>
                  <span className={on ? "text-zinc-500 line-through" : ""}>
                    {h.emoji} {h.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/nutrition" className="card transition hover:border-zinc-600">
          <div className="text-xs tracking-wide text-zinc-400 uppercase">🍽️ Calories</div>
          <div className="mt-1 text-2xl font-bold text-amber-300">
            {Math.round(kcal)} <span className="text-sm font-normal text-zinc-500">/ {settings.kcal}</span>
          </div>
          <div className="my-2">
            <Progress value={kcal} max={settings.kcal} />
          </div>
          <div className="text-xs text-zinc-400">
            Protéines {Math.round(prot)} / {settings.protein} g
          </div>
        </Link>
        <Link href="/sax" className="card transition hover:border-zinc-600">
          <div className="text-xs tracking-wide text-zinc-400 uppercase">🎷 Sax cette semaine</div>
          <div className="mt-1 text-2xl font-bold text-amber-300">
            {fmtDuration(saxWeek)} <span className="text-sm font-normal text-zinc-500">/ {fmtDuration(settings.saxWeeklyMin)}</span>
          </div>
          <div className="my-2">
            <Progress value={saxWeek} max={settings.saxWeeklyMin} color={saxWeek >= settings.saxWeeklyMin ? "#10b981" : "#fbbf24"} />
          </div>
          <div className="text-xs text-zinc-400">
            Aujourd&apos;hui : {fmtDuration(sax.items.filter((s) => s.date === today).reduce((a, s) => a + s.minutes, 0))}
          </div>
        </Link>
        <Link href="/sport" className="card transition hover:border-zinc-600">
          <div className="text-xs tracking-wide text-zinc-400 uppercase">💪 Sport cette semaine</div>
          <div className="mt-1 text-2xl font-bold text-amber-300">
            {wkWorkouts} <span className="text-sm font-normal text-zinc-500">/ {settings.workoutsPerWeek} séances</span>
          </div>
          <div className="my-2">
            <Progress value={wkWorkouts} max={settings.workoutsPerWeek} />
          </div>
          <div className="text-xs text-zinc-400">
            🏃 {Math.round(wkKm * 10) / 10} / {settings.runWeeklyKm} km
          </div>
        </Link>
        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs tracking-wide text-zinc-400 uppercase">🎯 Échéances</div>
            <Link href="/cours" className="text-xs text-amber-300">
              Tout →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-zinc-500">Rien à l&apos;horizon.</p>
          ) : (
            <div className="space-y-1.5">
              {upcoming.map((u) => (
                <div key={u.key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    {u.icon} {u.label}
                  </span>
                  <span className={`shrink-0 text-xs font-semibold ${u.date < today ? "text-red-400" : "text-zinc-400"}`} title={fmtDate(u.date)}>
                    {countdown(u.date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bilan */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">🌙 Bilan du jour</h2>
          {last7.length > 0 && (
            <span className="text-xs text-zinc-500">
              7 j : sommeil {avg("sleep").toFixed(1)} h · humeur {avg("mood").toFixed(1)}/5 · énergie {avg("energy").toFixed(1)}/5
            </span>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <span className="label">Sommeil (objectif {settings.sleepGoal} h)</span>
            <select
              className="input"
              value={log?.sleep || ""}
              onChange={(e) => changeLog({ sleep: Number(e.target.value) })}
            >
              <option value="">—</option>
              {Array.from({ length: 17 }, (_, i) => 4 + i * 0.5).map((h) => (
                <option key={h} value={h}>
                  {h} h
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="label">Humeur</span>
            <Rating value={log?.mood ?? 0} onChange={(v) => changeLog({ mood: v })} />
          </div>
          <div>
            <span className="label">Énergie</span>
            <Rating value={log?.energy ?? 0} onChange={(v) => changeLog({ energy: v })} icons={["🪫", "😴", "😌", "⚡", "🚀"]} />
          </div>
        </div>
        {sax.items.length > 0 && (
          <p className="text-xs text-zinc-500">
            Dernière séance de sax : {SATISFACTION[(sax.items[sax.items.length - 1].satisfaction || 3) - 1]} le {fmtDate(sax.items[sax.items.length - 1].date)}
          </p>
        )}
      </div>
    </div>
  );
}
