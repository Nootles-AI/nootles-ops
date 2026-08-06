"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { adminApi } from "@/lib/api";
import { pctOf, usd, when } from "@/lib/format";
import { useAdminToken } from "@/lib/session";
import { RangeChips, useRange } from "./components/Range";

export default function Overview() {
  const token = useAdminToken();
  const { range, setRange, sinceMs } = useRange();
  const calls = useQuery(adminApi.aiCallStats, { token, sinceMs });
  const suggestions = useQuery(adminApi.suggestionStats, { token, sinceMs });
  const chat = useQuery(adminApi.chatStats, { token, sinceMs });
  const users = useQuery(adminApi.userStats, { token, sinceMs });
  const newFeedback = useQuery(adminApi.feedbackList, {
    token,
    paginationOpts: { numItems: 100, cursor: null },
    status: "new",
  });
  const surveys = useQuery(adminApi.surveyList, { token });

  const cost = calls?.features.reduce((s, f) => s + f.costUsd, 0) ?? 0;
  const shown = suggestions?.kinds.reduce((s, k) => s + k.shown, 0) ?? 0;
  const accepted = suggestions?.kinds.reduce((s, k) => s + k.accepted, 0) ?? 0;
  const survivalCount =
    suggestions?.kinds.reduce((s, k) => s + k.survivalCount, 0) ?? 0;
  const survivalTotal =
    suggestions?.kinds.reduce((s, k) => s + k.survivalTotal, 0) ?? 0;
  const pmf = surveys?.filter((s) => s.survey === "pmf" && !s.dismissed) ?? [];
  const reasons =
    surveys?.filter((s) => s.survey === "dismiss_reason" && s.answer) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Overview</h1>
        <RangeChips range={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Users"
          value={(users?.totalUsers ?? 0).toLocaleString()}
          note={users ? `+${users.newUsers} new in range` : "…"}
        />
        <Stat
          label="Active users"
          value={(users?.activeUsers ?? 0).toLocaleString()}
          note={
            users?.totalUsers
              ? `${Math.round((users.activeUsers / users.totalUsers) * 100)}% of everyone`
              : "…"
          }
        />
        <Stat
          label="Pages created"
          value={(users?.pagesCreated ?? 0).toLocaleString()}
          note="in range"
        />
        <Stat
          label="Reports filed"
          value={(users?.reports ?? 0).toLocaleString()}
          note="in range"
        />
        <Stat
          label="Model spend"
          value={usd(cost)}
          note={calls ? `${calls.sampled} calls` : "…"}
        />
        <Stat
          label="Suggestions shown"
          value={shown.toLocaleString()}
          note={`${pctOf(accepted, shown)} accepted`}
        />
        <Stat
          label="Survival avg"
          value={
            survivalCount
              ? `${Math.round((survivalTotal / survivalCount) * 100)}%`
              : "–"
          }
          note={`${survivalCount} scored`}
        />
        <Stat
          label="Chat turns"
          value={(chat?.turns ?? 0).toLocaleString()}
          note={chat ? `${chat.rewound} rewound` : "…"}
        />
      </div>

      <section className="ops-card">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="ops-meta">Feedback inbox</h2>
          <Link
            href="/feedback"
            className="text-[13px] text-muted hover:text-foreground"
          >
            Open inbox →
          </Link>
        </header>
        {newFeedback === undefined ? (
          <p className="p-4 text-muted">Loading…</p>
        ) : newFeedback.page.length === 0 ? (
          <p className="p-4 text-[13px] text-muted">
            Nothing new. Reports land here with their screenshot, console tail,
            and replay link.
          </p>
        ) : (
          <ul>
            {newFeedback.page.slice(0, 6).map((f) => (
              <li key={f._id} className="border-b border-border last:border-none">
                <Link
                  href={`/feedback/${f._id}`}
                  className="flex items-baseline gap-3 px-4 py-2.5 hover:bg-sunken"
                >
                  <span className="ops-dot is-new shrink-0 self-center" />
                  <span className="ops-meta shrink-0">
                    {f.kind === "issue" ? "bug" : "wish"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px]">
                    {f.text}
                  </span>
                  <span className="shrink-0 text-[12px] text-faint">
                    {when(f.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-3 lg:grid-cols-3">
        <section className="ops-card p-4">
          <h2 className="ops-meta">Who they are</h2>
          {users?.roles.length ? (
            <ul className="mt-2 space-y-1 text-[13px]">
              {users.roles.map((r) => (
                <li key={r.role} className="flex justify-between">
                  <span className="truncate">{r.role}</span>
                  <span className="ml-3 shrink-0 text-muted">{r.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13px] text-muted">
              No accounts yet — the survey&rsquo;s role answers land here.
            </p>
          )}
        </section>
        <section className="ops-card p-4">
          <h2 className="ops-meta">PMF · &ldquo;how disappointed?&rdquo;</h2>
          {pmf.length === 0 ? (
            <p className="mt-2 text-[13px] text-muted">
              No answers yet — the question shows once, on day 3, to users with
              an accepted suggestion.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-[13px]">
              {tally(pmf.map((s) => s.answer ?? "")).map(([answer, n]) => (
                <li key={answer} className="flex justify-between">
                  <span>{answer}</span>
                  <span className="text-muted">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="ops-card p-4">
          <h2 className="ops-meta">Dismiss reasons · sampled</h2>
          {reasons.length === 0 ? (
            <p className="mt-2 text-[13px] text-muted">
              No samples yet — asked after every ~15th dismissed suggestion.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-[13px]">
              {tally(reasons.map((s) => s.answer ?? "")).map(([answer, n]) => (
                <li key={answer} className="flex justify-between">
                  <span>{answer}</span>
                  <span className="text-muted">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="ops-card p-4">
      <p className="ops-meta">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      <p className="mt-0.5 text-[12px] text-muted">{note}</p>
    </div>
  );
}

function tally(values: string[]): [string, number][] {
  const map = new Map<string, number>();
  for (const value of values) map.set(value, (map.get(value) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}
