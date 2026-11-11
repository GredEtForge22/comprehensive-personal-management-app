"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/charts";
import {
  addDays,
  DAY_LETTER,
  DAY_LONG,
  DAY_SHORT,
  dow,
  fmtDate,
  fmtShort,
  isoWeek,
  toMin,
  weekDates,
  weekParity,
} from "@/lib/dates";
import {
  CATEGORIES,
  PALETTE,
  occursOn,
  type ScheduleEvent,
  type ScheduleException,
} from "@/lib/schedule";
import { cancelOccurrence, deleteEvent, restoreOccurrence, saveEvent, type EventInput } from "@/app/actions/schedule";

type Occ = { ev: ScheduleEvent; date: string; start: number; end: number; cancelled: boolean };
type Laid = Occ & { lane: number; lanes: number };

const HOUR_H = 56;

function layoutDay(items: Occ[]): Laid[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
  const out: Laid[] = [];
  let cluster: Laid[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, laneEnds.length);
    cluster.forEach((c) => (c.lanes = lanes));
    out.push(...cluster);
    cluster = [];
    laneEnds = [];
    clusterEnd = -1;
  };
  for (const it of sorted) {
    if (it.start >= clusterEnd && cluster.length) flush();
    let lane = laneEnds.findIndex((e) => e <= it.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(it.end);
    } else laneEnds[lane] = it.end;
    cluster.push({ ...it, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  flush();
  return out;
}

export default function ScheduleView({
  events,
  exceptions,
  weekStart,
  today,
  weekAOdd,
}: {
  events: ScheduleEvent[];
  exceptions: ScheduleException[];
  weekStart: string;
  today: string;
  weekAOdd: boolean;
}) {
  const days = useMemo(() => weekDates(weekStart), [weekStart]);
  const parity = weekParity(weekStart, weekAOdd);
  const [selected, setSelected] = useState(days.includes(today) ? today : days[0]);
  const [form, setForm] = useState<{ ev: ScheduleEvent | null; date: string } | null>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);

  useEffect(() => {
    setSelected(days.includes(today) ? today : days[0]);
  }, [days, today]);

  useEffect(() => {
    const tick = () => {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Paris",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      setNowMin(toMin(parts));
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const cancelledSet = useMemo(() => new Set(exceptions.map((e) => `${e.eventId}|${e.date}`)), [exceptions]);

  const byDay = useMemo(() => {
    const map: Record<string, Occ[]> = {};
    for (const d of days) {
      map[d] = events
        .filter((ev) => occursOn(ev, d, parity))
        .map((ev) => ({
          ev,
          date: d,
          start: toMin(ev.startTime),
          end: toMin(ev.endTime),
          cancelled: cancelledSet.has(`${ev.id}|${d}`),
        }));
    }
    return map;
  }, [events, days, parity, cancelledSet]);

  const all = Object.values(byDay).flat();
  const startHour = Math.min(8, ...all.map((o) => Math.floor(o.start / 60)));
  const endHour = Math.max(18, ...all.map((o) => Math.ceil(o.end / 60)));
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridH = hours.length * HOUR_H;

  const prev = addDays(weekStart, -7);
  const next = addDays(weekStart, 7);
  const isCurrent = days.includes(today);
  const total = all.filter((o) => !o.cancelled).reduce((s, o) => s + (o.end - o.start), 0);

  return (
    <div>
      <PageHeader
        title="Emploi du temps"
        icon="🗓️"
        subtitle={`Semaine ${isoWeek(weekStart)} · du ${fmtShort(days[0])} au ${fmtShort(days[6])} · ${Math.round(total / 6) / 10} h planifiées`}
      >
        <span className={`chip ${parity === "A" ? "!border-indigo-500/50 !text-indigo-300" : "!border-pink-500/50 !text-pink-300"}`}>
          Semaine {parity}
        </span>
        <Link href={`/edt?week=${prev}`} className="btn btn-ghost btn-sm">
          ←
        </Link>
        <Link href="/edt" className={`btn btn-sm ${isCurrent ? "btn-ghost" : "btn-primary"}`}>
          Aujourd&apos;hui
        </Link>
        <Link href={`/edt?week=${next}`} className="btn btn-ghost btn-sm">
          →
        </Link>
        <button className="btn btn-primary" onClick={() => setForm({ ev: null, date: selected })}>
          + Ajouter
        </button>
      </PageHeader>

      {/* Mobile : un jour à la fois */}
      <div className="md:hidden">
        <div className="mb-3 grid grid-cols-7 gap-1">
          {days.map((d, i) => (
            <button
              key={d}
              onClick={() => setSelected(d)}
              className={`rounded-xl py-2 text-center text-xs transition ${
                selected === d ? "bg-amber-400 font-semibold text-zinc-950" : "bg-zinc-900 text-zinc-300"
              } ${d === today && selected !== d ? "ring-1 ring-amber-400/60" : ""}`}
            >
              <div>{DAY_LETTER[i]}</div>
              <div className="text-sm">{d.slice(8)}</div>
            </button>
          ))}
        </div>
        <h2 className="mb-2 text-sm font-medium capitalize text-zinc-300">
          {fmtDate(selected, { weekday: "long", day: "numeric", month: "long" })}
        </h2>
        <div className="space-y-2">
          {byDay[selected]
            ?.slice()
            .sort((a, b) => a.start - b.start)
            .map((o) => (
              <button
                key={o.ev.id}
                onClick={() => setForm({ ev: o.ev, date: o.date })}
                className={`flex w-full gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 text-left ${
                  o.cancelled ? "opacity-40" : ""
                }`}
              >
                <div className="w-1.5 shrink-0 rounded-full" style={{ background: o.ev.color }} />
                <div className="min-w-0 flex-1">
                  <div className={`font-medium ${o.cancelled ? "line-through" : ""}`}>{o.ev.title}</div>
                  <div className="text-xs text-zinc-400">
                    {o.ev.startTime} – {o.ev.endTime}
                    {o.ev.location ? ` · ${o.ev.location}` : ""}
                    {o.cancelled ? " · annulé" : ""}
                  </div>
                </div>
              </button>
            ))}
          {(byDay[selected]?.length ?? 0) === 0 && (
            <div className="card text-center text-sm text-zinc-500">Rien de prévu ce jour-là 🎉</div>
          )}
        </div>
      </div>

      {/* Desktop : grille semaine */}
      <div className="card hidden overflow-hidden p-0 md:block">
        <div className="grid border-b border-zinc-800" style={{ gridTemplateColumns: "48px repeat(7, minmax(0,1fr))" }}>
          <div />
          {days.map((d, i) => (
            <div
              key={d}
              className={`border-l border-zinc-800 py-2 text-center text-sm ${d === today ? "bg-amber-400/10 text-amber-300" : "text-zinc-300"}`}
            >
              <div className="text-xs text-zinc-400">{DAY_SHORT[i]}</div>
              <div className="font-semibold">{d.slice(8)}</div>
            </div>
          ))}
        </div>
        <div className="grid" style={{ gridTemplateColumns: "48px repeat(7, minmax(0,1fr))" }}>
          <div className="relative" style={{ height: gridH }}>
            {hours.map((h, i) => (
              <div key={h} className="absolute right-2 -translate-y-1/2 text-[10px] text-zinc-500" style={{ top: i * HOUR_H }}>
                {i > 0 ? `${h}h` : ""}
              </div>
            ))}
          </div>
          {days.map((d) => {
            const laid = layoutDay(byDay[d] ?? []);
            return (
              <div
                key={d}
                className={`relative border-l border-zinc-800 ${d === today ? "bg-amber-400/[0.03]" : ""}`}
                style={{ height: gridH }}
                onDoubleClick={() => setForm({ ev: null, date: d })}
              >
                {hours.map((h, i) => (
                  <div key={h} className="absolute inset-x-0 border-t border-zinc-800/70" style={{ top: i * HOUR_H }} />
                ))}
                {d === today && nowMin !== null && nowMin >= startHour * 60 && nowMin <= endHour * 60 && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-500"
                    style={{ top: ((nowMin - startHour * 60) / 60) * HOUR_H }}
                  />
                )}
                {laid.map((o) => {
                  const top = ((o.start - startHour * 60) / 60) * HOUR_H;
                  const height = Math.max(22, ((o.end - o.start) / 60) * HOUR_H - 2);
                  return (
                    <button
                      key={o.ev.id}
                      onClick={() => setForm({ ev: o.ev, date: o.date })}
                      className={`absolute overflow-hidden rounded-lg px-1.5 py-1 text-left text-[11px] leading-tight text-white shadow transition hover:brightness-110 ${
                        o.cancelled ? "opacity-35" : ""
                      }`}
                      style={{
                        top,
                        height,
                        left: `calc(${(o.lane / o.lanes) * 100}% + 2px)`,
                        width: `calc(${100 / o.lanes}% - 4px)`,
                        background: o.ev.color,
                        backgroundImage: o.cancelled
                          ? "repeating-linear-gradient(45deg, transparent 0 6px, rgba(0,0,0,.25) 6px 12px)"
                          : undefined,
                      }}
                      title={`${o.ev.title} ${o.ev.startTime}-${o.ev.endTime}`}
                    >
                      <div className={`font-semibold ${o.cancelled ? "line-through" : ""}`}>{o.ev.title}</div>
                      <div className="opacity-90">
                        {o.ev.startTime}–{o.ev.endTime}
                      </div>
                      {o.ev.location && height > 55 && <div className="opacity-80">{o.ev.location}</div>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-3 hidden text-xs text-zinc-500 md:block">
        Astuce : double-clique sur une colonne pour ajouter un cours ce jour-là. Clique sur un cours pour le modifier, le supprimer ou annuler uniquement ce jour.
      </p>

      {form && (
        <EventForm
          key={`${form.ev?.id ?? "new"}-${form.date}`}
          ev={form.ev}
          date={form.date}
          cancelled={form.ev ? cancelledSet.has(`${form.ev.id}|${form.date}`) : false}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}

function EventForm({
  ev,
  date,
  cancelled,
  onClose,
}: {
  ev: ScheduleEvent | null;
  date: string;
  cancelled: boolean;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [f, setF] = useState<EventInput>(
    ev
      ? { ...ev }
      : {
          title: "",
          category: "cours",
          color: CATEGORIES[0].color,
          startTime: "08:00",
          endTime: "09:00",
          location: "",
          notes: "",
          repeat: "weekly",
          daysOfWeek: [dow(date)],
          date,
          weekParity: "all",
          validFrom: null,
          validUntil: null,
        },
  );
  const [advanced, setAdvanced] = useState(Boolean(ev?.validFrom || ev?.validUntil));
  const set = <K extends keyof EventInput>(k: K, v: EventInput[K]) => setF((p) => ({ ...p, [k]: v }));

  const submit = (asNew = false) =>
    start(async () => {
      const res = await saveEvent(asNew ? { ...f, id: undefined } : { ...f, id: ev?.id });
      if (res.error) setError(res.error);
      else onClose();
    });

  return (
    <Modal open onClose={onClose} title={ev ? "Modifier" : "Nouvel événement"} wide>
      <div className="space-y-4">
        <div>
          <label className="label">Titre</label>
          <input className="input" autoFocus value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Maths, Conservatoire, Footing…" />
        </div>

        <div>
          <label className="label">Catégorie & couleur</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setF((p) => ({ ...p, category: c.id, color: c.color }))}
                className={`chip ${f.category === c.id ? "!border-amber-400 !text-amber-300" : ""}`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                {c.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => set("color", c)}
                className={`h-6 w-6 rounded-full border-2 ${f.color === c ? "border-white" : "border-transparent"}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Début</label>
            <input type="time" className="input" value={f.startTime} onChange={(e) => set("startTime", e.target.value)} />
          </div>
          <div>
            <label className="label">Fin</label>
            <input type="time" className="input" value={f.endTime} onChange={(e) => set("endTime", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Répétition</label>
          <div className="mb-2 flex gap-2">
            <button type="button" onClick={() => set("repeat", "weekly")} className={`btn btn-sm ${f.repeat === "weekly" ? "btn-primary" : "btn-ghost"}`}>
              Chaque semaine
            </button>
            <button type="button" onClick={() => set("repeat", "once")} className={`btn btn-sm ${f.repeat === "once" ? "btn-primary" : "btn-ghost"}`}>
              Une seule fois
            </button>
          </div>
          {f.repeat === "weekly" ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {DAY_LONG.map((name, i) => {
                  const d = i + 1;
                  const on = f.daysOfWeek.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => set("daysOfWeek", on ? f.daysOfWeek.filter((x) => x !== d) : [...f.daysOfWeek, d])}
                      className={`btn btn-sm ${on ? "btn-primary" : "btn-ghost"}`}
                    >
                      {name.slice(0, 3)}
                    </button>
                  );
                })}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => set("daysOfWeek", [1, 2, 3, 4, 5])}>
                  Lun–Ven
                </button>
              </div>
              <div className="mt-3">
                <label className="label">Semaines concernées</label>
                <div className="flex gap-2">
                  {(["all", "A", "B"] as const).map((p) => (
                    <button key={p} type="button" onClick={() => set("weekParity", p)} className={`btn btn-sm ${f.weekParity === p ? "btn-primary" : "btn-ghost"}`}>
                      {p === "all" ? "Toutes" : `Semaine ${p} seulement`}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <input type="date" className="input" value={f.date ?? ""} onChange={(e) => set("date", e.target.value)} />
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Lieu / salle</label>
            <input className="input" value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Salle 204" />
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Apporter le sax…" />
          </div>
        </div>

        <div>
          <button type="button" className="text-xs text-zinc-400 underline" onClick={() => setAdvanced(!advanced)}>
            {advanced ? "Masquer" : "Options avancées"} (période de validité)
          </button>
          {advanced && (
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <label className="label">À partir du</label>
                <input type="date" className="input" value={f.validFrom ?? ""} onChange={(e) => set("validFrom", e.target.value || null)} />
              </div>
              <div>
                <label className="label">Jusqu&apos;au</label>
                <input type="date" className="input" value={f.validUntil ?? ""} onChange={(e) => set("validUntil", e.target.value || null)} />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap gap-2">
            {ev && (
              <button
                className="btn btn-danger"
                disabled={pending}
                onClick={() => {
                  if (confirm("Supprimer cet événement pour toutes les semaines ?"))
                    start(async () => {
                      await deleteEvent(ev.id);
                      onClose();
                    });
                }}
              >
                Supprimer
              </button>
            )}
            {ev && ev.repeat === "weekly" && (
              <button
                className="btn btn-ghost"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    if (cancelled) await restoreOccurrence(ev.id, date);
                    else await cancelOccurrence(ev.id, date);
                    onClose();
                  })
                }
              >
                {cancelled ? `Rétablir le ${fmtShort(date)}` : `Annuler le ${fmtShort(date)} seulement`}
              </button>
            )}
            {ev && (
              <button className="btn btn-ghost" disabled={pending} onClick={() => submit(true)}>
                Dupliquer
              </button>
            )}
          </div>
          <button className="btn btn-primary" disabled={pending} onClick={() => submit(false)}>
            {pending ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
