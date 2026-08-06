"use client";

import { createContext, useContext, useMemo } from "react";
import { useQuery } from "convex/react";
import { adminApi, type UserRow } from "@/lib/api";
import { shortUser } from "@/lib/format";
import { useSession } from "@/lib/session";

/**
 * One roster fetch, shared: every table that used to print a cryptic
 * user_3HQ… resolves it here into a face and a name. Falls back down the
 * ladder — name, email, short id — as far as the profile has been stamped.
 */

const DirectoryContext = createContext<Map<string, UserRow> | null>(null);

export function DirectoryProvider({ children }: { children: React.ReactNode }) {
  const { token } = useSession();
  const users = useQuery(adminApi.userList, token ? { token } : "skip");
  const map = useMemo(() => {
    const m = new Map<string, UserRow>();
    for (const u of users ?? []) m.set(u.ownerId, u);
    return m;
  }, [users]);
  return (
    <DirectoryContext.Provider value={map}>{children}</DirectoryContext.Provider>
  );
}

export function useWho(ownerId: string): UserRow | undefined {
  return useContext(DirectoryContext)?.get(ownerId);
}

export function Who({ ownerId }: { ownerId: string }) {
  const user = useWho(ownerId);
  const label = user?.name ?? user?.email ?? shortUser(ownerId);
  return (
    <span className="ops-who" title={user?.email ?? ownerId}>
      {user?.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.imageUrl} alt="" className="ops-who-face" />
      ) : (
        <span className="ops-who-face ops-who-blank" aria-hidden>
          {label[0]?.toUpperCase() ?? "?"}
        </span>
      )}
      <span className="ops-who-name">{label}</span>
    </span>
  );
}
