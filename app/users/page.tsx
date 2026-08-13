"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { adminApi, type UserRow } from "@/lib/api";
import { shortUser, when } from "@/lib/format";
import { useAdminToken } from "@/lib/session";
import { Empty, Instrument, Loading } from "../components/Bits";
import { Face } from "../components/Who";

/**
 * Every account, newest first — the roster of the first hundred. Click
 * through for how each one is actually getting on.
 *
 * All Sheet: these are people, and none of this is the coding agent's work.
 */
export default function Users() {
  const token = useAdminToken();
  const users = useQuery(adminApi.userList, { token });
  const figures = useMemo(() => census(users), [users]);

  return (
    <div className="space-y-4">
      <h1 className="ops-title">Users</h1>

      {/* The four facts this page is opened for, drawn the way the Overview
          draws its eight — a figure should look the same wherever it appears,
          and the roster is not the place to say them quieter than the front
          page says its own. All four are read off the rows already fetched; a
          second query would be a worse page, not a better one. The utility
          pins the row at four columns, since the shared grid opens to eight
          past 1100px. */}
      <div className="ops-instruments sm:grid-cols-4">
        <Instrument label="Accounts" value={figures && String(figures.total)} />
        <Instrument
          label="Active 7d"
          value={figures && String(figures.active)}
        />
        <Instrument
          label="Onboarded"
          value={figures && String(figures.onboarded)}
        />
        <Instrument
          label="Never active"
          value={figures && String(figures.never)}
        />
      </div>

      {/* Bare sheet, as the inbox draws its list: a panel head reading
          "Roster" one line under the title says the title again. */}
      <section className="ops-sheet">
        {users === undefined ? (
          <Loading />
        ) : users.length === 0 ? (
          <Empty>No accounts yet. Nobody has signed up.</Empty>
        ) : (
          <div className="ops-scroll">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Use case</th>
                  <th>Onboarding</th>
                  <th>Letter</th>
                  <th className="num">Joined</th>
                  <th className="num">Last active</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  // `||`, not `??`: a profile stamped with an empty string
                  // is as nameless as one stamped with nothing, and an
                  // empty name cell is unclickable in practice.
                  const label =
                    u.name?.trim() || u.email?.trim() || shortUser(u.ownerId);
                  return (
                    <tr key={u.ownerId}>
                      <td>
                        {/* Face, not Who: Who is a link itself, and this
                              cell is already one. */}
                        <Link
                          href={`/users/${u.ownerId}`}
                          className="ops-who max-w-64 text-ink font-medium hover:underline"
                          title={u.email?.trim() || u.ownerId}
                        >
                          <Face user={u} fallback={label} />
                          <span className="ops-who-name">{label}</span>
                        </Link>
                      </td>
                      {/* The clamp lives on a block inside the cell, not on
                            the cell: an auto-layout table ignores max-width on
                            a <td>, so a 6000-character use case would have
                            widened the whole table instead of ellipsing. */}
                      <td className="text-ink-2" title={u.role ?? undefined}>
                        <span className="block max-w-40 truncate">
                          {u.role ?? "–"}
                        </span>
                      </td>
                      <td className="text-ink-2" title={u.useCase ?? undefined}>
                        <span className="block max-w-40 truncate">
                          {u.useCase ?? "–"}
                        </span>
                      </td>
                      <td className="text-ink-2">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={`ops-dot ${onboardingTone(u.status)}`}
                            aria-hidden
                          />
                          {u.status}
                        </span>
                      </td>
                      <td className="text-[length:var(--text-note)]">
                        {u.letterSeen ? (
                          <span className="text-ink-2">read</span>
                        ) : (
                          <span className="text-ink-3">unread</span>
                        )}
                      </td>
                      <td className="num text-[length:var(--text-note)] text-ink-2">
                        {when(u.createdAt)}
                      </td>
                      <td className="num text-[length:var(--text-note)] text-ink-2">
                        {u.lastActiveAt ? when(u.lastActiveAt) : "never"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * How many accounts there are, how many are still turning up, how many
 * finished onboarding, and how many never came back at all. Undefined while
 * the rows are still arriving, so the figures draw an em-dash rather than a
 * zero that would read as a fact.
 */
function census(users: UserRow[] | undefined) {
  if (!users) return undefined;
  const now = Date.now();
  let active = 0;
  let onboarded = 0;
  let never = 0;
  for (const u of users) {
    if (u.lastActiveAt === null) never++;
    else if (now - u.lastActiveAt <= WEEK) active++;
    if (u.status === "done") onboarded++;
  }
  return { total: users.length, active, onboarded, never };
}

/**
 * Onboarding is state, never authorship: ember for the two stages still in
 * hand, live for finished, a hollow dot for the people who walked past it.
 */
function onboardingTone(status: UserRow["status"]): string {
  if (status === "done") return "is-ok";
  if (status === "skipped") return "is-off";
  return "is-warn";
}
