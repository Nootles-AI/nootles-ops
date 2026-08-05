"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { adminApi, type TicketStatus } from "@/lib/api";
import { shortUser, when } from "@/lib/format";
import { useAdminToken } from "@/lib/session";
import { StatusIcon } from "../components/StatusIcon";

const KINDS = [
  { id: undefined, label: "All" },
  { id: "issue" as const, label: "Bugs" },
  { id: "wish" as const, label: "Features" },
];

const STATUSES: { id: TicketStatus | undefined; label: string }[] = [
  { id: undefined, label: "All" },
  { id: "new", label: "New" },
  { id: "seen", label: "Seen" },
  { id: "in_progress", label: "In progress" },
  { id: "done", label: "Done" },
  { id: "declined", label: "Declined" },
];

export default function FeedbackInbox() {
  const [kind, setKind] = useState<"issue" | "wish" | undefined>(undefined);
  const [status, setStatus] = useState<TicketStatus | undefined>(undefined);
  const token = useAdminToken();
  const result = useQuery(adminApi.feedbackList, {
    token,
    paginationOpts: { numItems: 200, cursor: null },
    ...(kind ? { kind } : {}),
    ...(status ? { status } : {}),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Inbox</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k.label}
              className={`ops-chip${kind === k.id ? " is-on" : ""}`}
              onClick={() => setKind(k.id)}
            >
              {k.label}
            </button>
          ))}
          <span className="mx-1 h-4 w-px self-center bg-border" aria-hidden />
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
          <p className="p-4 text-[13px] text-muted">Inbox zero.</p>
        ) : (
          <ul>
            {result.page.map((f) => {
              const unread = f.status === "new";
              return (
                <li key={f._id} className="border-b border-border last:border-none">
                  <Link
                    href={`/feedback/${f._id}`}
                    className={`ops-ticket${unread ? " is-unread" : ""}`}
                  >
                    <span className="ops-ticket-slot" aria-hidden>
                      {unread && <span className="ops-unread-dot" />}
                    </span>
                    <StatusIcon status={f.status} />
                    <span className="ops-meta w-9 shrink-0">
                      {f.kind === "issue" ? "bug" : "wish"}
                    </span>
                    <span className="ops-ticket-title">{f.text}</span>
                    <span className="ops-ticket-carries">
                      {[
                        f.screenshotUrl && "shot",
                        f.replayUrl && "replay",
                        f.consoleLog && "console",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <span className="w-16 shrink-0 text-right font-mono text-[11px] text-faint">
                      {shortUser(f.ownerId)}
                    </span>
                    <span className="w-14 shrink-0 text-right text-[12px] text-faint">
                      {when(f.createdAt)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
