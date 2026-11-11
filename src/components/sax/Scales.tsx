"use client";

import { useMemo, useState } from "react";
import { Field, Loading, Modal, NumInput } from "@/components/ui";
import { diffDays, fmtDate, todayStr } from "@/lib/dates";
import { KEYS, SCALE_TYPES, scaleId, scaleStats } from "@/lib/sax";
import { useItems } from "@/lib/store";
import type { SaxSession, ScaleQuick } from "@/lib/types";

export default function Scales() {
  const sessions = useItems<SaxSession>("sax");
  const quick = useItems<ScaleQuick>("scalelog");
  const [sel, setSel] = useState<{ key: string; type: string } | null>(null);
  const [tempo, setTempo] = useState(0);
  const today = todayStr();
  const stats = useMemo(() => scaleStats(sessions.items, quick.items), [sessions.items, quick.items]);

  if (!sessions.loaded || !quick.loaded) return <Loading />;

  const cellColor = (last?: string) => {
    if (!last) return "#27272a";
    const d = diffDays(last, today);
    if (d <= 7) return "#10b981";
    if (d <= 21) return "#eab308";
    return "#f97316";
  };

  const total = KEYS.length * SCALE_TYPES.length;
  const done = stats.size;
  const toRevisit = [...stats.entries()]
    .map(([id, s]) => ({ id, ...s, age: diffDays(s.last, today) }))
    .filter((s) => s.age > 21)
    .sort((a, b) => b.age - a.age)
    .slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">Carte des gammes</h3>
            <p className="text-xs text-zinc-500">Tonalités écrites. Clique sur une case pour noter un passage (tempo ♩).</p>
          </div>
          <div className="text-sm text-zinc-300">
            {done}/{total} explorées
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-3 text-xs text-zinc-400">
          {[
            ["#27272a", "jamais"],
            ["#10b981", "< 7 jours"],
            ["#eab308", "< 3 semaines"],
            ["#f97316", "à revoir"],
          ].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded" style={{ background: c }} /> {l}
            </span>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-1 text-center text-[11px]">
            <thead>
              <tr>
                <th />
                {KEYS.map((k) => (
                  <th key={k} className="w-11 font-medium text-zinc-400">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCALE_TYPES.map((t) => (
                <tr key={t}>
                  <td className="pr-2 text-right whitespace-nowrap text-zinc-300">{t}</td>
                  {KEYS.map((k) => {
                    const s = stats.get(scaleId(k, t));
                    return (
                      <td key={k}>
                        <button
                          title={s ? `${k} ${t} — dernière fois ${fmtDate(s.last)} · ${s.count}×` : `${k} ${t}`}
                          onClick={() => {
                            setSel({ key: k, type: t });
                            setTempo(s?.best ?? 0);
                          }}
                          className="h-8 w-11 cursor-pointer rounded-md text-[10px] font-semibold text-zinc-950 transition hover:brightness-125"
                          style={{ background: cellColor(s?.last), color: s ? "#09090b" : "#52525b" }}
                        >
                          {s?.best ? s.best : "·"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toRevisit.length > 0 && (
        <div className="card">
          <h3 className="mb-2 font-semibold">À revoir</h3>
          <div className="flex flex-wrap gap-2">
            {toRevisit.map((s) => {
              const [k, t] = s.id.split("|");
              return (
                <button key={s.id} className="chip" onClick={() => { setSel({ key: k, type: t }); setTempo(s.best); }}>
                  {k} {t} · il y a {s.age} j
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Modal open={!!sel} onClose={() => setSel(null)} title={sel ? `${sel.key} ${sel.type}` : ""}>
        {sel && (
          <div className="space-y-3">
            {stats.get(scaleId(sel.key, sel.type)) && (
              <p className="text-sm text-zinc-400">
                Meilleur tempo : <b className="text-zinc-100">♩ = {stats.get(scaleId(sel.key, sel.type))!.best}</b> · travaillée{" "}
                {stats.get(scaleId(sel.key, sel.type))!.count}× · dernière fois {fmtDate(stats.get(scaleId(sel.key, sel.type))!.last)}
              </p>
            )}
            <Field label="Tempo travaillé aujourd'hui (♩ =)">
              <NumInput value={tempo} onChange={setTempo} />
            </Field>
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setSel(null)}>
                Fermer
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  await quick.add({ key: sel.key, type: sel.type, tempo }, today);
                  setSel(null);
                }}
              >
                Noter aujourd&apos;hui
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
