import Link from "next/link";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  checkins,
  foodEntries,
  habitLogs,
  habits,
  pieces,
  practiceSessions,
  runs,
  scheduleEvents,
  scheduleExceptions,
  tasks,
  workouts,
} from "@/db/schema";
import { addDays, diffDays, fmtLong, fmtMinutes, fmtRelative, nowMinutes, startOfWeek, todayStr, toMin, weekParity } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { occursOn, type ScheduleEvent } from "@/lib/schedule";
import { ProgressBar, Ring } from "@/components/charts";
import { CheckinCard, TodayHabits } from "@/components/DashboardWidgets";

export const dynamic = "force-dynamic";

const KIND_ICON: Record<string, string> = { devoir: "📘", controle: "⚠️", projet: "🧩", musique: "🎷", autre: "📌" };

export default async function Dashboard() {
  const today = todayStr();
  const weekStart = startOfWeek(today);
  const settings = await getSettings();

  const [events, exceptions, hs, logs, food, sessions, wk, rn, openTasks, checkin, ps] = await Promise.all([
    db.select().from(scheduleEvents),
    db.select().from(scheduleExceptions).where(eq(scheduleExceptions.date, today)),
    db.select().from(habits).orderBy(asc(habits.position), asc(habits.id)),
    db.select().from(habitLogs).where(eq(habitLogs.date, today)),
    db.select().from(foodEntries).where(eq(foodEntries.date, today)),
    db.select().from(practiceSessions).where(gte(practiceSessions.date, addDays(today, -60))),
    db.select().from(workouts).where(gte(workouts.date, weekStart)),
    db.select().from(runs).where(gte(runs.date, weekStart)),
    db.select().from(tasks).where(and(eq(tasks.done, false), lte(tasks.dueDate, addDays(today, 21)))).orderBy(asc(tasks.dueDate)),
    db.select().from(checkins).where(eq(checkins.date, today)),
    db.select().from(pieces).where(and(gte(pieces.deadline, today), lte(pieces.deadline, addDays(today, 45)))).orderBy(asc(pieces.deadline)),
  ]);

  const parity = weekParity(today, settings.weekAOdd);
  const cancelled = new Set(exceptions.map((e) => e.eventId));
  const todayEvents = events
    .map<ScheduleEvent>((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      color: r.color,
      startTime: r.startTime,
      endTime: r.endTime,
      location: r.location,
      notes: r.notes,
      repeat: r.repeat === "once" ? "once" : "weekly",
      daysOfWeek: r.daysOfWeek,
      date: r.date,
      weekParity: r.weekParity === "A" || r.weekParity === "B" ? r.weekParity : "all",
      validFrom: r.validFrom,
      validUntil: r.validUntil,
    }))
    .filter((e) => occursOn(e, today, parity) && !cancelled.has(e.id))
    .sort((a, b) => toMin(a.startTime) - toMin(b.startTime));

  const now = nowMinutes();
  const hour = Math.floor(now / 60);
  const greeting = hour < 5 ? "Bonne nuit" : hour < 18 ? "Bonjour" : "Bonsoir";

  const kcal = food.reduce((s, e) => s + e.kcal, 0);
  const protein = food.reduce((s, e) => s + e.protein, 0);

  const weekMin = sessions.filter((s) => s.date >= weekStart).reduce((a, s) => a + s.minutes, 0);
  const todayMin = sessions.filter((s) => s.date === today).reduce((a, s) => a + s.minutes, 0);
  const days = new Set(sessions.map((s) => s.date));
  let streak = 0;
  for (let d = days.has(today) ? today : addDays(today, -1); days.has(d); d = addDays(d, -1)) streak++;

  const runKm = rn.reduce((s, r) => s + r.distanceKm, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{greeting} 👋</h1>
        <p className="text-sm capitalize text-zinc-400">
          {fmtLong(today)} · semaine {parity}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Emploi du temps du jour */}
        <section className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-section !mb-0">🗓️ Aujourd&apos;hui</div>
            <Link href="/edt" className="text-xs text-amber-300 hover:underline">
              Voir la semaine →
            </Link>
          </div>
          <div className="space-y-2">
            {todayEvents.map((e) => {
              const s = toMin(e.startTime);
              const en = toMin(e.endTime);
              const state = now >= en ? "past" : now >= s ? "now" : "next";
              return (
                <div
                  key={e.id}
                  className={`flex items-center gap-3 rounded-xl border p-2.5 ${
                    state === "now" ? "border-amber-400/60 bg-amber-400/5" : "border-zinc-800"
                  } ${state === "past" ? "opacity-45" : ""}`}
                >
                  <div className="w-12 text-xs text-zinc-400">
                    <div>{e.startTime}</div>
                    <div className="text-zinc-600">{e.endTime}</div>
                  </div>
                  <div className="h-8 w-1 rounded-full" style={{ background: e.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{e.title}</div>
                    {e.location && <div className="truncate text-xs text-zinc-500">{e.location}</div>}
                  </div>
                  {state === "now" && <span className="chip !border-amber-400/60 !text-amber-300">en cours</span>}
                </div>
              );
            })}
            {todayEvents.length === 0 && (
              <p className="py-4 text-center text-sm text-zinc-500">
                Rien au planning aujourd&apos;hui. <Link href="/edt" className="text-amber-300 underline">Remplir mon emploi du temps</Link>
              </p>
            )}
          </div>
        </section>

        {/* Habitudes */}
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-section !mb-0">✅ Habitudes</div>
            <Link href="/habitudes" className="text-xs text-amber-300 hover:underline">
              Gérer →
            </Link>
          </div>
          <TodayHabits
            habits={hs.map((h) => ({ id: h.id, name: h.name, emoji: h.emoji, color: h.color }))}
            doneIds={logs.map((l) => l.habitId)}
            today={today}
          />
        </section>

        {/* Nutrition */}
        <Link href="/nutrition" className="card flex items-center gap-4 transition hover:border-zinc-600">
          <Ring value={kcal} max={settings.kcalGoal} size={92}>
            <div>
              <div className="text-lg font-semibold">{Math.round(kcal)}</div>
              <div className="text-[10px] text-zinc-500">kcal</div>
            </div>
          </Ring>
          <div className="min-w-0 flex-1">
            <div className="h-section !mb-1">🥗 Nutrition</div>
            <div className="text-xs text-zinc-400">
              Objectif {settings.kcalGoal} kcal
            </div>
            <div className="mt-2 text-xs text-zinc-400">Protéines : {Math.round(protein)} / {settings.proteinGoal} g</div>
            <div className="mt-1">
              <ProgressBar value={protein} max={settings.proteinGoal} color="#ef4444" height={5} />
            </div>
          </div>
        </Link>

        {/* Saxophone */}
        <Link href="/musique" className="card transition hover:border-zinc-600">
          <div className="h-section">🎷 Saxophone</div>
          <div className="flex items-end justify-between">
            <div>
              <div className="stat-value">{fmtMinutes(weekMin)}</div>
              <div className="stat-label">cette semaine / {fmtMinutes(settings.musicWeeklyGoalMin)}</div>
            </div>
            <div className="text-right text-sm">
              <div>🔥 {streak} j</div>
              <div className="text-xs text-zinc-500">{todayMin ? `${fmtMinutes(todayMin)} aujourd'hui` : "pas encore joué"}</div>
            </div>
          </div>
          <div className="mt-3">
            <ProgressBar value={weekMin} max={settings.musicWeeklyGoalMin} />
          </div>
        </Link>

        {/* Sport */}
        <section className="card">
          <div className="h-section">💪 Sport cette semaine</div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/muscu" className="rounded-xl bg-zinc-950 p-3 transition hover:bg-zinc-800">
              <div className="text-xs text-zinc-400">Muscu</div>
              <div className="text-xl font-semibold text-emerald-300">
                {wk.length} <span className="text-sm text-zinc-500">/ {settings.muscuWeeklyGoal}</span>
              </div>
            </Link>
            <Link href="/course" className="rounded-xl bg-zinc-950 p-3 transition hover:bg-zinc-800">
              <div className="text-xs text-zinc-400">Course</div>
              <div className="text-xl font-semibold text-sky-300">
                {Math.round(runKm * 10) / 10} <span className="text-sm text-zinc-500">/ {settings.runWeeklyGoalKm} km</span>
              </div>
            </Link>
          </div>
        </section>

        {/* Échéances */}
        <section className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-section !mb-0">📝 Échéances</div>
            <Link href="/devoirs" className="text-xs text-amber-300 hover:underline">
              Tout voir →
            </Link>
          </div>
          <div className="space-y-1.5">
            {openTasks.slice(0, 6).map((t) => {
              const left = t.dueDate ? diffDays(t.dueDate, today) : 0;
              return (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-950 px-3 py-2 text-sm">
                  <span className="truncate">
                    {KIND_ICON[t.kind] ?? "📌"} {t.title}
                    {t.subject ? <span className="text-zinc-500"> · {t.subject}</span> : null}
                  </span>
                  <span className={`shrink-0 text-xs ${left < 0 ? "text-red-300" : left <= 1 ? "text-amber-300" : "text-zinc-400"}`}>
                    {t.dueDate ? fmtRelative(t.dueDate, today) : ""}
                  </span>
                </div>
              );
            })}
            {ps.slice(0, 3).map((p) => (
              <div key={`p${p.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-950 px-3 py-2 text-sm">
                <span className="truncate">🎼 Morceau à finir : {p.title}</span>
                <span className="shrink-0 text-xs text-zinc-400">J-{diffDays(p.deadline!, today)}</span>
              </div>
            ))}
            {openTasks.length === 0 && ps.length === 0 && <p className="py-3 text-center text-sm text-zinc-500">Aucune échéance proche 🎉</p>}
          </div>
        </section>

        {/* Bilan du jour */}
        <section className="card">
          <div className="h-section">🌙 Bilan du jour</div>
          <CheckinCard
            date={today}
            initial={checkin[0] ? { sleepHours: checkin[0].sleepHours, mood: checkin[0].mood, energy: checkin[0].energy, note: checkin[0].note } : null}
          />
        </section>
      </div>
    </div>
  );
}
