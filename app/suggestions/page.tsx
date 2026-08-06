"use client";

import { useQuery } from "convex/react";
import { adminApi } from "@/lib/api";
import { ms, pctOf, when } from "@/lib/format";
import { useAdminToken } from "@/lib/session";
import { RangeChips, useRange } from "../components/Range";
import { Who } from "../components/Who";

export default function Suggestions() {
  const token = useAdminToken();
  const { range, setRange, sinceMs } = useRange();
  const stats = useQuery(adminApi.suggestionStats, { token, sinceMs });
  const recent = useQuery(adminApi.suggestionRecent, { token, limit: 50 });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Suggestions</h1>
        <RangeChips range={range} onChange={setRange} />
      </div>

      <section className="ops-card overflow-x-auto">
        <table className="ops-table">
          <thead>
            <tr>
              <th>Kind</th>
              <th className="num">Shown</th>
              <th className="num">Accepted</th>
              <th className="num">Accept %</th>
              <th className="num">Dismissed</th>
              <th className="num">Undone&lt;30s</th>
              <th className="num">Survival avg</th>
              <th className="num">Latency avg</th>
              <th className="num">Decision avg</th>
            </tr>
          </thead>
          <tbody>
            {stats?.kinds.map((k) => {
              const total =
                k.accepted + k.dismissed + k.superseded + k.failed + k.gated;
              return (
                <tr key={k.kind}>
                  <td className="font-medium">{k.kind}</td>
                  <td className="num">{k.shown}</td>
                  <td className="num">{k.accepted}</td>
                  <td className="num">{pctOf(k.accepted, k.shown)}</td>
                  <td className="num">{k.dismissed}</td>
                  <td className="num">{k.undone || "–"}</td>
                  <td className="num">
                    {k.survivalCount
                      ? `${Math.round((k.survivalTotal / k.survivalCount) * 100)}%`
                      : "–"}
                  </td>
                  <td className="num">{total ? ms(k.latencyTotal / total) : "–"}</td>
                  <td className="num">
                    {k.decisionCount ? ms(k.decisionTotal / k.decisionCount) : "–"}
                  </td>
                </tr>
              );
            })}
            {stats && stats.kinds.length === 0 && (
              <tr>
                <td colSpan={9} className="text-muted">
                  No suggestions in this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      {stats?.capped && (
        <p className="text-[12px] text-faint">
          Sampled the most recent {stats.sampled.toLocaleString()} rows.
        </p>
      )}

      <section className="ops-card overflow-x-auto">
        <header className="border-b border-border px-4 py-3">
          <h2 className="ops-meta">Latest</h2>
        </header>
        <table className="ops-table">
          <thead>
            <tr>
              <th>Outcome</th>
              <th>Kind</th>
              <th>Suggestion</th>
              <th className="num">Survival</th>
              <th>User</th>
              <th className="num">When</th>
            </tr>
          </thead>
          <tbody>
            {recent?.map((r) => (
              <tr key={r._id}>
                <td className="whitespace-nowrap">
                  <span
                    className={`ops-dot${
                      r.outcome === "accepted"
                        ? " is-ok"
                        : r.outcome === "failed"
                          ? " is-bad"
                          : ""
                    }`}
                  />{" "}
                  <span className="text-[12px]">
                    {r.outcome}
                    {r.dismissReason ? ` · ${r.dismissReason}` : ""}
                  </span>
                </td>
                <td className="ops-meta whitespace-nowrap">{r.kind}</td>
                <td className="max-w-md">
                  <span className="block truncate font-mono text-[12px] text-muted">
                    {r.suggestionText || "—"}
                  </span>
                </td>
                <td className="num text-[12px]">
                  {r.undoneWithinMs !== undefined
                    ? "undone"
                    : r.survivalScore !== undefined
                      ? `${Math.round(r.survivalScore * 100)}%`
                      : "–"}
                </td>
                <td className="whitespace-nowrap">
                  <Who ownerId={r.ownerId} />
                </td>
                <td className="num text-[12px] text-muted">{when(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
