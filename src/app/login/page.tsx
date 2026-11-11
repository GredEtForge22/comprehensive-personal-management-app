"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form action={action} className="card w-full max-w-sm space-y-4 p-6">
        <div className="text-center">
          <div className="text-4xl">🎷</div>
          <h1 className="mt-2 text-xl font-semibold">Mon Planner</h1>
          <p className="text-sm text-zinc-400">Entre ton mot de passe pour continuer</p>
        </div>
        <input name="password" type="password" autoFocus required placeholder="Mot de passe" className="input" />
        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
        <button disabled={pending} className="btn btn-primary w-full">
          {pending ? "…" : "Entrer"}
        </button>
      </form>
    </main>
  );
}
