"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
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
  /** A right-clicked row's menu, in viewport coordinates. */
  const [menu, setMenu] = useState<{
    id: string;
    status: TicketStatus;
    x: number;
    y: number;
  } | null>(null);
  const token = useAdminToken();
  const setTicketStatus = useMutation(adminApi.feedbackSetStatus);
  const result = useQuery(adminApi.feedbackList, {
    token,
    paginationOpts: { numItems: 200, cursor: null },
    ...(kind ? { kind } : {}),
    ...(status ? { status } : {}),
  });

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const act = (to: TicketStatus) => {
    if (!menu) return;
    void setTicketStatus({ token, id: menu.id, status: to }).catch(() => {});
    setMenu(null);
  };

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
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setMenu({
                        id: f._id,
                        status: f.status,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
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

      {menu && (
        <div
          className="ops-menu"
          role="menu"
          style={{ left: menu.x, top: menu.y }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {menu.status !== "new" && (
            <>
              <button className="ops-menu-item" role="menuitem" onClick={() => act("new")}>
                <span className="ops-unread-dot" aria-hidden />
                Mark as unread
              </button>
              <div className="ops-menu-sep" aria-hidden />
            </>
          )}
          {STATUSES.filter(
            (s): s is { id: TicketStatus; label: string } =>
              s.id !== undefined && s.id !== "new" && s.id !== menu.status,
          ).map((s) => (
            <button
              key={s.id}
              className="ops-menu-item"
              role="menuitem"
              onClick={() => act(s.id)}
            >
              <StatusIcon status={s.id} />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
