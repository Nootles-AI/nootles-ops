"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { adminApi } from "@/lib/api";
import { shortUser, when } from "@/lib/format";
import { useAdminToken } from "@/lib/session";

/**
 * Every account, newest first — the roster of the first hundred. Click
 * through for how each one is actually getting on.
 */
export default function Users() {
  const token = useAdminToken();
  const users = useQuery(adminApi.userList, { token });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight">Users</h1>
      <section className="ops-card overflow-x-auto">
        {users === undefined ? (
          <p className="p-4 text-muted">Loading…</p>
        ) : users.length === 0 ? (
          <p className="p-4 text-[13px] text-muted">Nobody yet.</p>
        ) : (
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
              {users.map((u) => (
                <tr key={u.ownerId} className="hover:bg-sunken">
                  <td>
                    <Link
                      href={`/users/${u.ownerId}`}
                      className="ops-who max-w-64 font-medium hover:underline"
                      title={u.email ?? u.ownerId}
                    >
                      {u.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.imageUrl} alt="" className="ops-who-face" />
                      ) : (
                        <span className="ops-who-face ops-who-blank" aria-hidden>
                          {(u.name ?? u.email ?? "?")[0]?.toUpperCase()}
                        </span>
                      )}
                      <span className="ops-who-name">
                        {u.name ?? u.email ?? shortUser(u.ownerId)}
                      </span>
                    </Link>
                  </td>
                  <td className="max-w-40 truncate text-muted">{u.role ?? "–"}</td>
                  <td className="max-w-40 truncate text-muted">{u.useCase ?? "–"}</td>
                  <td className="text-[12px] text-muted">{u.status}</td>
                  <td className="text-[12px]">
                    {u.letterSeen ? (
                      "read"
                    ) : (
                      <span className="text-faint">unread</span>
                    )}
                  </td>
                  <td className="num text-[12px] text-muted">{when(u.createdAt)}</td>
                  <td className="num text-[12px] text-muted">
                    {u.lastActiveAt ? when(u.lastActiveAt) : "never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
