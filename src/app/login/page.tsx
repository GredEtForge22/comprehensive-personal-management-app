"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.href = "/";
    } else {
      setError("Mot de passe incorrect");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-24 max-w-sm">
      <form onSubmit={submit} className="card space-y-4 !p-6">
        <div className="text-center">
          <div className="text-5xl">🎷</div>
          <h1 className="mt-2 text-xl font-bold">Connexion</h1>
        </div>
        <input
          className="input"
          type="password"
          autoFocus
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy || !password}>
          Entrer
        </button>
      </form>
    </div>
  );
}
