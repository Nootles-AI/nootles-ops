"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { adminApi } from "@/lib/api";
import { useSession } from "@/lib/session";

/**
 * The door. No token → the login form; a token → validated against the
 * deployment before anything renders. Every admin function re-checks the
 * token server-side — this only decides what to show.
 */
export function Guard({ children }: { children: React.ReactNode }) {
  const { token, ready, clear } = useSession();
  const valid = useQuery(adminApi.validate, token ? { token } : "skip");

  // An expired or revoked token is forgotten, not kept around to re-fail.
  useEffect(() => {
    if (token && valid === false) clear();
  }, [token, valid, clear]);

  if (!ready || (token && valid === undefined)) {
    return <p className="text-muted">Loading…</p>;
  }
  if (!token || valid === false) return <Login />;
  return <>{children}</>;
}

function Login() {
  const { save } = useSession();
  const login = useMutation(adminApi.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      // Trimmed: phone keyboards capitalize and pastes drag whitespace, and
      // a login that fails on an invisible character reads as broken.
      save(await login({ username: username.trim(), password: password.trim() }));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="ops-card mx-auto mt-24 max-w-xs space-y-3 p-6">
      <p className="font-medium">Operator sign-in</p>
      <input
        className="ops-input"
        placeholder="Username"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        className="ops-input"
        type="password"
        placeholder="Password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        type="submit"
        disabled={busy || !username || !password}
        className="ops-chip is-on w-full justify-center py-1.5 disabled:opacity-50"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
      {failed && (
        <p className="text-[12px]" style={{ color: "var(--bad)" }}>
          Wrong username or password.
        </p>
      )}
    </form>
  );
}
