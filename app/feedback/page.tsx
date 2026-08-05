"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { adminApi, type TicketPriority, type TicketStatus } from "@/lib/api";
import { shortUser, when } from "@/lib/format";
import { useAdminToken } from "@/lib/session";
import { PriorityIcon } from "../components/PriorityIcon";
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

const PRIORITIES: { id: TicketPriority; label: string }[] = [
  { id: "urgent", label: "Urgent" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

const RANK: Record<TicketPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export default function FeedbackInbox() {
  const [kind, setKind] = useState<"issue" | "wish" | undefined>(undefined);
  const [status, setStatus] = useState<TicketStatus | undefined>(undefined);
  const [sort, setSort] = useState<"newest" | "priority">("newest");
  /** A right-clicked row's menu, in viewport coordinates. */
  const [menu, setMenu] = useState<{
    id: string;
    status: TicketStatus;
    kind: "issue" | "wish";
    priority?: TicketPriority;
    x: number;
    y: number;
  } | null>(null);
  const token = useAdminToken();
  const setTicketStatus = useMutation(adminApi.feedbackSetStatus);
  const setTicketPriority = useMutation(adminApi.feedbackSetPriority);
  const setTicketKind = useMutation(adminApi.feedbackSetKind);
  const result = useQuery(adminApi.feedbackList, {
    token,
    paginationOpts: { numItems: 200, cursor: null },
    ...(kind ? { kind } : {}),
    ...(status ? { status } : {}),
  });

  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    // Containment check, not stopPropagation: the app hydrates the whole
    // document, so React's delegated events live on `document` too — a
    // sibling listener there still fires whatever propagation was stopped.
    const onDown = (e: PointerEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const actStatus = (to: TicketStatus) => {
    if (!menu) return;
    void setTicketStatus({ token, id: menu.id, status: to }).catch(() => {});
    setMenu(null);
  };
  const actPriority = (to?: TicketPriority) => {
    if (!menu) return;
    void setTicketPriority({
      token,
      id: menu.id,
      ...(to ? { priority: to } : {}),
    }).catch(() => {});
    setMenu(null);
  };
  const actKind = (to: "issue" | "wish") => {
    if (!menu) return;
    void setTicketKind({ token, id: menu.id, kind: to }).catch(() => {});
    setMenu(null);
  };

  const rows = result
    ? sort === "priority"
      ? [...result.page].sort(
          (a, b) =>
            (b.priority ? RANK[b.priority] : 0) -
              (a.priority ? RANK[a.priority] : 0) || b.createdAt - a.createdAt,
        )
      : result.page
    : undefined;

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
          <span className="mx-1 h-4 w-px self-center bg-border" aria-hidden />
          <button
            className="ops-chip"
            title="Toggle sort order"
            onClick={() => setSort(sort === "newest" ? "priority" : "newest")}
          >
            Sort: {sort === "newest" ? "Newest" : "Priority"}
          </button>
        </div>
      </div>

      <section className="ops-card">
        {rows === undefined ? (
          <p className="p-4 text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-[13px] text-muted">Inbox zero.</p>
        ) : (
          <ul>
            {rows.map((f) => {
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
                        kind: f.kind,
                        priority: f.priority,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                  >
                    <span className="ops-ticket-slot" aria-hidden>
                      {unread && <span className="ops-unread-dot" />}
                    </span>
                    <PriorityIcon priority={f.priority} />
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
          ref={menuRef}
          className="ops-menu"
          role="menu"
          style={{ left: menu.x, top: menu.y }}
        >
          {menu.status !== "new" && (
            <>
              <button
                className="ops-menu-item"
                role="menuitem"
                onClick={() => actStatus("new")}
              >
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
              onClick={() => actStatus(s.id)}
            >
              <StatusIcon status={s.id} />
              {s.label}
            </button>
          ))}
          <div className="ops-menu-sep" aria-hidden />
          {PRIORITIES.filter((p) => p.id !== menu.priority).map((p) => (
            <button
              key={p.id}
              className="ops-menu-item"
              role="menuitem"
              onClick={() => actPriority(p.id)}
            >
              <PriorityIcon priority={p.id} />
              {p.label}
            </button>
          ))}
          {menu.priority && (
            <button
              className="ops-menu-item"
              role="menuitem"
              onClick={() => actPriority(undefined)}
            >
              <PriorityIcon />
              No priority
            </button>
          )}
          <div className="ops-menu-sep" aria-hidden />
          <button
            className="ops-menu-item"
            role="menuitem"
            onClick={() => actKind(menu.kind === "issue" ? "wish" : "issue")}
          >
            <span className="ops-meta">{menu.kind === "issue" ? "wish" : "bug"}</span>
            Move to {menu.kind === "issue" ? "feature requests" : "bug reports"}
          </button>
        </div>
      )}
    </div>
  );
}
