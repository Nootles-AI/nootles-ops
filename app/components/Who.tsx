"use client";

import { createContext, useContext, useMemo } from "react";
import Link from "next/link";
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

/** The first thing a profile has been stamped with, ignoring blanks — a name
 *  saved as an empty string is not a name, and `??` alone would take it. */
function firstReal(...values: (string | null | undefined)[]): string {
  for (const v of values) {
    const t = v?.trim();
    if (t) return t;
  }
  return "?";
}

export function Face({
  user,
  fallback,
  large,
}: {
  user?: Pick<UserRow, "imageUrl" | "name" | "email">;
  fallback: string;
  large?: boolean;
}) {
  const initial = firstReal(user?.name, user?.email, fallback)[0].toUpperCase();
  const size = large ? " is-lg" : "";
  return user?.imageUrl ? (
    // The name is always adjacent, so the face itself is decorative.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.imageUrl}
      alt=""
      loading="lazy"
      decoding="async"
      className={`ops-face${size}`}
    />
  ) : (
    <span className={`ops-face ops-face-blank${size}`} aria-hidden>
      {initial}
    </span>
  );
}

/**
 * A person. In a list row this is a real link to their page, which it could
 * not be while it sat inside the row's own link — a nested link is a dead
 * affordance, and the reporter is exactly who you want to look up next.
 */
export function Who({ ownerId }: { ownerId: string }) {
  const user = useWho(ownerId);
  const label = firstReal(user?.name, user?.email, shortUser(ownerId));
  // The name is always in the document; a narrow inbox takes it off the screen
  // rather than out of the tree (see .ops-who-name in the container query), so
  // the link never loses the only thing it has to announce.
  return (
    <Link
      href={`/users/${ownerId}`}
      className="ops-who"
      title={firstReal(user?.email, label)}
    >
      <Face user={user} fallback={label} />
      <span className="ops-who-name">{label}</span>
    </Link>
  );
}
