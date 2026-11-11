"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Empty, Field, Loading, Modal, PageHeader, confirmDelete } from "@/components/ui";

type Score = { id: number; title: string; tags: string; pos: number; thumb: string };

function readFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => reject(new Error("Image illisible"));
    img.src = url;
  });
}

function resize(img: HTMLImageElement, max: number, quality: number): string {
  const ratio = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * ratio);
  const h = Math.round(img.naturalHeight * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

const tagList = (t: string) => t.split(",").map((x) => x.trim()).filter(Boolean);

export default function PartitionsPage() {
  const [scores, setScores] = useState<Score[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [reorder, setReorder] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [edit, setEdit] = useState<Score | null>(null);
  const [upload, setUpload] = useState<{ files: File[]; title: string; tags: string; busy: boolean; done: number } | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/scores");
      if (res.ok) setScores(await res.json());
    } finally {
      setLoaded(true);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const allTags = useMemo(() => [...new Set(scores.flatMap((s) => tagList(s.tags)))].sort(), [scores]);
  const filtered = scores.filter((s) => {
    const hay = (s.title + " " + s.tags).toLowerCase();
    return (!q || hay.includes(q.toLowerCase())) && (!tag || tagList(s.tags).includes(tag));
  });
  const filtering = !!q || !!tag;

  async function doUpload() {
    if (!upload) return;
    setUpload({ ...upload, busy: true, done: 0 });
    setError("");
    try {
      for (let i = 0; i < upload.files.length; i++) {
        const file = upload.files[i];
        const img = await readFile(file);
        const thumb = resize(img, 360, 0.7);
        const image = resize(img, 1600, 0.72);
        const base = upload.title.trim() || file.name.replace(/\.[^.]+$/, "");
        const title = upload.files.length > 1 && upload.title.trim() ? `${base} (${i + 1})` : base;
        const res = await fetch("/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, tags: upload.tags, thumb, image }),
        });
        if (!res.ok) throw new Error("Échec de l'envoi");
        setUpload((u) => (u ? { ...u, done: i + 1 } : u));
      }
      setUpload(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setUpload((u) => (u ? { ...u, busy: false } : u));
    }
  }

  async function move(id: number, dir: -1 | 1) {
    const ids = scores.map((s) => s.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setScores(ids.map((x) => scores.find((s) => s.id === x)!));
    await fetch("/api/scores", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: ids }),
    });
  }

  async function saveEdit() {
    if (!edit) return;
    setScores(scores.map((s) => (s.id === edit.id ? edit : s)));
    await fetch(`/api/scores/${edit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: edit.title, tags: edit.tags }),
    });
    setEdit(null);
  }

  async function del(id: number) {
    if (!confirmDelete("Supprimer cette partition ?")) return;
    setScores(scores.filter((s) => s.id !== id));
    setViewer(null);
    await fetch(`/api/scores/${id}`, { method: "DELETE" });
  }

  const viewIndex = viewer !== null ? filtered.findIndex((s) => s.id === viewer) : -1;

  return (
    <div>
      <PageHeader
        title="Partitions"
        sub="Prends tes partitions en photo : elles sont réduites puis stockées dans ta base."
        actions={
          <>
            <button className={`btn ${reorder ? "btn-primary" : ""}`} onClick={() => setReorder(!reorder)} disabled={filtering}>
              ↔️ Réordonner
            </button>
            <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
              📷 Ajouter
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                if (files.length) setUpload({ files, title: "", tags: "", busy: false, done: 0 });
                e.target.value = "";
              }}
            />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className="input max-w-xs" placeholder="🔍 Rechercher (titre, tag)…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className={`chip ${tag === "" ? "chip-on" : ""}`} onClick={() => setTag("")}>
          Tout
        </button>
        {allTags.map((t) => (
          <button key={t} className={`chip ${tag === t ? "chip-on" : ""}`} onClick={() => setTag(tag === t ? "" : t)}>
            #{t}
          </button>
        ))}
      </div>

      {!loaded ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <Empty>{scores.length === 0 ? "Aucune partition. Appuie sur « Ajouter » pour prendre une photo ou choisir des images 🎼" : "Aucun résultat."}</Empty>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.map((s, i) => (
            <div key={s.id} className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
              <button className="block w-full cursor-pointer" onClick={() => setViewer(s.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.thumb} alt={s.title} className="aspect-[3/4] w-full object-cover" loading="lazy" />
              </button>
              <div className="p-2.5">
                <div className="truncate text-sm font-medium">{s.title || "Sans titre"}</div>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {tagList(s.tags).map((t) => (
                    <span key={t} className="text-[10px] text-amber-300/80">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
              {reorder && (
                <div className="absolute top-2 right-2 left-2 flex justify-between">
                  <button className="btn btn-sm !bg-black/70" disabled={i === 0} onClick={() => move(s.id, -1)}>
                    ◀
                  </button>
                  <button className="btn btn-sm !bg-black/70" disabled={i === filtered.length - 1} onClick={() => move(s.id, 1)}>
                    ▶
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {viewIndex >= 0 && (
        <Viewer
          key={filtered[viewIndex].id}
          score={filtered[viewIndex]}
          index={viewIndex}
          total={filtered.length}
          onPrev={() => viewIndex > 0 && setViewer(filtered[viewIndex - 1].id)}
          onNext={() => viewIndex < filtered.length - 1 && setViewer(filtered[viewIndex + 1].id)}
          onClose={() => setViewer(null)}
          onEdit={() => setEdit(filtered[viewIndex])}
          onDelete={() => del(filtered[viewIndex].id)}
        />
      )}

      <Modal open={!!upload} onClose={() => !upload?.busy && setUpload(null)} title={`Ajouter ${upload?.files.length ?? 0} photo(s)`}>
        {upload && (
          <div className="space-y-3">
            <Field label="Titre (sinon : nom du fichier)">
              <input className="input" value={upload.title} onChange={(e) => setUpload({ ...upload, title: e.target.value })} placeholder="Autumn Leaves – alto" />
            </Field>
            <Field label="Tags (séparés par des virgules)">
              <input className="input" value={upload.tags} onChange={(e) => setUpload({ ...upload, tags: e.target.value })} placeholder="jazz, standard, orchestre" />
            </Field>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex items-center justify-end gap-2">
              {upload.busy && (
                <span className="text-sm text-zinc-400">
                  {upload.done}/{upload.files.length}…
                </span>
              )}
              <button className="btn btn-ghost" disabled={upload.busy} onClick={() => setUpload(null)}>
                Annuler
              </button>
              <button className="btn btn-primary" disabled={upload.busy} onClick={doUpload}>
                {upload.busy ? "Envoi…" : "Enregistrer"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <div className="relative z-[60]">
        <Modal open={!!edit} onClose={() => setEdit(null)} title="Modifier la partition">
          {edit && (
            <div className="space-y-3">
              <Field label="Titre">
                <input className="input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
              </Field>
              <Field label="Tags (virgules)">
                <input className="input" value={edit.tags} onChange={(e) => setEdit({ ...edit, tags: e.target.value })} />
              </Field>
              <div className="flex justify-end gap-2">
                <button className="btn btn-ghost" onClick={() => setEdit(null)}>
                  Annuler
                </button>
                <button className="btn btn-primary" onClick={saveEdit}>
                  Enregistrer
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}

function Viewer({
  score,
  index,
  total,
  onPrev,
  onNext,
  onClose,
  onEdit,
  onDelete,
}: {
  score: Score;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [z, setZ] = useState({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ dist: number; scale: number } | null>(null);

  const clamp = (s: number) => Math.min(6, Math.max(1, s));
  const zoomTo = (s: number) => setZ((p) => ({ scale: clamp(s), x: clamp(s) === 1 ? 0 : p.x, y: clamp(s) === 1 ? 0 : p.y }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "+") setZ((p) => ({ ...p, scale: clamp(p.scale + 0.5) }));
      if (e.key === "-") setZ((p) => ({ scale: clamp(p.scale - 0.5), x: p.scale <= 1.5 ? 0 : p.x, y: p.scale <= 1.5 ? 0 : p.y }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const dist = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between gap-2 bg-zinc-950/90 px-3 py-2 text-sm">
        <div className="min-w-0">
          <div className="truncate font-semibold">{score.title || "Sans titre"}</div>
          <div className="text-xs text-zinc-500">
            {index + 1} / {total}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button className="btn btn-sm" onClick={() => zoomTo(z.scale - 0.5)}>
            −
          </button>
          <button className="btn btn-sm" onClick={() => zoomTo(1)}>
            {Math.round(z.scale * 100)}%
          </button>
          <button className="btn btn-sm" onClick={() => zoomTo(z.scale + 0.5)}>
            +
          </button>
          <button className="btn btn-sm" onClick={onEdit}>
            ✏️
          </button>
          <button className="btn btn-sm btn-danger" onClick={onDelete}>
            🗑️
          </button>
          <button className="btn btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>
      <div
        className="relative flex-1 touch-none overflow-hidden select-none"
        onWheel={(e) => zoomTo(z.scale + (e.deltaY < 0 ? 0.25 : -0.25))}
        onDoubleClick={() => zoomTo(z.scale > 1 ? 1 : 2.5)}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2) last.current = { dist: dist(), scale: z.scale };
        }}
        onPointerMove={(e) => {
          const prev = pointers.current.get(e.pointerId);
          if (!prev) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2 && last.current) {
            zoomTo(last.current.scale * (dist() / last.current.dist));
          } else if (pointers.current.size === 1 && z.scale > 1) {
            const dx = e.clientX - prev.x;
            const dy = e.clientY - prev.y;
            setZ((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
          }
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          last.current = null;
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          last.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/scores/${score.id}/image`}
          alt={score.title}
          draggable={false}
          className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
          style={{ transform: `translate(${z.x}px, ${z.y}px) scale(${z.scale})`, transition: pointers.current.size ? "none" : "transform 0.12s" }}
        />
        {index > 0 && (
          <button className="btn absolute top-1/2 left-2 -translate-y-1/2 !bg-black/60" onClick={onPrev}>
            ◀
          </button>
        )}
        {index < total - 1 && (
          <button className="btn absolute top-1/2 right-2 -translate-y-1/2 !bg-black/60" onClick={onNext}>
            ▶
          </button>
        )}
      </div>
    </div>
  );
}
