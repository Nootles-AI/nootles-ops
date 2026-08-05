"use client";

import { useQuery } from "convex/react";
import { adminApi } from "@/lib/api";
import { ms, shortUser, usd, when } from "@/lib/format";
import { useAdminToken } from "@/lib/session";
import { RangeChips, useRange } from "../components/Range";

export default function Calls() {
  const token = useAdminToken();
  const { range, setRange, sinceMs } = useRange();
  const stats = useQuery(adminApi.aiCallStats, { token, sinceMs });
  const recent = useQuery(adminApi.aiCallRecent, { token, limit: 50 });

  const maxDay = Math.max(...(stats?.costByDay.map((d) => d.costUsd) ?? [0]), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">AI calls</h1>
        <RangeChips range={range} onChange={setRange} />
      </div>

      <section className="ops-card overflow-x-auto">
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
            {stats?.features.map((f) => (
              <tr key={f.feature}>
                <td className="font-medium">{f.feature}</td>
                <td className="num">{f.calls.toLocaleString()}</td>
                <td className="num">{f.errors || "–"}</td>
                <td className="num">{f.aborted || "–"}</td>
                <td className="num">{f.promptTokens.toLocaleString()}</td>
                <td className="num">{f.completionTokens.toLocaleString()}</td>
                <td className="num">{ms(f.p50)}</td>
                <td className="num">{ms(f.p95)}</td>
                <td className="num">{usd(f.costUsd)}</td>
              </tr>
            ))}
            {stats && stats.features.length === 0 && (
              <tr>
                <td colSpan={9} className="text-muted">
                  No calls in this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="ops-card p-4">
          <h2 className="ops-meta mb-3">Cost by day</h2>
          {stats?.costByDay.length ? (
            <ul className="space-y-1.5">
              {stats.costByDay.map((d) => (
                <li key={d.day} className="flex items-center gap-3 text-[12px]">
                  <span className="w-20 shrink-0 font-mono text-muted">
                    {d.day.slice(5)}
                  </span>
                  <span className="h-2 rounded-sm bg-foreground/70"
                    style={{
                      width: `${maxDay ? Math.max((d.costUsd / maxDay) * 100, 2) : 2}%`,
                    }}
                  />
                  <span className="shrink-0 tabular-nums text-muted">
                    {usd(d.costUsd)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted">Nothing yet.</p>
          )}
        </section>
        <section className="ops-card p-4">
          <h2 className="ops-meta mb-3">Top spenders</h2>
          {stats?.spenders.length ? (
            <ul className="space-y-1.5">
              {stats.spenders.slice(0, 8).map((s) => (
                <li
                  key={s.ownerId}
                  className="flex justify-between text-[12px]"
                >
                  <span className="font-mono text-muted">{shortUser(s.ownerId)}</span>
                  <span className="tabular-nums">{usd(s.costUsd)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted">Nothing yet.</p>
          )}
        </section>
      </div>

      <section className="ops-card overflow-x-auto">
        <header className="border-b border-border px-4 py-3">
          <h2 className="ops-meta">Latest</h2>
        </header>
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
            {recent?.map((r) => (
              <tr key={r._id}>
                <td className="font-medium">{r.feature}</td>
                <td className="whitespace-nowrap text-[12px]">
                  <span
                    className={`ops-dot${
                      r.status === "ok"
                        ? " is-ok"
                        : r.status === "aborted"
                          ? ""
                          : " is-bad"
                    }`}
                  />{" "}
                  {r.status}
                  {r.errorCode ? ` · ${r.errorCode}` : ""}
                </td>
                <td className="num">{r.promptTokens?.toLocaleString() ?? "–"}</td>
                <td className="num">{r.completionTokens?.toLocaleString() ?? "–"}</td>
                <td className="num">{r.ttfbMs !== undefined ? ms(r.ttfbMs) : "–"}</td>
                <td className="num">{ms(r.latencyMs)}</td>
                <td className="num">{r.costUsd !== undefined ? usd(r.costUsd) : "–"}</td>
                <td className="whitespace-nowrap font-mono text-[12px] text-muted">
                  {shortUser(r.ownerId)}
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
