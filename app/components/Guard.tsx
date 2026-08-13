"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { adminApi } from "@/lib/api";
import { useSession } from "@/lib/session";

/**
 * The door. No token → the sign-in card; a token → validated against the
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
    return (
      <p className="text-ink-2" aria-busy>
        —
      </p>
    );
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
    <form
      onSubmit={submit}
      className="ops-sheet mx-auto mt-24 max-w-[19rem] p-6"
    >
      <h1 className="ops-eyebrow">The watch log</h1>
      <div className="mt-2 mb-4 h-px bg-ink" aria-hidden />
      <p className="ops-note mb-4">
        Two hands write in this book. Sign in to read it.
      </p>
      <div className="space-y-2">
        <input
          className="ops-input"
          placeholder="Username"
          aria-label="Username"
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
          aria-label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={busy || !username || !password}
        className="ops-chip is-on mt-3 w-full justify-center py-1.5"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
      {failed && (
        <p className="ops-failed mt-2" role="alert">
          That username and password don&rsquo;t match. Try again.
        </p>
      )}
    </form>
  );
}
