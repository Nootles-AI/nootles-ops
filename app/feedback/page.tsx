"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { adminApi } from "@/lib/api";
import { shortUser, when } from "@/lib/format";
import { useAdminToken } from "@/lib/session";

const KINDS = [
  { id: undefined, label: "All" },
  { id: "issue" as const, label: "Bug reports" },
  { id: "wish" as const, label: "Feature requests" },
];

const STATUSES = [
  { id: undefined, label: "Any status" },
  { id: "new" as const, label: "New" },
  { id: "seen" as const, label: "Seen" },
  { id: "done" as const, label: "Done" },
];

export default function FeedbackInbox() {
  const [kind, setKind] = useState<"issue" | "wish" | undefined>(undefined);
  const [status, setStatus] = useState<"new" | "seen" | "done" | undefined>(
    undefined,
  );
  const token = useAdminToken();
  const result = useQuery(adminApi.feedbackList, {
    token,
    paginationOpts: { numItems: 200, cursor: null },
    ...(kind ? { kind } : {}),
    ...(status ? { status } : {}),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Feedback</h1>
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k.label}
              className={`ops-chip${kind === k.id ? " is-on" : ""}`}
              onClick={() => setKind(k.id)}
            >
              {k.label}
            </button>
          ))}
          <span className="mx-1 w-px self-stretch bg-border" aria-hidden />
          {STATUSES.map((s) => (
            <button
              key={s.label}
              className={`ops-chip${status === s.id ? " is-on" : ""}`}
              onClick={() => setStatus(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <section className="ops-card">
        {result === undefined ? (
          <p className="p-4 text-muted">Loading…</p>
        ) : result.page.length === 0 ? (
          <p className="p-4 text-[13px] text-muted">Nothing here yet.</p>
        ) : (
          <table className="ops-table">
            <thead>
              <tr>
                <th aria-label="Status" />
                <th>Kind</th>
                <th>Report</th>
                <th>Carries</th>
                <th>User</th>
                <th className="num">When</th>
              </tr>
            </thead>
            <tbody>
              {result.page.map((f) => (
                <tr key={f._id} className="hover:bg-sunken">
                  <td className="w-6">
                    <span
                      className={`ops-dot${f.status === "new" ? " is-new" : f.status === "done" ? " is-ok" : ""}`}
                      title={f.status}
                    />
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="ops-meta">
                      {f.kind === "issue" ? "bug" : "wish"}
                    </span>
                  </td>
                  <td className="max-w-md">
                    <Link
                      href={`/feedback/${f._id}`}
                      className="block truncate hover:underline"
                    >
                      {f.text}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap text-[12px] text-muted">
                    {[
                      f.screenshotUrl && "shot",
                      f.replayUrl && "replay",
                      f.consoleLog && "console",
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td className="whitespace-nowrap font-mono text-[12px] text-muted">
                    {shortUser(f.ownerId)}
                  </td>
                  <td className="num text-[12px] text-muted">{when(f.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
