"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import {
  adminApi,
  CATEGORY_LABELS,
  KIND_WORDS,
  type AgentRun,
  type FeedbackDetail,
  type OpsConfig,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/api";
import { useAct } from "@/lib/act";
import { clock, ticketName, ticketNumber, when } from "@/lib/format";
import { useOps } from "@/lib/ops";
import { useAdminToken } from "@/lib/session";
import { Empty, Loading, Panel } from "../../components/Bits";
import { PrIcon } from "../../components/PrIcon";
import { PriorityIcon } from "../../components/PriorityIcon";
import { StatusIcon } from "../../components/StatusIcon";
import { TicketName } from "../../components/TicketName";
import { Who } from "../../components/Who";

/**
 * ONE TICKET — and the one page where the law is drawn at full size.
 *
 * The person's report lies on the left, the night's work on the right, and a
 * 1px Ink rule runs between them. Below `lg` the columns stack, human first,
 * and the same rule lies down flat. Nothing the coding agent did is ever drawn
 * on the human's paper, and nothing a human did is ever drawn on the
 * machine's — which is why the duplicate link changes paper depending on who
 * made it, and why the pull-request list only goes on Watch when every request
 * in it was filed by the agent.
 */

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

export default function TicketPage() {
  const { ticket } = useParams<{ ticket: string }>();
  const token = useAdminToken();
  const { config, lastRun } = useOps();
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
  const clearAttempt = useMutation(adminApi.feedbackClearAgentAttempt);

  // Three wrappers, not one, so a failure is reported beside the control that
  // caused it rather than at the top of a page the operator has scrolled past.
  const edit = useAct();
  const link = useAct();
  const agent = useAct();

  // Opening a ticket is what "seen" means — nobody should file that by hand.
  // It goes through the same wrapper as the ladder beneath it: if it fails,
  // the sentence appears directly above the control that fixes it.
  const id = row?._id;
  const isNew = row?.status === "new";
  const { run } = edit;
  useEffect(() => {
    if (isNew && id) {
      run("mark this report seen", setStatus({ token, id, status: "seen" }));
    }
  }, [isNew, id, token, setStatus, run]);

  // An unparseable segment and a number nobody filed answer the same way, and
  // both must be answered before `undefined` can be read as "still loading".
  if (number === null || row === null) {
    return (
      <div className="space-y-3">
        <h1 className="ops-title">No such report</h1>
        <p className="ops-prose">
          Nothing has been filed under{" "}
          <span className="ops-mono">
            {number === null ? ticket : ticketName(number)}
          </span>
          . It may have been a typo, or the number may belong to a report that
          was never sent.
        </p>
        <Link href="/feedback" className="ops-chip">
          Back to the inbox
        </Link>
      </div>
    );
  }
  // The way out is drawn before the report arrives: this page is opened off a
  // 200-row list hundreds of times a morning, and a bare em-dash with no back
  // link strands the operator every time the query is slow.
  if (row === undefined)
    return (
      <div className="space-y-3">
        <BackLink />
        <Loading />
      </div>
    );

  const threshold = config?.scoreThreshold;
  // Being read and being scored are two facts, not one: the agent can stamp a
  // ticket read and leave the score off. Keying the panel on the score would
  // report a triaged ticket as untriaged, which is the one thing this column
  // must never do.
  const triaged = row.triagedAt !== undefined;
  const attempted = row.agentAttemptedAt !== undefined;
  const agentDuplicate =
    row.duplicateOfNumber !== null && row.duplicateSetBy === "agent";
  // Never handed to the agent at all: no triage, no attempt, no pull request,
  // and no link it drew. The whole column is the unsigned line.
  const untouched =
    !triaged && !attempted && row.prs.length === 0 && !agentDuplicate;
  const notReached = untouchedBecause(row, config, lastRun);

  return (
    <div className="space-y-5">
      <h1 className="sr-only">
        {ticketName(row.number)} — {row.text.slice(0, 90)}
      </h1>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <BackLink />
        <TicketName number={row.number} />
        <span className="ops-mono text-ink-2">
          {KIND_WORDS[row.kind].long}
        </span>
        <span
          className="ops-note text-ink-3"
          title={new Date(row.createdAt).toLocaleString()}
        >
          {when(row.createdAt)}
        </span>
      </div>

      {/* The operator's controls, all of them above the split: what a human
          decides about the ticket is not part of either paper. */}
      <div className={`space-y-3${edit.busy ? " is-resolving" : ""}`}>
        <div className="ops-scroll">
          <div className="ops-ladder" role="radiogroup" aria-label="Status">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                role="radio"
                aria-checked={row.status === s.id}
                onClick={() =>
                  edit.run(
                    "set the status",
                    setStatus({ token, id: row._id, status: s.id }),
                  )
                }
              >
                <StatusIcon status={s.id} />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="ops-eyebrow mr-1">Priority</span>
          <div
            role="radiogroup"
            aria-label="Priority"
            className="flex flex-wrap items-center gap-1.5"
          >
            {PRIORITIES.map((p) => (
              <button
                key={p.label}
                role="radio"
                aria-checked={row.priority === p.id}
                className={`ops-chip${row.priority === p.id ? " is-on" : ""}`}
                onClick={() =>
                  edit.run(
                    "set the priority",
                    setPriority({
                      token,
                      id: row._id,
                      ...(p.id ? { priority: p.id } : {}),
                    }),
                  )
                }
              >
                <PriorityIcon priority={p.id} />
                {p.label}
              </button>
            ))}
          </div>

          <span className="mx-1 h-4 w-px self-center bg-rule" aria-hidden />

          <span className="ops-eyebrow mr-1">Category</span>
          <select
            className="ops-chip"
            aria-label="Category"
            value={row.category ?? "general"}
            onChange={(e) =>
              edit.run(
                "set the category",
                setCategory({
                  token,
                  id: row._id,
                  category: e.target.value as TicketCategory,
                }),
              )
            }
          >
            {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>

          <span className="mx-1 h-4 w-px self-center bg-rule" aria-hidden />

          <button
            className="ops-chip"
            onClick={() =>
              edit.run(
                "move this report",
                setKind({
                  token,
                  id: row._id,
                  kind: row.kind === "issue" ? "wish" : "issue",
                }),
              )
            }
          >
            Move to {KIND_WORDS[row.kind === "issue" ? "wish" : "issue"].plural}
          </button>

          {/* The label stays put and `aria-pressed` carries the state — a
              control that renames itself is a control you have to read twice. */}
          <button
            className={`ops-chip${row.agentSkip ? " is-on" : ""}`}
            aria-pressed={!!row.agentSkip}
            title="The agent's queues never return an omitted ticket"
            onClick={() =>
              edit.run(
                row.agentSkip
                  ? "let the agent review this report"
                  : "omit this report from agent review",
                setAgentSkip({ token, id: row._id, skip: !row.agentSkip }),
              )
            }
          >
            Omit from agent review
          </button>
        </div>

        {edit.failed && (
          <p className="ops-failed" role="status">
            Could not {edit.failed}. Try again.
          </p>
        )}
      </div>

      {/* THE LINE. Vertical while the axis is a list; flat once the columns
          stack, which is the same rule seen from the other side. */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1px_1fr] lg:gap-0">
        <div className="min-w-0 space-y-4 lg:pr-6">
          <Panel title="The report">
            {/* `break-words` is not decoration: a pasted stack trace or URL is
                one unbroken token, and the panel clips rather than scrolls. */}
            <p className="ops-prose p-4 break-words whitespace-pre-wrap">
              {row.text}
            </p>
          </Panel>

          <div className="flex flex-wrap items-center gap-2">
            <Who ownerId={row.ownerId} />
            {row.email && (
              <a href={`mailto:${row.email}`} className="ops-chip max-w-full">
                <span className="truncate">{row.email}</span>
                <span aria-hidden>✉</span>
              </a>
            )}
            {row.replayUrl && (
              <a
                href={row.replayUrl}
                target="_blank"
                rel="noreferrer"
                className="ops-chip"
              >
                Watch the session replay <span aria-hidden>↗</span>
              </a>
            )}
            {row.env.sha && (
              <span className="ops-chip">
                build · <span className="ops-mono">{row.env.sha}</span>
              </span>
            )}
            <span className="ops-chip">
              viewport · <span className="ops-mono">{row.env.viewport}</span>
            </span>
            {row.pageId && (
              <span className="ops-chip max-w-full">
                page · <span className="ops-mono truncate">{row.pageId}</span>
              </span>
            )}
            {row.status === "done" && (
              <span
                className="ops-chip"
                title="The in-app toast is shown once, on their next visit"
              >
                reporter told · {row.notifiedAt ? when(row.notifiedAt) : "not yet"}
              </span>
            )}
          </div>

          {row.screenshotUrl && (
            <Panel title="Screenshot at report time">
              <div className="p-3">
                <a href={row.screenshotUrl} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={row.screenshotUrl}
                    alt="Screenshot attached to the report"
                    className="max-h-[60vh] max-w-full rounded border border-rule"
                  />
                </a>
              </div>
            </Panel>
          )}

          <section className="space-y-2">
            <h2 className="ops-eyebrow">Console tail</h2>
            {row.consoleLog?.trim() ? (
              <pre className="ops-pre">{row.consoleLog.trim()}</pre>
            ) : (
              <p className="ops-note">No console output came with this report.</p>
            )}
          </section>
        </div>

        <div className="h-px bg-ink lg:h-auto" aria-hidden />

        <div className="min-w-0 space-y-4 lg:pl-6">
          {untouched ? (
            <div className="ops-unsigned">
              <p>Not handed to the agent yet.</p>
              {notReached && <p className="ops-note mt-1">{notReached}</p>}
            </div>
          ) : (
            <>
              {triaged ? (
                <Panel
                  machine
                  title="Triage"
                  aside={
                    <>
                      {row.rubricVersion && (
                        <span className="ops-mono text-ink-2">
                          rubric {row.rubricVersion}
                        </span>
                      )}
                      <span
                        className="ops-mono text-ink-2"
                        title={new Date(row.triagedAt!).toLocaleString()}
                      >
                        {when(row.triagedAt!)}
                      </span>
                    </>
                  }
                >
                  <div className="space-y-3 p-4">
                    <div className="flex items-baseline gap-3">
                      <p className="ops-figure">{row.triageScore ?? "—"}</p>
                      <p className="ops-note">
                        {row.triageScore === undefined
                          ? "It was read, but no score was written down."
                          : threshold === undefined
                            ? "Concreteness against the rubric."
                            : row.triageScore >= threshold
                              ? `Concreteness — above tonight's threshold of ${threshold}.`
                              : `Concreteness — below tonight's threshold of ${threshold}.`}
                      </p>
                    </div>
                    {row.triageNotes?.trim() ? (
                      <p className="ops-machine-prose break-words whitespace-pre-wrap">
                        {row.triageNotes.trim()}
                      </p>
                    ) : (
                      <p className="ops-note">The agent left no note.</p>
                    )}
                    <div className={agent.busy ? "is-resolving" : undefined}>
                      <button
                        className="ops-chip"
                        title="Puts the ticket back in the triage queue"
                        onClick={() =>
                          agent.run(
                            "put this back in the triage queue",
                            clearTriage({ token, id: row._id }),
                          )
                        }
                      >
                        Re-triage
                      </button>
                    </div>
                  </div>
                </Panel>
              ) : (
                <div className="ops-unsigned">
                  <p>Not triaged.</p>
                  {notReached && <p className="ops-note mt-1">{notReached}</p>}
                </div>
              )}

              {attempted ? (
                <Panel
                  machine
                  title={`Attempt · ${row.agentOutcome ?? "outcome unrecorded"}`}
                  aside={
                    <span
                      className="ops-mono text-ink-2"
                      title={new Date(row.agentAttemptedAt!).toLocaleString()}
                    >
                      {when(row.agentAttemptedAt!)}
                    </span>
                  }
                >
                  <div className="space-y-3 p-4">
                    {/* The app narrating an outcome code, not a sentence the
                        agent wrote — so it stays out of the machine's ink,
                        same as "The agent left no note." above. */}
                    <p className="ops-note">
                      {row.agentOutcome === "declined"
                        ? "The agent judged this one not safe to attempt unattended."
                        : row.agentOutcome === "failed"
                          ? "The attempt did not clear its own checks; nothing was filed."
                          : row.agentOutcome === "filed"
                            ? "A pull request was opened for this ticket."
                            : "The run ended without recording what it decided."}
                    </p>
                    <div className={agent.busy ? "is-resolving" : undefined}>
                      <button
                        className="ops-chip"
                        title="Puts the ticket back in the implement queue"
                        onClick={() =>
                          agent.run(
                            "let the agent retry",
                            clearAttempt({ token, id: row._id }),
                          )
                        }
                      >
                        Let the agent retry
                      </button>
                    </div>
                  </div>
                </Panel>
              ) : (
                <div className="ops-unsigned">
                  <p>No attempt.</p>
                  <p className="ops-note mt-1">
                    {noAttemptBecause(row, config, threshold)}
                  </p>
                </div>
              )}

              {agent.failed && (
                <p className="ops-failed" role="status">
                  Could not {agent.failed}. Try again.
                </p>
              )}

              {row.prs.length > 0 && (
                /* Watch paper only when every request in the list is the
                   agent's; one human-filed request in there and the tint would
                   be claiming authorship it does not have. The 3px Machine edge
                   still marks each agent-filed row either way. */
                <Panel
                  machine={row.prs.every((pr) => pr.agentFiled)}
                  title="Pull requests"
                  aside={<span className="ops-mono text-ink-2">{row.prs.length}</span>}
                >
                  {row.prs.map((pr) => (
                    <a
                      key={pr._id}
                      href={pr.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`ops-pr${pr.agentFiled ? " is-agent" : ""}`}
                    >
                      <PrIcon state={pr.state} />
                      <span className="ops-pr-title">{pr.title}</span>
                      {pr.agentFiled && (
                        <span className="sr-only">Filed by the agent</span>
                      )}
                      <span className="ops-mono shrink-0 text-ink-2">
                        {pr.repo.split("/").at(-1)}#{pr.prNumber}
                      </span>
                      <span className={`ops-pr-state is-${pr.state}`}>
                        {pr.state}
                      </span>
                      <span className="ops-note shrink-0">
                        {when(pr.mergedAt ?? pr.firstSeenAt)}
                      </span>
                    </a>
                  ))}
                </Panel>
              )}
            </>
          )}

          {row.duplicateOfNumber !== null && (
            <Panel
              machine={agentDuplicate}
              title="Duplicate of"
              aside={
                <span className="ops-mono text-ink-2">
                  {agentDuplicate ? "linked by the agent" : "linked by hand"}
                </span>
              }
            >
              <div
                className={`flex flex-wrap items-center gap-2 p-3${
                  link.busy ? " is-resolving" : ""
                }`}
              >
                <Link
                  href={`/feedback/${ticketName(row.duplicateOfNumber)}`}
                  className="ops-chip"
                >
                  {ticketName(row.duplicateOfNumber)} <span aria-hidden>→</span>
                </Link>
                <button
                  className="ops-chip"
                  title="Puts this report back in the inbox on its own"
                  onClick={() =>
                    link.run(
                      "unlink this duplicate",
                      setDuplicate({ token, id: row._id, duplicateOf: null }),
                    )
                  }
                >
                  Not a duplicate
                </button>
              </div>
              {link.failed && (
                <p className="ops-failed px-3 pb-3" role="status">
                  Could not {link.failed}. Try again.
                </p>
              )}
            </Panel>
          )}

          {/* Incoming links carry no author, so they stay on the human's
              paper — the record does not say who drew them. */}
          {row.duplicateNumbers.length > 0 && (
            <Panel
              title="Repeated by"
              aside={
                <span className="ops-mono text-ink-2">
                  {row.duplicateNumbers.length}
                </span>
              }
            >
              <div className="flex flex-wrap gap-2 p-3">
                {row.duplicateNumbers.map((n) => (
                  <Link
                    key={n}
                    href={`/feedback/${ticketName(n)}`}
                    className="ops-chip"
                  >
                    {ticketName(n)}
                  </Link>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>

      {/* The intro describes a left/right split, so it is only true when there
          is a timeline under it to split. */}
      <Panel title="Recent ops">
        {row.recentOps?.length ? (
          <div className="space-y-3 p-4">
            <p className="ops-note">
              The last edits before the report — theirs on the left, the
              model&rsquo;s on the right.
            </p>
            <OpTimeline ops={row.recentOps} />
          </div>
        ) : (
          <Empty>Nothing was recorded in the seconds before the report.</Empty>
        )}
      </Panel>

      <p className="ops-note break-words">Reported from {row.env.ua}</p>
    </div>
  );
}

/** Kept in the loading branch too, so a slow query never strands the operator. */
function BackLink() {
  return (
    <Link
      href="/feedback"
      className="text-[length:var(--text-ui)] text-ink-2 hover:text-ink"
    >
      ← Inbox
    </Link>
  );
}

/**
 * Why the night shift never reached this ticket, when that is knowable. A
 * missing `lastRun` is ambiguous — `useOps` cannot tell "no runs yet" from
 * "the run list is still arriving" — so nothing is claimed in that case.
 */
function untouchedBecause(
  row: FeedbackDetail,
  config: (OpsConfig & { configured: boolean }) | undefined,
  lastRun: AgentRun | undefined,
): string | null {
  if (row.agentSkip)
    return "It is omitted from agent review, so the queues never return it.";
  if (config && !config.agentEnabled) return "The night shift is switched off.";
  if (lastRun?.status === "running")
    return `A run has been going since ${clock(lastRun.startedAt)}; it may still arrive.`;
  if (lastRun)
    return `The last run, at ${clock(lastRun.startedAt)}, did not get to it.`;
  return null;
}

/** Why the agent scored this ticket and then left it alone. */
function noAttemptBecause(
  row: FeedbackDetail,
  config: (OpsConfig & { configured: boolean }) | undefined,
  threshold: number | undefined,
): string {
  if (row.agentSkip) return "It is omitted from agent review.";
  if (
    threshold !== undefined &&
    row.triageScore !== undefined &&
    row.triageScore < threshold
  ) {
    return `It scored ${row.triageScore}, under tonight's threshold of ${threshold}.`;
  }
  if (config && !config.implementEnabled)
    return "The agent is triaging only; writing code is switched off.";
  return "The agent has not picked it up yet.";
}

/**
 * What the reporter had just done, human and model interleaved — the same
 * rule as the page above it, one more time: their hand on the left, the
 * model's on the right, hanging off a 1px rule.
 *
 * Tickets filed before the ops ring was split carry bare op objects with no
 * source, so those are shown as they always were — raw JSON, straddling both
 * columns. There is no migration to run: the field is untyped, and old reports
 * are read, not fixed.
 */
function OpTimeline({ ops }: { ops: unknown[] }) {
  const tagged = ops.filter(
    (o): o is {
      source: "human" | "ai";
      feature?: string;
      op: unknown;
      at: number;
    } => typeof o === "object" && o !== null && "source" in o && "at" in o,
  );
  if (tagged.length !== ops.length) {
    return <pre className="ops-pre">{JSON.stringify(ops, null, 2)}</pre>;
  }

  return (
    <div className="ops-ops">
      <div className="ops-ops-rule" aria-hidden />
      {tagged.map((entry, i) => (
        <div
          key={i}
          className={`ops-op is-${entry.source === "ai" ? "ai" : "human"}`}
        >
          {entry.source === "ai" && (
            <span className="ops-op-feature">{entry.feature ?? "ai"} </span>
          )}
          {opText(entry.op)}
        </div>
      ))}
    </div>
  );
}

function opText(op: unknown): string {
  return typeof op === "object" && op !== null ? JSON.stringify(op) : String(op);
}
