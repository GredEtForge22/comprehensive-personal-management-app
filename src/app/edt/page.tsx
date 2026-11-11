"use client";

import { useMemo, useState } from "react";
import { Field, Loading, Modal, PageHeader, ColorPicker, confirmDelete } from "@/components/ui";
import {
  DAYS,
  DAYS_SHORT,
  addDays,
  fmtDate,
  fmtLong,
  toMin,
  todayStr,
  weekDates,
  weekLabel,
  weekType,
} from "@/lib/dates";
import { COLORS, eventsForDay, type DayEvent } from "@/lib/schedule";
import { useItems, useSettings } from "@/lib/store";
import type { Cancel, Course, OneOff } from "@/lib/types";

type FormState = {
  id?: number;
  mode: "course" | "event";
  title: string;
  days: number[];
  start: string;
  end: string;
  room: string;
  teacher: string;
  color: string;
  weeks: "all" | "A" | "B";
  validFrom: string;
  validTo: string;
  date: string;
  note: string;
};

const HOUR_PX = 52;

const emptyForm = (date: string): FormState => ({
  mode: "course",
  title: "",
  days: [],
  start: "08:00",
  end: "09:00",
  room: "",
  teacher: "",
  color: COLORS[5],
  weeks: "all",
  validFrom: "",
  validTo: "",
  date,
  note: "",
});

function layout(events: DayEvent[]) {
  const lanes: number[] = [];
  const placed = events.map((e) => {
    const s = toMin(e.start);
    let lane = lanes.findIndex((end) => end <= s);
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(0);
    }
    lanes[lane] = toMin(e.end);
    return { e, lane };
  });
  return { placed, count: Math.max(1, lanes.length) };
}

