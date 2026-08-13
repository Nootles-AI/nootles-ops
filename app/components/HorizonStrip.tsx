"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KIND_WORDS } from "@/lib/api";
import type { AgentRun, FeedbackListRow, TicketPriority } from "@/lib/api";
import { clock, ticketName } from "@/lib/format";
import { Loading } from "./Bits";

/**
 * THE HANDOVER STRIP — the hero, and the one place the line runs full bleed.
 *
 * Reports arrive above it in human ink; the agent's runs lie below it on the
 * machine's paper. It is a time axis rather than a row of tiles because an
 * agent run has a start *and* a finish — it is an interval, and the interval
 * is the story. A tile cannot show that a run began at 03:04 and died at
 * 03:19; today those errors are reachable only through a `title` attribute
 * and are therefore visible on no screen at all.
 *
 * Built from positioned elements rather than SVG so every mark can be a real
 * focusable link with an accessible name.
 */

const WINDOW_HOURS = 18;

const LOADED_AT = Date.now();

/**
 * The right edge is the clock, not page load. This page is left open all
 * night, and a frozen axis draws everything that arrives afterwards past 100%
 * — clipped away by the strip's overflow while still being counted in the
 * sentence above it, and truncating a still-running bar at an hour that has
 * long passed. It re-anchors on the minute rather than on every render so the
 * axis still does not shift under a mark as data lands.
 */
const TICK_MS = 60_000;

