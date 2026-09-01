"use client";

import { Fragment, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  adminApi,
  CATEGORY_LABELS,
  KIND_WORDS,
  type AgentRun,
  type FeedbackListRow,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/api";
import { useAct } from "@/lib/act";
import { clock, ticketName } from "@/lib/format";
import { useOps } from "@/lib/ops";
import { useAdminToken } from "@/lib/session";
import { Empty, Loading } from "../components/Bits";
import { Menu, type MenuEntry } from "../components/Menu";
import { PriorityIcon } from "../components/PriorityIcon";
import { StatusIcon } from "../components/StatusIcon";
import { TicketRow } from "../components/TicketRow";

const KINDS = [
  { id: undefined, label: "All" },
  { id: "issue" as const, label: "Bugs" },
  { id: "wish" as const, label: "Wishes" },
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

const FILTERS_KEY = "nootles-ops:inbox-filters";

type Filters = {
  kind?: "issue" | "wish";
  status?: TicketStatus;
  category?: TicketCategory;
  sort: "newest" | "priority";
};

/** Stored filters, validated — stale or hand-edited values fall back cleanly. */
function readFilters(): Filters | null {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Filters>;
    return {
      kind: p.kind === "issue" || p.kind === "wish" ? p.kind : undefined,
      status: STATUSES.some((s) => s.id === p.status) ? p.status : undefined,
      category:
        p.category && p.category in CATEGORY_LABELS ? p.category : undefined,
      sort: p.sort === "priority" ? "priority" : "newest",
    };
  } catch {
    return null;
  }
}

export default function FeedbackInbox() {
  const [kind, setKind] = useState<"issue" | "wish" | undefined>(undefined);
  const [status, setStatus] = useState<TicketStatus | undefined>(undefined);
  const [category, setCategory] = useState<TicketCategory | undefined>(undefined);
  const [sort, setSort] = useState<"newest" | "priority">("newest");

  // Restore the persisted view on the client. The default renders first so
  // SSR and the first client render agree; set-state-in-effect is correct here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = readFilters();
    if (!saved) return;
    setKind(saved.kind);
    setStatus(saved.status);
    setCategory(saved.category);
    setSort(saved.sort);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    localStorage.setItem(FILTERS_KEY, JSON.stringify({ kind, status, category, sort }));
  }, [kind, status, category, sort]);

  const token = useAdminToken();
  const { config, lastRun } = useOps();
  const act = useAct();

  /** The row a menu is open on, in viewport coordinates. */
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(
    null,
  );
  /** The row a mutation is in flight for, so only that line dims. */
  const [acted, setActed] = useState<string | null>(null);

  const saveStatus = useMutation(adminApi.feedbackSetStatus);
  const savePriority = useMutation(adminApi.feedbackSetPriority);
  const saveKind = useMutation(adminApi.feedbackSetKind);
  const saveAgentSkip = useMutation(adminApi.feedbackSetAgentSkip);

  const result = useQuery(adminApi.feedbackList, {
    token,
    paginationOpts: { numItems: 200, cursor: null },
    ...(kind ? { kind } : {}),
    ...(status ? { status } : {}),
  });

  const visible = result
    ? category
      ? result.page.filter((f) => (f.category ?? "general") === category)
      : result.page
    : undefined;
  const rows = visible
    ? sort === "priority"
      ? [...visible].sort(
          (a, b) =>
            (b.priority ? RANK[b.priority] : 0) -
              (a.priority ? RANK[a.priority] : 0) || b.createdAt - a.createdAt,
        )
      : visible
    : undefined;

  // Every mutation on this page goes through here: one place to record which
  // row is resolving, one sentence when it fails.
  const run = (row: FeedbackListRow, what: string, call: Promise<unknown>) => {
    setActed(row._id);
    act.run(what, call);
  };

  const entriesFor = (row: FeedbackListRow): MenuEntry[] => {
    const name = ticketName(row.number);
    const out: MenuEntry[] = [];

    if (row.status !== "new") {
      out.push({
        kind: "item",
        id: "unread",
        label: "Mark as unread",
        icon: <span className="ops-unread" aria-hidden />,
        onSelect: () =>
          run(
            row,
            `mark ${name} as unread`,
            saveStatus({ token, id: row._id, status: "new" }),
          ),
      });
      out.push({ kind: "sep", id: "sep-unread" });
    }

    for (const s of STATUSES) {
      // A local const, not `s.id`: the narrowing has to survive into the
      // closure below.
      const to = s.id;
      if (to === undefined || to === "new" || to === row.status) continue;
      out.push({
        kind: "item",
        id: `status-${to}`,
        label: s.label,
        icon: <StatusIcon status={to} />,
        onSelect: () =>
          run(
            row,
            `set ${name} to ${s.label.toLowerCase()}`,
            saveStatus({ token, id: row._id, status: to }),
          ),
      });
    }

    out.push({ kind: "sep", id: "sep-priority" });
    for (const p of PRIORITIES) {
      if (p.id === row.priority) continue;
      out.push({
        kind: "item",
        id: `priority-${p.id}`,
        label: p.label,
        icon: <PriorityIcon priority={p.id} />,
        onSelect: () =>
          run(
            row,
            `set ${name} to ${p.label.toLowerCase()} priority`,
            savePriority({ token, id: row._id, priority: p.id }),
          ),
      });
    }
    if (row.priority) {
      out.push({
        kind: "item",
        id: "priority-none",
        label: "No priority",
        icon: <PriorityIcon />,
        onSelect: () =>
          run(
            row,
            `clear the priority on ${name}`,
            savePriority({ token, id: row._id }),
          ),
      });
    }

    out.push({ kind: "sep", id: "sep-kind" });
    const otherKind = row.kind === "issue" ? "wish" : "issue";
    const queue = KIND_WORDS[otherKind].plural;
    out.push({
      kind: "item",
      id: "kind",
      label: `Move to ${queue}`,
      icon: <MoveMark />,
      onSelect: () =>
        run(
          row,
          `move ${name} to ${queue}`,
          saveKind({ token, id: row._id, kind: otherKind }),
        ),
    });

    out.push({ kind: "sep", id: "sep-agent" });
    out.push(
      row.agentSkip
        ? {
            kind: "item",
            id: "agent",
            label: "Allow agent review",
            icon: <AgentMark allowed />,
            onSelect: () =>
              run(
                row,
                `allow agent review on ${name}`,
                saveAgentSkip({ token, id: row._id, skip: false }),
              ),
          }
        : {
            kind: "item",
            id: "agent",
            label: "Omit from agent review",
            icon: <AgentMark />,
            onSelect: () =>
              run(
                row,
                `omit ${name} from agent review`,
                saveAgentSkip({ token, id: row._id, skip: true }),
              ),
          },
    );

    return out;
  };

  // The menu reads the live row rather than a copy taken when it opened, so a
  // ticket changed in another tab cannot offer the status it already has.
  const target = menu && rows ? rows.find((r) => r._id === menu.id) : undefined;

  const night = nightWindow(lastRun);
  const filtered = kind !== undefined || status !== undefined || category !== undefined;
  const sections =
    rows && sort === "newest"
      ? splitByNight(rows, night)
      : rows
        ? [{ group: null, rows }]
        : [];

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="ops-title">Inbox</h1>
        {act.failed && (
          <p className="ops-failed" role="status">
            Could not {act.failed}. Try again.
          </p>
        )}

        {/* The bar scrolls on its own below about 900px rather than wrapping
            into three ragged lines or dragging the page sideways. */}
        <div className="ops-scroll ml-auto max-w-full">
          <div className="flex w-max items-center gap-1.5 py-1">
            <div className="ops-ladder" role="radiogroup" aria-label="Kind">
              {KINDS.map((k) => (
                <button
                  key={k.label}
                  type="button"
                  role="radio"
                  aria-checked={kind === k.id}
                  onClick={() => setKind(k.id)}
                >
                  {k.label}
                </button>
              ))}
            </div>

            <span className="mx-1 h-4 w-px self-center bg-rule" aria-hidden />

            <div className="ops-ladder" role="radiogroup" aria-label="Status">
              {STATUSES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  role="radio"
                  aria-checked={status === s.id}
                  onClick={() => setStatus(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <span className="mx-1 h-4 w-px self-center bg-rule" aria-hidden />

            <div className="ops-ladder" role="radiogroup" aria-label="Sort by">
              <button
                type="button"
                role="radio"
                aria-checked={sort === "newest"}
                onClick={() => setSort("newest")}
              >
                Newest
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={sort === "priority"}
                onClick={() => setSort("priority")}
              >
                Priority
              </button>
            </div>

            <span className="mx-1 h-4 w-px self-center bg-rule" aria-hidden />

            <select
              className="ops-chip"
              aria-label="Filter by category"
              value={category ?? ""}
              onChange={(e) =>
                setCategory((e.target.value || undefined) as TicketCategory | undefined)
              }
            >
              <option value="">All categories</option>
              {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>

            {/* The rule, stated where the scores are read. */}
            <span
              className="ops-mono self-center pl-1 text-ink-3"
              title="Tonight the agent will not pick up a ticket scoring below this."
            >
              {/* Spelt out rather than set with ≥: U+2265 is outside the latin
                  subset the one font ships, so the operator would fall back to
                  a second face for a single glyph. */}
              Rubric threshold {config ? config.scoreThreshold : "—"}
            </span>
          </div>
        </div>
      </header>

      <section className="ops-sheet">
        {rows === undefined ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty>
            {!filtered
              ? "Inbox zero."
              : // The category is matched here, after the server's 200 — so
                // with more pages behind it, "nothing matches" would be a
                // claim about the whole inbox that this page cannot make.
                result?.isDone === false
                ? "No matches in the newest 200 reports. Narrow the filters to reach further back."
                : "No reports match these filters."}
          </Empty>
        ) : (
          <>
            <div className="ops-rows" aria-busy={act.busy}>
              {/* Keyed by position, not by group: `createdAt` is the
                  deployment's own stamp and need not agree with the order the
                  page arrives in, and a band that repeats must not collide
                  with the one before it. */}
              {sections.map((section, i) => (
                <Fragment key={`${section.group ?? "all"}-${i}`}>
                  {section.group && (
                    <GroupLegend group={section.group} night={night} />
                  )}
                  {section.rows.map((row) => (
                    // The wrapped shape the sheet already knows
                    // (`.ops-rows > :last-child > .ops-row` drops the last
                    // hairline), and the one place a single resolving line can
                    // dim without taking the other 199 with it.
                    <div
                      key={row._id}
                      className={
                        act.busy && acted === row._id ? "is-resolving" : undefined
                      }
                    >
                      <TicketRow
                        row={row}
                        threshold={config?.scoreThreshold}
                        menuOpen={menu?.id === row._id}
                        onMenu={(at, r) => setMenu({ id: r._id, ...at })}
                      />
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
            {result && !result.isDone && (
              <p className="ops-note border-t border-rule px-2.5 py-2">
                The newest 200 reports. Narrow the filters to reach further back.
              </p>
            )}
          </>
        )}
      </section>

      {menu && target && (
        <Menu
          x={menu.x}
          y={menu.y}
          label={`Actions for ${ticketName(target.number)}`}
          entries={entriesFor(target)}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}

/* ==========================================================================
   The overnight boundary, in the list.

   The handover strip has little to say on a quiet night, but the inbox is
   read every morning regardless. These separators put the night's edge — and
   the run's own counters — in the page the operator actually lives in.
   ======================================================================== */

/**
 * Only the two bands that mean something get a name. Everything older is just
 * the rest of the list: a legend reading "Earlier" marks the absence of a
 * boundary rather than a boundary, and when nothing arrived overnight it is
 * the only band there is — a label pinned to the top of the inbox saying
 * nothing at all.
 */
type Group = "today" | "night";

type Night = { from: number; to: number; run: AgentRun };

/**
 * The newest run's window, but only while it is still the night just gone. A
 * week-old run would drop a chronological band into the middle of rows that
 * have nothing to do with it, which is worse than no band at all.
 */
function nightWindow(run: AgentRun | undefined): Night | null {
  if (!run) return null;
  // Age is taken from the run's own clock, not from the window's end: a run
  // that died mid-night keeps `status: "running"` and no `finishedAt` for
  // good, and an end of `now` would keep such a run looking fresh for good
  // with it — swallowing days of rows into one band of the machine's paper.
  const anchor = run.finishedAt ?? run.startedAt;
  if (Date.now() - anchor > 24 * 3600_000) return null;
  // A run that died mid-night keeps `status: "running"` and no `finishedAt`
  // for good. Ending its band at `now` would make the band grow all day and
  // put every ticket filed since under the machine's paper — and, because the
  // "today" cut is `>= to`, would leave no ticket able to reach it at all. So
  // an unfinished run gets a bounded night rather than an open one.
  const OPEN_RUN_CEILING = 4 * 3600_000;
  const to =
    run.finishedAt ??
    Math.min(Date.now(), run.startedAt + OPEN_RUN_CEILING);
  return { from: run.startedAt, to, run };
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Two cuts, and only two get a name: today, and the night just gone. Anything
 * older is the rest of the list and is drawn without a legend — "Earlier"
 * names the absence of a boundary rather than a boundary, and on a quiet night
 * it was the only band there was.
 *
 * A band may appear more than once: `createdAt` is the deployment's stamp and
 * need not agree with the order the page arrives in, so the sections are keyed
 * by position rather than by name.
 */
function splitByNight(
  rows: FeedbackListRow[],
  night: Night | null,
): { group: Group | null; rows: FeedbackListRow[] }[] {
  const dawn = startOfToday();
  // The later of the two edges: a nightly job that finishes at 23:40 would
  // otherwise file 23:50's ticket under "Today · since 23:40" while the row's
  // own age cell reads "8h ago".
  const of = (at: number): Group | null =>
    night
      ? at >= Math.max(night.to, dawn)
        ? "today"
        : at >= night.from
          ? "night"
          : null
      : at >= dawn
        ? "today"
        : null;

  const out: { group: Group | null; rows: FeedbackListRow[] }[] = [];
  for (const row of rows) {
    const g = of(row.createdAt);
    const last = out.at(-1);
    if (last && last.group === g) last.rows.push(row);
    else out.push({ group: g, rows: [row] });
  }
  return out;
}

function GroupLegend({ group, night }: { group: Group; night: Night | null }) {
  const isNight = group === "night";
  const label = group === "today" ? "Today" : "Overnight";

  // What the machine did, in the machine's own numbers, on the machine's
  // paper. Elsewhere the legend is a plain human heading.
  const note = isNight
    ? night &&
      `${clock(night.from)}–${night.run.finishedAt ? clock(night.to) : "now"} · read ${night.run.ticketsRead} · scored ${night.run.scored} · filed ${night.run.prsFiled}`
    : night?.run.finishedAt
      ? `since ${clock(night.to)}`
      : null;

  return (
    <div className={`ops-group${isNight ? " is-night" : ""}`}>
      <h2 className="ops-eyebrow">{label}</h2>
      {note && (
        <span
          className={`ops-mono min-w-0 truncate ${isNight ? "text-machine" : "text-ink-3"}`}
        >
          {note}
        </span>
      )}
      <div className="ops-group-rule" aria-hidden />
    </div>
  );
}

/** Into the other queue. */
function MoveMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="shrink-0">
      <path
        d="M1.8 7h6.4M6 4.4 8.7 7 6 9.6"
        fill="none"
        stroke="var(--ink-2)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.6 2.8v8.4"
        stroke="var(--rule-strong)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The watch cell in miniature, so the menu item and the row say the same
 * thing: dashed across it means the machine may not act here.
 */
function AgentMark({ allowed }: { allowed?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="shrink-0">
      <rect
        x="1.2"
        y="3.5"
        width="11.6"
        height="7"
        rx="2"
        fill="none"
        stroke={allowed ? "var(--machine)" : "var(--rule-strong)"}
        strokeWidth="1.3"
      />
      {!allowed && (
        <path
          d="M2.6 7h8.8"
          stroke="var(--ink-2)"
          strokeWidth="1.3"
          strokeDasharray="2 1.8"
        />
      )}
    </svg>
  );
}
