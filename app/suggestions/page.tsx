"use client";

import { useQuery } from "convex/react";
import {
  adminApi,
  type SuggestionKindStats,
  type SuggestionRow,
} from "@/lib/api";
import { ms, pctOf, when } from "@/lib/format";
import { useAdminToken } from "@/lib/session";
import { Empty, Instrument, Loading, Panel } from "../components/Bits";
import { RangeChips, useRange } from "../components/Range";
import { Who } from "../components/Who";

/**
 * What the editor offered and what people did with it. This is model
 * telemetry, not the coding agent's work, so every mark on the page is on
 * Sheet — no watch paper, no machine ink. The tint means "the agent authored
 * this"; spending it on a page of suggestion counts would spend it on nothing.
 */
export default function Suggestions() {
  const token = useAdminToken();
  const { range, setRange, sinceMs } = useRange();
  const stats = useQuery(adminApi.suggestionStats, { token, sinceMs });
  // Unscoped by design: `suggestionRecent` takes a limit, not a window, so this
  // table is the last 50 whenever they happened. Said so in the panel head.
  const recent = useQuery(adminApi.suggestionRecent, { token, limit: 50 });

  const total = stats ? sumKinds(stats.kinds) : undefined;
  // A sum over a capped sample is a floor, not a total, and says so — the
  // same promise the Overview's figures make.
  const cap = stats?.capped ? "+" : "";
  // One kind is its own total; a second row saying the same thing is noise.
  // The figures above still want the sum, so they read `total` directly.
  const all = stats && stats.kinds.length > 1 ? total : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="ops-title">Suggestions</h1>
        <RangeChips range={range} onChange={setRange} />
      </div>

      {/* The funnel said once at full size, left to right, before the table
          breaks it into kinds — every other page that carries a headline
          number opens with this row, and a figure should look the same
          wherever it appears. Four columns pinned: the shared grid opens to
          eight past 1100px, which would leave this row half empty. */}
      <div className="ops-instruments sm:grid-cols-4">
        <Instrument
          label="Shown"
          value={total && `${total.shown.toLocaleString()}${cap}`}
          note={stats && `${stats.kinds.length} kind${stats.kinds.length === 1 ? "" : "s"}`}
        />
        <Instrument
          label="Accepted"
          value={total && `${total.accepted.toLocaleString()}${cap}`}
          note={total ? `${pctOf(total.accepted, total.shown)} of shown` : undefined}
        />
        <Instrument
          label="Survival avg"
          value={total ? pctOf(total.survivalTotal, total.survivalCount) : undefined}
          note={total && `${total.survivalCount.toLocaleString()} scored`}
        />
        <Instrument
          label="Undone <30s"
          value={total && `${total.undone.toLocaleString()}${cap}`}
          note={total ? `${pctOf(total.undone, total.accepted)} of accepted` : undefined}
        />
      </div>

      <Panel title="Funnel">
        {stats === undefined ? (
          <Loading />
        ) : stats.kinds.length === 0 ? (
          <Empty>No suggestions in this range.</Empty>
        ) : (
          <div className="ops-scroll">
            <table className="ops-table">
              <thead>
                <tr>
                  <th scope="col">Kind</th>
                  <th scope="col" className="num">
                    Shown
                  </th>
                  <th scope="col" className="num">
                    Accepted
                  </th>
                  <th scope="col" className="num">
                    Accept %
                  </th>
                  <th scope="col" className="num">
                    Dismissed
                  </th>
                  <th
                    scope="col"
                    className="num"
                    title="Accepted, then undone within 30 seconds"
                  >
                    Undone &lt;30s
                  </th>
                  <th
                    scope="col"
                    className="num"
                    title="How much of an accepted suggestion was still in the page when it was checked"
                  >
                    Survival avg
                  </th>
                  <th
                    scope="col"
                    className="num"
                    title="Time from request to suggestion"
                  >
                    Latency avg
                  </th>
                  <th
                    scope="col"
                    className="num"
                    title="Time the person took to accept or dismiss"
                  >
                    Decision avg
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.kinds.map((k) => (
                  <FunnelRow key={k.kind} label={k.kind} k={k} />
                ))}
              </tbody>
              {all && (
                <tfoot>
                  <FunnelRow label="all kinds" k={all} foot />
                </tfoot>
              )}
            </table>
          </div>
        )}
        {stats?.capped && (
          <p className="ops-note border-t border-rule px-4 py-2">
            Sampled the most recent {stats.sampled.toLocaleString()} rows.
          </p>
        )}
      </Panel>

      <Panel
        title="Latest suggestions"
        aside={<p className="ops-note">Not scoped to the range.</p>}
      >
        {recent === undefined ? (
          <Loading />
        ) : recent.length === 0 ? (
          <Empty>No suggestions yet. Nothing has been offered in the editor.</Empty>
        ) : (
          <div className="ops-scroll">
            <table className="ops-table">
              <thead>
                <tr>
                  <th scope="col">Outcome</th>
                  <th scope="col">Kind</th>
                  <th scope="col">Suggestion</th>
                  <th scope="col" className="num">
                    Survival
                  </th>
                  <th scope="col">User</th>
                  <th scope="col" className="num">
                    When
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r._id}>
                    <td className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        {/* The dot is the fast read; the word beside it is the
                            fact, so the colour is never load-bearing. */}
                        <span className={`ops-dot${tone(r.outcome)}`} aria-hidden />
                        <span>
                          {r.outcome}
                          {r.dismissReason && (
                            <span className="text-ink-2"> · {r.dismissReason}</span>
                          )}
                        </span>
                      </span>
                    </td>
                    <td className="ops-mono whitespace-nowrap text-ink-2">
                      {r.kind}
                    </td>
                    <td>
                      {/* Model output, so it keeps the mono face. Capped rather
                          than wrapped — the whole string rides along as the
                          title, which is where a long one is still readable. */}
                      <span
                        className="ops-mono block max-w-[15rem] truncate text-ink-2 sm:max-w-[30rem]"
                        title={r.suggestionText || undefined}
                      >
                        {r.suggestionText || "–"}
                      </span>
                    </td>
                    <td className="num">{survival(r)}</td>
                    <td className="whitespace-nowrap">
                      <Who ownerId={r.ownerId} />
                    </td>
                    <td className="num">
                      <span className="ops-note">{when(r.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

/** The numeric half of a kind's row — the shape the totals line also has. */
type Funnel = Omit<SuggestionKindStats, "kind">;

/**
 * One line of the funnel. The totals line is this same component over the sum
 * of every kind, so the averages stay weighted by volume rather than becoming
 * an average of averages.
 */
function FunnelRow({
  label,
  k,
  foot,
}: {
  label: string;
  k: Funnel;
  foot?: boolean;
}) {
  // Latency is recorded for every suggestion the model produced — including
  // the gated ones nobody ever saw — so it averages over outcomes, not `shown`.
  const produced = k.accepted + k.dismissed + k.superseded + k.failed + k.gated;
  const rule = foot ? " border-t border-rule-strong border-b-0" : "";
  return (
    <tr>
      {/* The totals line is marked by its rule and by full-strength ink — a
          heavier weight on top of both would be a third say of the same thing. */}
      <td className={`ops-mono text-ink${rule}`}>
        {label}
      </td>
      <td className={`num${rule}`}>{k.shown.toLocaleString()}</td>
      <td className={`num${rule}`}>{k.accepted.toLocaleString()}</td>
      <td className={`num${rule}`}>{pctOf(k.accepted, k.shown)}</td>
      <td className={`num${rule}`}>{k.dismissed.toLocaleString()}</td>
      <td className={`num${rule}`}>{k.undone ? k.undone.toLocaleString() : "–"}</td>
      <td className={`num${rule}`}>{pctOf(k.survivalTotal, k.survivalCount)}</td>
      <td className={`num${rule}`}>
        {produced ? ms(k.latencyTotal / produced) : "–"}
      </td>
      <td className={`num${rule}`}>
        {k.decisionCount ? ms(k.decisionTotal / k.decisionCount) : "–"}
      </td>
    </tr>
  );
}

function sumKinds(kinds: SuggestionKindStats[]): Funnel {
  return kinds.reduce<Funnel>(
    (a, k) => ({
      shown: a.shown + k.shown,
      accepted: a.accepted + k.accepted,
      dismissed: a.dismissed + k.dismissed,
      superseded: a.superseded + k.superseded,
      failed: a.failed + k.failed,
      gated: a.gated + k.gated,
      undone: a.undone + k.undone,
      latencyTotal: a.latencyTotal + k.latencyTotal,
      decisionTotal: a.decisionTotal + k.decisionTotal,
      decisionCount: a.decisionCount + k.decisionCount,
      survivalTotal: a.survivalTotal + k.survivalTotal,
      survivalCount: a.survivalCount + k.survivalCount,
    }),
    {
      shown: 0,
      accepted: 0,
      dismissed: 0,
      superseded: 0,
      failed: 0,
      gated: 0,
      undone: 0,
      latencyTotal: 0,
      decisionTotal: 0,
      decisionCount: 0,
      survivalTotal: 0,
      survivalCount: 0,
    },
  );
}

/** Settled and good, or broken. Everything between is left plain on purpose. */
function tone(outcome: SuggestionRow["outcome"]): string {
  if (outcome === "accepted") return " is-ok";
  if (outcome === "failed") return " is-bad";
  return "";
}

function survival(r: SuggestionRow) {
  // Taken back inside 30s: a survival percentage would flatter it.
  if (r.undoneWithinMs !== undefined) {
    return <span title={`Undone after ${ms(r.undoneWithinMs)}`}>undone</span>;
  }
  // The score is already a fraction of one, so the whole here is 1.
  if (r.survivalScore !== undefined) return pctOf(r.survivalScore, 1);
  return "–";
}
