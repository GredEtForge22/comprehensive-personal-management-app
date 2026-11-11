"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/charts";
import { createScore } from "@/app/actions/scores";
import { uploadScorePage } from "@/lib/image";

type ScoreCard = { id: number; title: string; composer: string; tags: string; pages: number; coverId: number | null };

export default function ScoresView({ scores }: { scores: ScoreCard[] }) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);

  const filtered = scores.filter((s) => `${s.title} ${s.composer} ${s.tags}`.toLowerCase().includes(q.toLowerCase()));
  const allTags = [...new Set(scores.flatMap((s) => s.tags.split(",").map((t) => t.trim()).filter(Boolean)))];

  return (
    <div>
      <PageHeader title="Partitions" icon="🎼" subtitle={`${scores.length} partition(s) stockée(s)`}>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          + Ajouter une partition
        </button>
      </PageHeader>

      <input className="input mb-3" placeholder="Rechercher un titre, un compositeur, un tag…" value={q} onChange={(e) => setQ(e.target.value)} />
      {allTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {allTags.map((t) => (
            <button key={t} className={`chip ${q === t ? "!border-amber-400 !text-amber-300" : ""}`} onClick={() => setQ(q === t ? "" : t)}>
              #{t}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((s) => (
          <Link key={s.id} href={`/partitions/${s.id}`} className="card group overflow-hidden !p-0 transition hover:border-amber-400/60">
            <div className="grid aspect-[3/4] place-items-center bg-zinc-950">
              {s.coverId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/score-images/${s.coverId}?t=thumb`} alt={s.title} loading="lazy" className="h-full w-full object-cover object-top" />
              ) : (
                <span className="text-4xl opacity-40">🎼</span>
              )}
            </div>
            <div className="p-3">
              <div className="truncate text-sm font-medium group-hover:text-amber-300">{s.title}</div>
              <div className="truncate text-xs text-zinc-400">{s.composer || "—"}</div>
              <div className="mt-1 text-[11px] text-zinc-500">{s.pages} page(s)</div>
            </div>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="card text-center text-sm text-zinc-500">
          {scores.length === 0 ? "Prends en photo tes partitions pour les avoir toujours sur toi 📸" : "Aucun résultat."}
        </div>
      )}

      {adding && <AddScore onClose={() => setAdding(false)} />}
    </div>
  );
}

function AddScore({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [composer, setComposer] = useState("");
  const [tags, setTags] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await createScore({ title, composer, tags, notes: "" });
      if (!res.id) {
        setError(res.error ?? "Erreur");
        setBusy(false);
        return;
      }
      for (let i = 0; i < files.length; i++) {
        setProgress(i + 1);
        await uploadScorePage(res.id, files[i]);
      }
      router.push(`/partitions/${res.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur pendant l'envoi");
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={busy ? () => {} : onClose} title="Nouvelle partition">
      <div className="space-y-4">
        <div>
          <label className="label">Titre</label>
          <input className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Scaramouche – mvt 1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Compositeur</label>
            <input className="input" value={composer} onChange={(e) => setComposer(e.target.value)} placeholder="Milhaud" />
          </div>
          <div>
            <label className="label">Tags (séparés par des virgules)</label>
            <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="classique, concours" />
          </div>
        </div>
        <div>
          <label className="label">Photos / scans des pages</label>
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])])}
          />
          <button className="btn btn-ghost w-full" onClick={() => input.current?.click()} disabled={busy}>
            📸 Prendre / choisir des photos
          </button>
          {files.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-zinc-400">
              {files.map((f, i) => (
                <li key={i} className="flex justify-between">
                  <span className="truncate">
                    {i + 1}. {f.name}
                  </span>
                  <button className="text-red-300" onClick={() => setFiles(files.filter((_, j) => j !== i))} disabled={busy}>
                    retirer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {busy && (
          <p className="text-sm text-amber-300">
            Envoi en cours… {progress}/{files.length}
          </p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end">
          <button className="btn btn-primary" disabled={busy || !title.trim()} onClick={submit}>
            {busy ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
