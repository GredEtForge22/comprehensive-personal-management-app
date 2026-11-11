"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/charts";
import { deleteScore, deleteScoreImage, moveScoreImage, updateScore } from "@/app/actions/scores";
import { uploadScorePage } from "@/lib/image";

type Score = { id: number; title: string; composer: string; tags: string; notes: string };

export default function ScoreDetail({ score, imageIds }: { score: Score; imageIds: number[] }) {
  const router = useRouter();
  const [viewer, setViewer] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState<string>("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const addFiles = async (files: File[]) => {
    setError("");
    try {
      for (let i = 0; i < files.length; i++) {
        setUploading(`Envoi ${i + 1}/${files.length}…`);
        await uploadScorePage(score.id, files[i]);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur pendant l'envoi");
    } finally {
      setUploading("");
    }
  };

  return (
    <div>
      <Link href="/partitions" className="mb-2 inline-block text-sm text-zinc-400 hover:text-amber-300">
        ← Toutes les partitions
      </Link>
      <PageHeader title={score.title} icon="🎼" subtitle={score.composer || undefined}>
        {imageIds.length > 0 && (
          <button className="btn btn-primary" onClick={() => setViewer(0)}>
            📖 Mode lecture
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => input.current?.click()} disabled={Boolean(uploading)}>
          {uploading || "📸 Ajouter des pages"}
        </button>
        <button className="btn btn-ghost" onClick={() => setEditing(true)}>
          Modifier
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) void addFiles(files);
          }}
        />
      </PageHeader>

      {score.tags && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {score.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
            .map((t) => (
              <span key={t} className="chip">
                #{t}
              </span>
            ))}
        </div>
      )}
      {score.notes && <p className="mb-3 text-sm text-zinc-400">{score.notes}</p>}
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {imageIds.map((id, i) => (
          <div key={id} className="card overflow-hidden !p-0">
            <button className="block w-full bg-zinc-950" onClick={() => setViewer(i)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/score-images/${id}?t=thumb`} alt={`Page ${i + 1}`} loading="lazy" className="aspect-[3/4] w-full object-cover object-top" />
            </button>
            <div className="flex items-center justify-between gap-1 p-2 text-xs">
              <span className="text-zinc-400">Page {i + 1}</span>
              <div className="flex gap-1">
                <button className="btn btn-ghost btn-sm !px-2" disabled={pending || i === 0} onClick={() => start(() => moveScoreImage(score.id, id, -1))} aria-label="Monter">
                  ←
                </button>
                <button className="btn btn-ghost btn-sm !px-2" disabled={pending || i === imageIds.length - 1} onClick={() => start(() => moveScoreImage(score.id, id, 1))} aria-label="Descendre">
                  →
                </button>
                <button
                  className="btn btn-danger btn-sm !px-2"
                  disabled={pending}
                  onClick={() => {
                    if (confirm("Supprimer cette page ?")) start(() => deleteScoreImage(score.id, id));
                  }}
                  aria-label="Supprimer"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {imageIds.length === 0 && <div className="card text-center text-sm text-zinc-500">Aucune page. Ajoute des photos de ta partition 📸</div>}

      {viewer !== null && <Viewer ids={imageIds} start={viewer} title={score.title} onClose={() => setViewer(null)} />}
      {editing && (
        <EditMeta
          score={score}
          onClose={() => setEditing(false)}
          onDeleted={() => {
            router.push("/partitions");
          }}
        />
      )}
    </div>
  );
}

function Viewer({ ids, start, title, onClose }: { ids: number[]; start: number; title: string; onClose: () => void }) {
  const [i, setI] = useState(start);
  const [zoom, setZoom] = useState(1);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => Math.min(ids.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [ids.length, onClose]);

  useEffect(() => {
    box.current?.scrollTo({ top: 0, left: 0 });
  }, [i]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2 text-sm">
        <div className="min-w-0 truncate font-medium">
          {title} <span className="text-zinc-500">· page {i + 1}/{ids.length}</span>
        </div>
        <div className="flex gap-1.5">
          <button className="btn btn-ghost btn-sm" onClick={() => setZoom((z) => Math.max(1, z - 0.5))}>
            −
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setZoom((z) => Math.min(4, z + 0.5))}>
            +
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕ Fermer
          </button>
        </div>
      </div>
      <div ref={box} className="flex-1 overflow-auto bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/score-images/${ids[i]}`} alt={`Page ${i + 1}`} className="mx-auto block h-auto max-w-none bg-white" style={{ width: `${zoom * 100}%` }} />
      </div>
      <div className="flex items-center justify-between border-t border-zinc-800 p-2">
        <button className="btn btn-ghost" disabled={i === 0} onClick={() => setI(i - 1)}>
          ← Précédente
        </button>
        <button className="btn btn-primary" disabled={i === ids.length - 1} onClick={() => setI(i + 1)}>
          Suivante →
        </button>
      </div>
    </div>
  );
}

function EditMeta({ score, onClose, onDeleted }: { score: Score; onClose: () => void; onDeleted: () => void }) {
  const [pending, start] = useTransition();
  const [f, setF] = useState({ title: score.title, composer: score.composer, tags: score.tags, notes: score.notes });
  const [error, setError] = useState("");
  return (
    <Modal open onClose={onClose} title="Modifier la partition">
      <div className="space-y-4">
        <div>
          <label className="label">Titre</label>
          <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </div>
        <div>
          <label className="label">Compositeur</label>
          <input className="input" value={f.composer} onChange={(e) => setF({ ...f, composer: e.target.value })} />
        </div>
        <div>
          <label className="label">Tags (virgules)</label>
          <input className="input" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} />
        </div>
        <div>
          <label className="label">Notes (doigtés, tempo, consignes du prof…)</label>
          <textarea className="input min-h-20" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-between">
          <button
            className="btn btn-danger"
            disabled={pending}
            onClick={() => {
              if (confirm("Supprimer cette partition et toutes ses pages ?"))
                start(async () => {
                  await deleteScore(score.id);
                  onDeleted();
                });
            }}
          >
            Supprimer
          </button>
          <button
            className="btn btn-primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await updateScore(score.id, f);
                if (res.error) setError(res.error);
                else onClose();
              })
            }
          >
            Enregistrer
          </button>
        </div>
      </div>
    </Modal>
  );
}
