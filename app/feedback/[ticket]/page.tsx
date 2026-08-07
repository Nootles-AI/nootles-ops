"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import {
  adminApi,
  CATEGORY_LABELS,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/api";
import { ticketName, ticketNumber, when } from "@/lib/format";
import { useAdminToken } from "@/lib/session";
import { PrIcon } from "../../components/PrIcon";
import { PriorityIcon } from "../../components/PriorityIcon";
import { StatusIcon } from "../../components/StatusIcon";
import { TicketName } from "../../components/TicketName";

const STATUSES: { id: TicketStatus; label: string }[] = [
  { id: "new", label: "New" },
  { id: "seen", label: "Seen" },
  { id: "in_progress", label: "In progress" },
  { id: "pr_filed", label: "PR filed" },
  { id: "done", label: "Done" },
  { id: "declined", label: "Declined" },
];

const PRIORITIES: { id: TicketPriority | undefined; label: string }[] = [
  { id: undefined, label: "None" },
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "urgent", label: "Urgent" },
];

export default function FeedbackDetail() {
  const { ticket } = useParams<{ ticket: string }>();
  const token = useAdminToken();
  // Routes carry the ticket's name, not its Convex id — `/feedback/NT-42` is
  // what the inbox links to and what anyone would paste.
  const number = ticketNumber(ticket);
  const row = useQuery(
    adminApi.feedbackByNumber,
    number === null ? "skip" : { token, number },
  );
  const setStatus = useMutation(adminApi.feedbackSetStatus);
  const setPriority = useMutation(adminApi.feedbackSetPriority);
  const setKind = useMutation(adminApi.feedbackSetKind);
  const setCategory = useMutation(adminApi.feedbackSetCategory);
  const setAgentSkip = useMutation(adminApi.feedbackSetAgentSkip);
  const setDuplicate = useMutation(adminApi.feedbackSetDuplicate);
  const clearTriage = useMutation(adminApi.feedbackClearTriage);

  // Opening a ticket is what "seen" means — nobody should file that by hand.
  useEffect(() => {
    if (row?.status === "new") {
      void setStatus({ token, id: row._id, status: "seen" }).catch(() => {});
    }
  }, [row?.status, row?._id, token, setStatus]);

  // An unparseable segment and a number nobody filed answer the same way, and
  // both must be answered before `undefined` can be read as "still loading".
  if (number === null || row === null)
    return (
      <p className="text-muted">
        This report doesn&rsquo;t exist.{" "}
        <Link href="/feedback" className="underline">
          Back to the inbox
        </Link>
        .
      </p>
    );
  if (row === undefined) return <p className="text-muted">Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/feedback" className="text-[13px] text-muted hover:text-foreground">
          ← Inbox
        </Link>
        <TicketName number={row.number} />
        <span className="ops-meta">{row.kind === "issue" ? "bug report" : "feature request"}</span>
        <span className="text-[12px] text-faint">{when(row.createdAt)}</span>
        <div className="ml-auto flex gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s.id}
              className={`ops-chip inline-flex items-center gap-1.5${row.status === s.id ? " is-on" : ""}`}
              onClick={() => void setStatus({ token, id: row._id, status: s.id })}
            >
              <StatusIcon status={s.id} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="ops-meta mr-1">Priority</span>
        {PRIORITIES.map((p) => (
          <button
            key={p.label}
            className={`ops-chip inline-flex items-center gap-1.5${
              (row.priority ?? undefined) === p.id ? " is-on" : ""
            }`}
            onClick={() =>
              void setPriority({
                token,
                id: row._id,
                ...(p.id ? { priority: p.id } : {}),
              })
            }
          >
            <PriorityIcon priority={p.id} />
            {p.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px self-center bg-border" aria-hidden />
        <span className="ops-meta mr-1">Category</span>
        <select
          className="ops-chip"
          aria-label="Category"
          value={row.category ?? "general"}
          onChange={(e) =>
            void setCategory({
              token,
              id: row._id,
              category: e.target.value as TicketCategory,
            })
          }
        >
          {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <span className="mx-1 h-4 w-px self-center bg-border" aria-hidden />
        <button
          className="ops-chip"
          onClick={() =>
            void setKind({
              token,
              id: row._id,
              kind: row.kind === "issue" ? "wish" : "issue",
            })
          }
        >
          Move to {row.kind === "issue" ? "feature requests" : "bug reports"}
        </button>
        <span className="mx-1 h-4 w-px self-center bg-border" aria-hidden />
        <button
          className={`ops-chip${row.agentSkip ? " is-on" : ""}`}
          title="The agent's queues never return an omitted ticket"
          onClick={() =>
            void setAgentSkip({ token, id: row._id, skip: !row.agentSkip })
          }
        >
          {row.agentSkip ? "Omitted from agent review" : "Omit from agent review"}
        </button>
      </div>

      {(row.duplicateOfNumber !== null || row.duplicateNumbers.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          {row.duplicateOfNumber !== null && (
            <>
              <span className="ops-meta">Duplicate of</span>
              <Link
                href={`/feedback/${ticketName(row.duplicateOfNumber)}`}
                className="ops-chip"
              >
                {ticketName(row.duplicateOfNumber)} →
              </Link>
              <button
                className="ops-chip"
                onClick={() =>
                  void setDuplicate({ token, id: row._id, duplicateOf: null })
                }
              >
                Not a duplicate
              </button>
            </>
          )}
          {row.duplicateNumbers.length > 0 && (
            <>
              <span className="ops-meta">Repeated by</span>
              {row.duplicateNumbers.map((n) => (
                <Link
                  key={n}
                  href={`/feedback/${ticketName(n)}`}
                  className="ops-chip"
                >
                  {ticketName(n)}
                </Link>
              ))}
            </>
          )}
        </div>
      )}

      {row.prs.length > 0 && (
        <section className="ops-card">
          <header className="border-b border-border px-4 py-2.5">
            <h2 className="ops-meta">
              Pull requests · {row.prs.length}
            </h2>
          </header>
          <ul>
            {row.prs.map((pr) => (
              <li key={pr._id} className="border-b border-border last:border-none">
                <a
                  href={pr.url}
                  target="_blank"
                  rel="noreferrer"
                  className="ops-pr-row"
                >
                  <PrIcon state={pr.state} />
                  <span className="ops-pr-title">{pr.title}</span>
                  {pr.agentFiled && <span className="ops-agent-badge">agent</span>}
                  <span className="ops-pr-repo">
                    {pr.repo.split("/")[1]}
                    <span className="ops-pr-num">#{pr.prNumber}</span>
                  </span>
                  <span className={`ops-pr-state is-${pr.state}`}>{pr.state}</span>
                  <span className="ops-pr-when">
                    {when(pr.mergedAt ?? pr.firstSeenAt)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {row.triagedAt !== undefined && (
        <section className="ops-card p-4">
          <div className="flex items-center gap-3">
            <h2 className="ops-meta">
              Agent triage · score {row.triageScore ?? "–"}
              {row.rubricVersion ? ` · rubric ${row.rubricVersion}` : ""}
            </h2>
            <span className="text-[12px] text-faint">{when(row.triagedAt)}</span>
            <button
              className="ops-chip ml-auto"
              title="Puts the ticket back in the triage queue"
              onClick={() => void clearTriage({ token, id: row._id })}
            >
              Re-triage
            </button>
          </div>
          <p className="mt-2 max-w-prose whitespace-pre-wrap text-[13px] text-muted">
            {row.triageNotes || "(no notes)"}
          </p>
        </section>
      )}

      <section className="ops-card p-4">
        <p className="max-w-prose whitespace-pre-wrap text-[14px] leading-relaxed">
          {row.text}
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        {row.replayUrl && (
          <a
            href={row.replayUrl}
            target="_blank"
            rel="noreferrer"
            className="ops-chip is-on"
          >
            Watch session replay ↗
          </a>
        )}
        {row.email ? (
          <a href={`mailto:${row.email}`} className="ops-chip is-on">
            {row.email} ✉
          </a>
        ) : (
          <span className="ops-chip">user · {row.ownerId}</span>
        )}
        {row.env.sha && <span className="ops-chip">build · {row.env.sha}</span>}
        <span className="ops-chip">viewport · {row.env.viewport}</span>
        {row.pageId && <span className="ops-chip">page · {row.pageId}</span>}
      </div>

      {row.screenshotUrl && (
        <section className="ops-card p-3">
          <h2 className="ops-meta mb-2">Screenshot at report time</h2>
          <a href={row.screenshotUrl} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={row.screenshotUrl}
              alt="Screenshot attached to the report"
              className="max-h-[480px] w-auto rounded border border-border"
            />
          </a>
        </section>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <section>
          <h2 className="ops-meta mb-2">Console tail</h2>
          <pre className="ops-pre">{row.consoleLog?.trim() || "(empty)"}</pre>
        </section>
        <section>
          <h2 className="ops-meta mb-2">Recent ops</h2>
          <OpTimeline ops={row.recentOps} />
        </section>
      </div>

      <p className="text-[12px] text-faint">
        Reported from {row.env.ua}
      </p>
    </div>
  );
}

/**
 * What the reporter had just done, human and AI interleaved.
 *
 * Tickets filed before the ops ring was split carry bare op objects with no
 * source, so those are shown as they always were — raw JSON. There is no
 * migration to run: the field is untyped, and old reports are read, not fixed.
 */
function OpTimeline({ ops }: { ops?: unknown[] }) {
  if (!ops?.length) return <pre className="ops-pre">(none recorded)</pre>;

  const tagged = ops.filter(
    (o): o is { source: "human" | "ai"; feature?: string; op: unknown; at: number } =>
      typeof o === "object" &&
      o !== null &&
      "source" in o &&
      "at" in o,
  );
  if (tagged.length !== ops.length) {
    return <pre className="ops-pre">{JSON.stringify(ops, null, 2)}</pre>;
  }

  return (
    <ol className="ops-pre space-y-1">
      {tagged.map((entry, i) => (
        <li key={i} className="flex gap-2">
          <span
            className={`ops-op-source${entry.source === "ai" ? " is-ai" : ""}`}
          >
            {entry.source === "ai" ? (entry.feature ?? "ai") : "you"}
          </span>
          <span className="min-w-0 flex-1 break-all">
            {typeof entry.op === "object" && entry.op !== null
              ? JSON.stringify(entry.op)
              : String(entry.op)}
          </span>
        </li>
      ))}
    </ol>
  );
}