export default function EdtPage() {
  const { settings, set } = useSettings();
  const courses = useItems<Course>("course");
  const events = useItems<OneOff>("event");
  const cancels = useItems<Cancel>("cancel");
  const [day, setDay] = useState(todayStr());
  const [sel, setSel] = useState<{ ev: DayEvent; date: string } | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const today = todayStr();
  const parity = settings.weekAParity;

  const week = weekDates(day);
  const wt = weekType(day, parity);

  const perDay = useMemo(
    () => week.map((d) => eventsForDay(d, courses.items, events.items, cancels.items, parity)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [day, courses.items, events.items, cancels.items, parity],
  );

  const all = perDay.flat();
  const startH = Math.min(8, ...all.map((e) => Math.floor(toMin(e.start) / 60)));
  const endH = Math.max(17, ...all.map((e) => Math.ceil(toMin(e.end) / 60)));
  const hours = Array.from({ length: endH - startH }, (_, i) => startH + i);

  function openEdit(ev: DayEvent) {
    if (ev.source === "course") {
      const c = courses.items.find((x) => x.id === ev.id);
      if (!c) return;
      setForm({
        id: c.id,
        mode: "course",
        title: c.title,
        days: c.days,
        start: c.start,
        end: c.end,
        room: c.room ?? "",
        teacher: c.teacher ?? "",
        color: c.color,
        weeks: c.weeks,
        validFrom: c.validFrom ?? "",
        validTo: c.validTo ?? "",
        date: today,
        note: "",
      });
    } else {
      const e = events.items.find((x) => x.id === ev.id);
      if (!e) return;
      setForm({
        ...emptyForm(e.date),
        id: e.id,
        mode: "event",
        title: e.title,
        start: e.start,
        end: e.end,
        room: e.room ?? "",
        color: e.color,
        note: e.note ?? "",
      });
    }
    setSel(null);
  }

  function duplicate(ev: DayEvent, date: string) {
    openEdit(ev);
    setForm((f) => (f ? { ...f, id: undefined, title: f.title + " (copie)", date } : f));
  }

  async function save() {
    if (!form || !form.title.trim()) return;
    if (toMin(form.end) <= toMin(form.start)) {
      alert("L'heure de fin doit être après le début.");
      return;
    }
    if (form.mode === "course") {
      if (!form.days.length) {
        alert("Choisis au moins un jour.");
        return;
      }
      const data: Course = {
        title: form.title.trim(),
        days: [...form.days].sort(),
        start: form.start,
        end: form.end,
        room: form.room || undefined,
        teacher: form.teacher || undefined,
        color: form.color,
        weeks: form.weeks,
        validFrom: form.validFrom || undefined,
        validTo: form.validTo || undefined,
      };
      if (form.id) await courses.update(form.id, data);
      else await courses.add(data);
    } else {
      const data: OneOff = {
        title: form.title.trim(),
        start: form.start,
        end: form.end,
        room: form.room || undefined,
        color: form.color,
        note: form.note || undefined,
      };
      if (form.id) await events.update(form.id, { ...data, date: form.date });
      else await events.add(data, form.date);
    }
    setForm(null);
  }

  const dayEvents = perDay[week.indexOf(day)] ?? [];

  const Block = ({ ev, date, compact }: { ev: DayEvent; date: string; compact?: boolean }) => (
    <button
      onClick={() => setSel({ ev, date })}
      className={`w-full cursor-pointer overflow-hidden rounded-lg border-l-4 px-2 py-1 text-left text-xs transition hover:brightness-125 ${ev.cancelled ? "opacity-40" : ""}`}
      style={{ background: ev.color + "30", borderColor: ev.color }}
    >
      <div className={`font-semibold ${ev.cancelled ? "line-through" : ""}`}>{ev.title}</div>
      {!compact && (
        <div className="text-[10px] text-zinc-300">
          {ev.start}–{ev.end}
          {ev.room ? ` · ${ev.room}` : ""}
        </div>
      )}
    </button>
  );

  return (
    <div>
      <PageHeader
        title="Emploi du temps"
        sub={
          <>
            <span className="hidden md:inline">{weekLabel(day)}</span>
            <span className="md:hidden">{fmtLong(day)}</span> ·{" "}
            <button
              className="font-semibold text-amber-300 underline decoration-dotted"
              title="Cliquer pour inverser A/B"
              onClick={() => set({ weekAParity: 1 - parity })}
            >
              Semaine {wt}
            </button>
          </>
        }
        actions={
          <>
            <button className="btn hidden md:inline-flex" onClick={() => setDay(addDays(day, -7))}>
              ←
            </button>
            <button className="btn md:hidden" onClick={() => setDay(addDays(day, -1))}>
              ←
            </button>
            <button className="btn" onClick={() => setDay(today)}>
              Aujourd&apos;hui
            </button>
            <button className="btn hidden md:inline-flex" onClick={() => setDay(addDays(day, 7))}>
              →
            </button>
            <button className="btn md:hidden" onClick={() => setDay(addDays(day, 1))}>
              →
            </button>
            <button className="btn btn-primary" onClick={() => setForm(emptyForm(day))}>
              + Ajouter
            </button>
          </>
        }
      />

      {!courses.loaded || !events.loaded ? (
        <Loading />
      ) : (
        <>
          {/* Mobile : un jour à la fois */}
          <div className="md:hidden">
            <div className="mb-4 flex gap-1">
              {week.map((d, i) => (
                <button
                  key={d}
                  onClick={() => setDay(d)}
                  className={`flex-1 rounded-xl py-2 text-center text-xs ${
                    d === day ? "bg-amber-400 font-bold text-zinc-950" : d === today ? "bg-zinc-800 text-amber-300" : "bg-zinc-900 text-zinc-400"
                  }`}
                >
                  <div>{DAYS_SHORT[i]}</div>
                  <div className="text-base font-semibold">{Number(d.slice(8))}</div>
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {dayEvents.length === 0 && <div className="card text-center text-sm text-zinc-500">Rien de prévu ce jour 🎉</div>}
              {dayEvents.map((ev) => (
                <div key={ev.key} className="flex gap-3">
                  <div className="w-12 shrink-0 pt-1 text-right text-xs text-zinc-400">
                    <div className="font-semibold text-zinc-200">{ev.start}</div>
                    <div>{ev.end}</div>
                  </div>
                  <div className="flex-1">
                    <Block ev={ev} date={day} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop : semaine */}
          <div className="card hidden overflow-x-auto !p-0 md:block">
            <div className="grid min-w-[720px]" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
              <div className="border-b border-zinc-800" />
              {week.map((d, i) => (
                <div
                  key={d}
                  className={`border-b border-l border-zinc-800 py-2 text-center text-sm ${d === today ? "bg-amber-400/10 text-amber-300" : "text-zinc-300"}`}
                >
                  <div className="font-semibold">{DAYS[i]}</div>
                  <div className="text-xs text-zinc-500">{fmtDate(d)}</div>
                </div>
              ))}
              <div className="relative" style={{ height: hours.length * HOUR_PX }}>
                {hours.map((h, i) => (
                  <div key={h} className="absolute right-1 text-[10px] text-zinc-500" style={{ top: i * HOUR_PX - 6 }}>
                    {i > 0 && `${h}h`}
                  </div>
                ))}
              </div>
              {week.map((d, i) => {
                const { placed, count } = layout(perDay[i]);
                return (
                  <div
                    key={d}
                    className={`relative border-l border-zinc-800 ${d === today ? "bg-amber-400/[0.03]" : ""}`}
                    style={{ height: hours.length * HOUR_PX }}
                    onDoubleClick={() => setForm({ ...emptyForm(d), mode: "event" })}
                  >
                    {hours.map((h, k) => (
                      <div key={h} className="absolute inset-x-0 border-t border-zinc-800/70" style={{ top: k * HOUR_PX }} />
                    ))}
                    {placed.map(({ e, lane }) => {
                      const top = ((toMin(e.start) - startH * 60) / 60) * HOUR_PX;
                      const h = ((toMin(e.end) - toMin(e.start)) / 60) * HOUR_PX;
                      return (
                        <div
                          key={e.key}
                          className="absolute px-0.5"
                          style={{ top, height: h - 2, left: `${(lane / count) * 100}%`, width: `${100 / count}%` }}
                        >
                          <div className="h-full">
                            <Block ev={e} date={d} compact={h < 40} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          <p className="mt-3 hidden text-xs text-zinc-500 md:block">
            Clique sur un cours pour le modifier, le dupliquer ou annuler un seul jour. Double-clic sur un jour : événement ponctuel.
          </p>
        </>
      )}

      {/* Détails */}
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.ev.title ?? ""}>
        {sel && (
          <div className="space-y-4">
            <div className="rounded-xl border-l-4 bg-zinc-800/60 p-3 text-sm" style={{ borderColor: sel.ev.color }}>
              <div className="capitalize">{fmtLong(sel.date)}</div>
              <div className="text-zinc-300">
                {sel.ev.start} – {sel.ev.end}
              </div>
              {sel.ev.room && <div className="text-zinc-400">Salle : {sel.ev.room}</div>}
              {sel.ev.teacher && <div className="text-zinc-400">Prof : {sel.ev.teacher}</div>}
              {sel.ev.note && <div className="mt-1 text-zinc-400">{sel.ev.note}</div>}
              {sel.ev.cancelled && <div className="mt-1 font-semibold text-red-400">Annulé ce jour-là</div>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn" onClick={() => openEdit(sel.ev)}>
                ✏️ Modifier
              </button>
              <button className="btn" onClick={() => duplicate(sel.ev, sel.date)}>
                📋 Dupliquer
              </button>
              {sel.ev.source === "course" &&
                (sel.ev.cancelled ? (
                  <button
                    className="btn"
                    onClick={() => {
                      if (sel.ev.cancelId) void cancels.remove(sel.ev.cancelId);
                      setSel(null);
                    }}
                  >
                    ↩️ Rétablir ce jour
                  </button>
                ) : (
                  <button
                    className="btn"
                    onClick={() => {
                      void cancels.add({ courseId: sel.ev.id }, sel.date);
                      setSel(null);
                    }}
                  >
                    🚫 Annuler ce jour seulement
                  </button>
                ))}
              <button
                className="btn btn-danger"
                onClick={() => {
                  if (!confirmDelete(sel.ev.source === "course" ? "Supprimer ce cours pour toutes les semaines ?" : "Supprimer cet événement ?")) return;
                  if (sel.ev.source === "course") void courses.remove(sel.ev.id);
                  else void events.remove(sel.ev.id);
                  setSel(null);
                }}
              >
                🗑️ Supprimer{sel.ev.source === "course" ? " (tout)" : ""}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Formulaire */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Modifier" : form?.mode === "event" ? "Événement ponctuel" : "Nouveau cours"}
      >
        {form && (
          <div className="space-y-3">
            {!form.id && (
              <div className="flex gap-2">
                {(["course", "event"] as const).map((m) => (
                  <button
                    key={m}
                    className={`chip ${form.mode === m ? "chip-on" : ""}`}
                    onClick={() => setForm({ ...form, mode: m })}
                  >
                    {m === "course" ? "🔁 Récurrent" : "📌 Ponctuel"}
                  </button>
                ))}
              </div>
            )}
            <Field label="Titre">
              <input className="input" autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Maths, Sax, Orchestre…" />
            </Field>
            {form.mode === "course" ? (
              <Field label="Jours (plusieurs possibles)">
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((d, i) => (
                    <button
                      key={d}
                      className={`chip ${form.days.includes(i) ? "chip-on" : ""}`}
                      onClick={() =>
                        setForm({ ...form, days: form.days.includes(i) ? form.days.filter((x) => x !== i) : [...form.days, i] })
                      }
                    >
                      {DAYS_SHORT[i]}
                    </button>
                  ))}
                </div>
              </Field>
            ) : (
              <Field label="Date">
                <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Début">
                <input type="time" className="input" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
              </Field>
              <Field label="Fin">
                <input type="time" className="input" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
              </Field>
              <Field label="Salle">
                <input className="input" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
              </Field>
              {form.mode === "course" && (
                <Field label="Prof">
                  <input className="input" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} />
                </Field>
              )}
            </div>
            {form.mode === "event" && (
              <Field label="Note">
                <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </Field>
            )}
            <Field label="Couleur">
              <ColorPicker colors={COLORS} value={form.color} onChange={(c) => setForm({ ...form, color: c })} />
            </Field>
            {form.mode === "course" && (
              <>
                <Field label="Semaines">
                  <div className="flex gap-2">
                    {([
                      ["all", "Toutes"],
                      ["A", "Semaine A"],
                      ["B", "Semaine B"],
                    ] as const).map(([v, l]) => (
                      <button key={v} className={`chip ${form.weeks === v ? "chip-on" : ""}`} onClick={() => setForm({ ...form, weeks: v })}>
                        {l}
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Valable à partir du">
                    <input type="date" className="input" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
                  </Field>
                  <Field label="Jusqu'au">
                    <input type="date" className="input" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
                  </Field>
                </div>
              </>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn btn-ghost" onClick={() => setForm(null)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={save} disabled={!form.title.trim()}>
                Enregistrer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
