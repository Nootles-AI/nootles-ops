"use client";

import { useQuery } from "convex/react";
import { adminApi } from "@/lib/api";
import { ms, usd, when } from "@/lib/format";
import { useAdminToken } from "@/lib/session";
import { Empty, Loading, Panel } from "../components/Bits";
import { RangeChips, useRange } from "../components/Range";
import { Who } from "../components/Who";

/**
 * Model telemetry — what the product's AI features cost and how fast they
 * answer. This is NOT the coding agent's work, so nothing here sits on the
 * machine's paper: no `<Panel machine>`, no `bg-watch`. The tint marks the
 * night shift's authorship and only that; spend it here and it stops meaning
 * anything everywhere else.
 */
export default function Calls() {
  const token = useAdminToken();
  const { range, setRange, sinceMs } = useRange();
  const stats = useQuery(adminApi.aiCallStats, { token, sinceMs });
  const recent = useQuery(adminApi.aiCallRecent, { token, limit: 50 });

  // Both queries answer with an object or an array, never null — so
  // `undefined` here means one thing only: it has not arrived yet.
  const loadingStats = stats === undefined;

  // The peak day sets the scale. Math.max over an empty spread is -Infinity,
  // so the 0 floor stays; and a zero peak must not become a divisor.
  const maxDay = Math.max(...(stats?.costByDay.map((d) => d.costUsd) ?? [0]), 0);
  const barWidth = (costUsd: number) =>
    `${maxDay > 0 ? Math.max((costUsd / maxDay) * 100, 2) : 2}%`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="ops-title">AI calls</h1>
        <RangeChips range={range} onChange={setRange} />
      </div>

      <Panel
        title="By feature"
        aside={
          stats && (
            <span
              className="ops-mono text-ink-2"
              title="Calls behind the figures in this panel."
            >
              {stats.sampled.toLocaleString()} counted
            </span>
          )
        }
      >
        {loadingStats ? (
          <Loading />
        ) : stats.features.length === 0 ? (
          <Empty>No calls in this range.</Empty>
        ) : (
          <div className="ops-scroll">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th className="num">Calls</th>
                  <th className="num">Errors</th>
                  <th className="num">Aborted</th>
                  <th className="num">Tokens in</th>
                  <th className="num">Tokens out</th>
                  <th className="num">p50</th>
                  <th className="num">p95</th>
                  <th className="num">Cost</th>
                </tr>
              </thead>
              <tbody>
                {stats.features.map((f) => (
                  <tr key={f.feature}>
                    <td className="font-medium">{f.feature}</td>
                    <td className="num">{f.calls.toLocaleString()}</td>
                    {/* No errors is drawn as a dash, not a 0: the column is
                        read down the page for the rows that have some. */}
                    <td className="num">{f.errors || "–"}</td>
                    <td className="num">{f.aborted || "–"}</td>
                    <td className="num">{f.promptTokens.toLocaleString()}</td>
                    <td className="num">{f.completionTokens.toLocaleString()}</td>
                    <td className="num">{ms(f.p50)}</td>
                    <td className="num">{ms(f.p95)}</td>
                    <td className="num">{usd(f.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Whether the figures are the whole range is a caveat on every number
            above it, so it is said in the panel rather than left in a title
            attribute no phone can reach. */}
        {stats?.capped && (
          <p className="ops-note border-t border-rule px-4 py-2">
            The most recent {stats.sampled.toLocaleString()} calls. The oldest
            in this range are not counted.
          </p>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Cost by day">
          {loadingStats ? (
            <Loading />
          ) : stats.costByDay.length === 0 ? (
            <Empty>No spend in this range. Widen the window to look further back.</Empty>
          ) : (
            <ul className="space-y-1.5 p-4">
              {stats.costByDay.map((d) => (
                <li
                  key={d.day}
                  className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3"
                >
                  <span className="ops-mono text-ink-2" title={d.day}>
                    {d.day.slice(5)}
                  </span>
                  {/* The bar is the drawing; the amount beside it is the fact.
                      The peak is inked so it is found without reading, which
                      means nothing here is carried by the bar alone. */}
                  <span
                    className={`h-2 rounded-[2px] ${
                      maxDay > 0 && d.costUsd === maxDay ? "bg-ink" : "bg-ink-2"
                    }`}
                    style={{ width: barWidth(d.costUsd), minWidth: "3px" }}
                    aria-hidden
                  />
                  <span className="text-[length:var(--text-ui)] tabular-nums text-ink-2">
                    {usd(d.costUsd)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Top spenders">
          {loadingStats ? (
            <Loading />
          ) : stats.spenders.length === 0 ? (
            <Empty>No spend to attribute in this range.</Empty>
          ) : (
            <ul className="space-y-1.5 p-4">
              {stats.spenders.slice(0, 8).map((s) => (
                <li
                  key={s.ownerId}
                  className="flex items-center justify-between gap-3"
                >
                  <Who ownerId={s.ownerId} />
                  <span className="text-[length:var(--text-ui)] tabular-nums text-ink-2">
                    {usd(s.costUsd)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* The latest 50 are the whole log, not this range's slice — the range
          chips move the figures above and leave this list alone. That is only
          knowable from the page if the page says it. */}
      <Panel
        title="Latest calls"
        aside={<p className="ops-note">Not scoped to the range.</p>}
      >
        {recent === undefined ? (
          <Loading />
        ) : recent.length === 0 ? (
          <Empty>No calls yet. Nothing has been asked of a model.</Empty>
        ) : (
          <div className="ops-scroll">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Status</th>
                  <th className="num">In</th>
                  <th className="num">Out</th>
                  <th className="num">TTFB</th>
                  <th className="num">Latency</th>
                  <th className="num">Cost</th>
                  <th>User</th>
                  <th className="num">When</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r._id}>
                    {/* Which model served it rides along as the title rather
                        than a tenth column — it is asked for one row at a
                        time, never read down the page. */}
                    <td className="font-medium whitespace-nowrap" title={r.model}>
                      {r.feature}
                    </td>
                    <td className="whitespace-nowrap">
                      <span className={`ops-dot${dotFor(r.status)}`} aria-hidden />{" "}
                      {r.status}
                      {r.errorCode && (
                        <>
                          {" "}
                          <span className="ops-mono text-ink-2">{r.errorCode}</span>
                        </>
                      )}
                    </td>
                    <td className="num">{r.promptTokens?.toLocaleString() ?? "–"}</td>
                    <td className="num">
                      {r.completionTokens?.toLocaleString() ?? "–"}
                    </td>
                    <td className="num">
                      {r.ttfbMs !== undefined ? ms(r.ttfbMs) : "–"}
                    </td>
                    <td className="num">{ms(r.latencyMs)}</td>
                    <td className="num">
                      {r.costUsd !== undefined ? usd(r.costUsd) : "–"}
                    </td>
                    <td className="whitespace-nowrap">
                      <Who ownerId={r.ownerId} />
                    </td>
                    <td className="num text-[length:var(--text-note)] text-ink-2">
                      {when(r.createdAt)}
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

/**
 * The dot is the fast read; the word beside it is the fact, so nothing here
 * depends on hue. Aborted is hollow — the call was called off, not lost.
 */
function dotFor(status: "ok" | "error" | "aborted" | "timeout"): string {
  if (status === "ok") return " is-ok";
  if (status === "aborted") return " is-off";
  return " is-bad";
}
