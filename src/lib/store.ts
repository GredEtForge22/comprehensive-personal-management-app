"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS, type Settings } from "./settings";

/** Un enregistrement : données propres + id + date ("" si aucune). */
export type Rec<T> = T & { id: number; date: string };

type State = { rows: Rec<Record<string, unknown>>[]; loaded: boolean; error: boolean };

const states = new Map<string, State>();
const loading = new Set<string>();
const listeners = new Set<() => void>();
const EMPTY: State = { rows: [], loaded: false, error: false };
// modifications faites sur un élément pas encore enregistré côté serveur
const pendingPatches = new Map<number, Record<string, unknown>>();

function emit() {
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function getState(kind: string): State {
  return states.get(kind) ?? EMPTY;
}
function setState(kind: string, next: Partial<State>) {
  states.set(kind, { ...getState(kind), ...next });
  emit();
}

async function load(kind: string, force = false) {
  if (loading.has(kind)) return;
  if (!force && getState(kind).loaded) return;
  loading.add(kind);
  try {
    const res = await fetch(`/api/items?kind=${kind}`);
    if (!res.ok) throw new Error(String(res.status));
    const rows = (await res.json()) as Rec<Record<string, unknown>>[];
    setState(kind, { rows, loaded: true, error: false });
  } catch {
    setState(kind, { loaded: true, error: true });
  } finally {
    loading.delete(kind);
  }
}

export function useItems<T extends object>(kind: string) {
  const state = useSyncExternalStore(
    subscribe,
    () => getState(kind),
    () => EMPTY,
  );
  useEffect(() => {
    void load(kind);
  }, [kind]);

  const add = useCallback(
    async (data: T, date = ""): Promise<Rec<T>> => {
      const tempId = -Math.floor(Math.random() * 1e9) - 1;
      const temp = { ...data, id: tempId, date } as Rec<T>;
      setState(kind, { rows: [...getState(kind).rows, temp as Rec<Record<string, unknown>>] });
      try {
        const res = await fetch(`/api/items?kind=${kind}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, date }),
        });
        if (!res.ok) throw new Error();
        const created = (await res.json()) as Rec<T>;
        const stillThere = getState(kind).rows.some((r) => r.id === tempId);
        if (!stillThere) {
          // supprimé localement avant la réponse du serveur
          void fetch(`/api/items/${created.id}`, { method: "DELETE" });
        } else {
          const patch = pendingPatches.get(tempId);
          pendingPatches.delete(tempId);
          const merged = { ...created, ...(patch ?? {}) } as Rec<Record<string, unknown>>;
          setState(kind, {
            rows: getState(kind).rows.map((r) => (r.id === tempId ? merged : r)),
          });
          if (patch) {
            void fetch(`/api/items/${created.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(patch),
            });
          }
        }
        return created;
      } catch {
        setState(kind, { rows: getState(kind).rows.filter((r) => r.id !== tempId) });
        throw new Error("Échec de l'enregistrement");
      }
    },
    [kind],
  );

  const update = useCallback(
    async (id: number, patch: Partial<T> & { date?: string }) => {
      const prev = getState(kind).rows;
      setState(kind, { rows: prev.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
      if (id < 0) {
        pendingPatches.set(id, { ...(pendingPatches.get(id) ?? {}), ...patch });
        return;
      }
      try {
        const res = await fetch(`/api/items/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error();
      } catch {
        setState(kind, { rows: prev });
      }
    },
    [kind],
  );

  const remove = useCallback(
    async (id: number) => {
      const prev = getState(kind).rows;
      setState(kind, { rows: prev.filter((r) => r.id !== id) });
      if (id < 0) return;
      try {
        const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        // les suppressions en cascade côté serveur : on recharge les types liés
        if (kind === "habit") void load("habitcheck", true);
        if (kind === "course") void load("cancel", true);
        if (kind === "subject") {
          void load("chapter", true);
          void load("card", true);
          void load("grade", true);
        }
      } catch {
        setState(kind, { rows: prev });
      }
    },
    [kind],
  );

  return {
    items: state.rows as Rec<T>[],
    loaded: state.loaded,
    error: state.error,
    add,
    update,
    remove,
    reload: () => load(kind, true),
  };
}

// ---------- Réglages ----------
let settingsState: Settings = DEFAULT_SETTINGS;
let settingsLoaded = false;
let settingsLoading = false;

async function loadSettings() {
  if (settingsLoaded || settingsLoading) return;
  settingsLoading = true;
  try {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const v = (await res.json()) as Partial<Settings>;
      settingsState = { ...DEFAULT_SETTINGS, ...v };
    }
    settingsLoaded = true;
  } catch {
    /* garde les valeurs par défaut */
  } finally {
    settingsLoading = false;
    emit();
  }
}

export function useSettings() {
  const s = useSyncExternalStore(
    subscribe,
    () => settingsState,
    () => DEFAULT_SETTINGS,
  );
  useEffect(() => {
    void loadSettings();
  }, []);
  const set = useCallback(async (patch: Partial<Settings>) => {
    settingsState = { ...settingsState, ...patch };
    emit();
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => undefined);
  }, []);
  return { settings: s, set };
}