function useNow() {
  const [now, setNow] = useState(LOADED_AT);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * How much of the axis one run label eats: ~38 mono characters at 11px on an
 * 18-hour span, rounded up. Labels are absolutely positioned on a single row
 * with nowhere to stagger, so anything closer than this collides.
 */
const LABEL_SPAN = 18;

/**
 * The runs that get a label — the most recent first, then only those clear of
 * the last one labelled. A suppressed run keeps the `title` and `aria-label`
 * on its bar, which say more than the label does.
 */
function labelsFor(
  shifts: AgentRun[],
  start: number,
  at: (t: number) => number,
): Set<string> {
  const keep = new Set<string>();
  let taken = Infinity;
  for (const r of [...shifts].sort((a, b) => b.startedAt - a.startedAt)) {
    const x = at(Math.max(r.startedAt, start));
    if (taken - x < LABEL_SPAN) continue;
    taken = x;
    keep.add(r._id);
  }
  return keep;
}

const RANK: Record<TicketPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/** The hours the night shift keeps. */
const NIGHT_FROM = 22;
const NIGHT_TO = 8;

type Band = { from: number; to: number };

/** The 22:00–08:00 slices that fall inside the window, in local hours. */
function nightBands(start: number, end: number): Band[] {
  const bands: Band[] = [];
  const hour = 3600_000;
  let open: number | null = null;
  for (let t = Math.floor(start / hour) * hour; t < end; t += hour) {
    const h = new Date(t).getHours();
    const isNight = h >= NIGHT_FROM || h < NIGHT_TO;
    if (isNight && open === null) open = Math.max(t, start);
    if (!isNight && open !== null) {
      bands.push({ from: open, to: t });
      open = null;
    }
  }
  if (open !== null) bands.push({ from: open, to: end });
  return bands;
}

export function HorizonStrip({
  reports,
  runs,
}: {
  reports: FeedbackListRow[] | undefined;
  runs: AgentRun[] | undefined;
}) {
  const now = useNow();

  if (reports === undefined || runs === undefined) {
    return (
      <div className="ops-sheet h-[132px]">
        <Loading />
      </div>
    );
  }

  // Server stamps can land a little ahead of the browser's clock, and an event
  // past the right edge is one that gets counted but not drawn.
  const end = Math.max(
    now,
    ...reports.map((r) => r.createdAt),
    ...runs.map((r) => r.finishedAt ?? r.startedAt),
  );
  const start = end - WINDOW_HOURS * 3600_000;
  const span = end - start;
  const at = (t: number) => ((t - start) / span) * 100;

  const marks = reports.filter((r) => r.createdAt >= start);
  const shifts = runs.filter((r) => (r.finishedAt ?? end) >= start);

  const filed = shifts.reduce((n, r) => n + r.prsFiled, 0);
  const read = shifts.reduce((n, r) => n + r.ticketsRead, 0);
  const scored = shifts.reduce((n, r) => n + r.scored, 0);
  const linked = shifts.reduce((n, r) => n + r.duplicatesLinked, 0);
  const errored = shifts.filter((r) => r.errors.length > 0).length;

  const sentence = tellIt({
    reports: marks.length,
    runs: shifts.length,
    read,
    linked,
    scored,
    filed,
    errored,
    failed: shifts.filter((r) => r.status === "failed").length,
  });

  const first = shifts.at(-1);
  const last = shifts[0];
  const window =
    first && last
      ? `${clock(first.startedAt)} → ${clock(last.finishedAt ?? end)}`
      : `${clock(start)} → ${clock(end)}`;

  const labelled = labelsFor(shifts, start, at);

  // An empty band is worse than no band. Below three events the strip is a
  // sentence and a rule, which on a quiet night is the honest answer anyway.
  const sparse = marks.length + shifts.length < 3;

  const hours: number[] = [];
  for (
    let t = Math.ceil(start / 3600_000) * 3600_000;
    t < end;
    t += 3600_000 * 2
  ) {
    hours.push(t);
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="ops-eyebrow">The night&rsquo;s take</h2>
        <span className="ops-mono text-ink-3">{window}</span>
      </div>

      <p className="ops-prose">{sentence}</p>

      {sparse ? (
        <div className="h-px bg-ink" />
      ) : (
        <div className="ops-strip">
          {nightBands(start, end).map((b) => (
            <div
              key={b.from}
              className="ops-strip-night"
              style={{ left: `${at(b.from)}%`, width: `${at(b.to) - at(b.from)}%` }}
              aria-hidden
            />
          ))}
          {nightBands(start, end).flatMap((b) =>
            [b.from, b.to]
              .filter((t) => t > start && t < end)
              .map((t) => (
                <div
                  key={`edge-${t}`}
                  className="ops-strip-edge"
                  style={{ left: `${at(t)}%` }}
                  aria-hidden
                />
              )),
          )}

          <div className="ops-strip-line" aria-hidden />

          {/* Above the line: what people filed. */}
          {marks.map((r) => (
            <Link
              key={r._id}
              href={`/feedback/${ticketName(r.number)}`}
              className={`ops-strip-report${r.status === "new" ? " is-unread" : ""}`}
              style={
                {
                  left: `${at(r.createdAt)}%`,
                  height: `${10 + 4 * (r.priority ? RANK[r.priority] : 0)}px`,
                  "--t": (r.createdAt - start) / span,
                } as React.CSSProperties
              }
              title={`${ticketName(r.number)} · ${KIND_WORDS[r.kind].short} · ${clock(r.createdAt)} · ${r.text.slice(0, 60)}`}
            >
              <span className="sr-only">
                {ticketName(r.number)} filed at {clock(r.createdAt)}
              </span>
            </Link>
          ))}

          {/* Below the line: what the agent did about them. */}
          {shifts.map((r) => {
            const from = Math.max(r.startedAt, start);
            const to = Math.min(r.finishedAt ?? end, end);
            const told = `${r.kind} run, ${clock(r.startedAt)}${r.finishedAt ? ` to ${clock(r.finishedAt)}` : ", still running"} · ${r.status} · read ${r.ticketsRead}, linked ${r.duplicatesLinked}, scored ${r.scored}, filed ${r.prsFiled}${r.errors.length ? ` · ${r.errors.length} error${r.errors.length > 1 ? "s" : ""}: ${r.errors.join("; ")}` : ""}`;
            return (
              <div key={r._id}>
                {/* A link, not a div: what a run did was reachable only by
                    hovering, which is no use on a keyboard or a phone — and
                    /agent is where its full row lives anyway. */}
                <Link
                  href="/agent"
                  className={`ops-strip-run is-${r.status}`}
                  style={
                    {
                      left: `${at(from)}%`,
                      width: `${Math.max(at(to) - at(from), 0.4)}%`,
                      "--t": (from - start) / span,
                    } as React.CSSProperties
                  }
                  title={told}
                  aria-label={told}
                />
                {/* Outputs are drawn at the run's close, where its counters
                    are reported — the run knows how many PRs it filed, not
                    which ones or when, so nothing here pretends otherwise. */}
                {Array.from({ length: Math.min(r.prsFiled, 6) }).map((_, i) => (
                  <div
                    key={`pr-${i}`}
                    className="ops-strip-cap"
                    style={
                      {
                        left: `calc(${at(to)}% - ${i * 5 + 2}px)`,
                        "--t": (to - start) / span,
                      } as React.CSSProperties
                    }
                    aria-hidden
                  />
                ))}
                {r.errors.length > 0 && (
                  <div
                    className="ops-strip-cap is-error"
                    style={
                      {
                        left: `calc(${at(to)}% + 4px)`,
                        "--t": (to - start) / span,
                      } as React.CSSProperties
                    }
                    aria-hidden
                  />
                )}
                {labelled.has(r._id) && (
                  <div
                    className="ops-strip-label"
                    style={
                      {
                        left: `${at(from)}%`,
                        "--t": (from - start) / span,
                      } as React.CSSProperties
                    }
                  >
                    {r.kind} {clock(r.startedAt)}
                    {r.finishedAt ? `–${clock(r.finishedAt)}` : "–"} · read{" "}
                    {r.ticketsRead} · filed {r.prsFiled}
                  </div>
                )}
              </div>
            );
          })}

          {hours.map((t) => (
            <span
              key={t}
              className="ops-tick ops-strip-tick"
              style={{ left: `${at(t)}%` }}
              aria-hidden
            >
              {clock(t).slice(0, 2)}
            </span>
          ))}
        </div>
      )}

      {errored > 0 && (
        <p className="ops-note">
          <span className="text-alarm">
            {errored} {errored === 1 ? "run" : "runs"} logged errors.
          </span>{" "}
          <Link href="/agent" className="underline">
            Read what they said
          </Link>
          .
        </p>
      )}
    </section>
  );
}

/**
 * The night in a sentence. This is the hero as much as the strip is — on a
 * quiet night it is the whole hero, and it should read like a person handing
 * over a shift, not like a row of counters.
 */
function tellIt(n: {
  reports: number;
  runs: number;
  read: number;
  linked: number;
  scored: number;
  filed: number;
  errored: number;
  failed: number;
}): string {
  if (n.reports === 0 && n.runs === 0) {
    return "Nothing came in, and the agent did not run. Quiet.";
  }

  const parts: string[] = [];
  parts.push(
    n.reports === 0
      ? "No reports came in."
      : `${n.reports} ${n.reports === 1 ? "report" : "reports"} in.`,
  );

  if (n.runs === 0) {
    parts.push("The agent did not run.");
  } else {
    const did: string[] = [];
    if (n.read) did.push(`read ${n.read}`);
    if (n.linked) did.push(`linked ${n.linked} ${n.linked === 1 ? "duplicate" : "duplicates"}`);
    if (n.scored) did.push(`scored ${n.scored}`);
    if (n.filed)
      did.push(`filed ${n.filed} pull ${n.filed === 1 ? "request" : "requests"}`);
    parts.push(
      did.length
        ? `The agent ${did.slice(0, -1).join(", ")}${did.length > 1 ? " and " : ""}${did.at(-1)}.`
        : "The agent ran but touched nothing.",
    );
    parts.push(
      n.failed
        ? `${n.runs === 1 ? "The run" : `${n.failed} of ${n.runs} runs`} failed.`
        : n.errored
          ? `${n.runs === 1 ? "One run" : `${n.runs} runs`}, with errors logged.`
          : `${n.runs === 1 ? "One run" : `${n.runs} runs`}, no errors.`,
    );
  }

  return parts.join(" ");
}
