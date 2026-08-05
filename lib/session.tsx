"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * The operator's session: one token from admin:login, kept in localStorage.
 * This is client state only — the deployment re-validates the token on every
 * function call, so nothing here is trusted.
 */

const KEY = "nootles-ops:token";

const SessionContext = createContext<{
  token: string | null;
  ready: boolean;
  save: (token: string) => void;
  clear: () => void;
} | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // localStorage is client-only; the first render must match the server's,
  // so the stored token is restored once, after hydration. The one sanctioned
  // set-state-in-effect: there is no render-time source for this value.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setToken(localStorage.getItem(KEY));
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const save = useCallback((t: string) => {
    localStorage.setItem(KEY, t);
    setToken(t);
  }, []);
  const clear = useCallback(() => {
    localStorage.removeItem(KEY);
    setToken(null);
  }, []);

  return (
    <SessionContext.Provider value={{ token, ready, save, clear }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession outside SessionProvider");
  return ctx;
}

/** For pages under the Guard, which only renders them with a live token. */
export function useAdminToken(): string {
  const { token } = useSession();
  if (!token) throw new Error("useAdminToken outside an authorized Guard");
  return token;
}
