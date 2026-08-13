"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { adminApi } from "@/lib/api";
import { pctOf, usd } from "@/lib/format";
import { useOps } from "@/lib/ops";
import { useAdminToken } from "@/lib/session";
import { Empty, Instrument, Loading, Panel } from "./components/Bits";
import { HorizonStrip } from "./components/HorizonStrip";
import { RangeChips, useRange } from "./components/Range";
import { TicketRow } from "./components/TicketRow";

/**
 * THE OVERVIEW — one question: what happened overnight, and what does it want
 * from me?
 *
 * The handover strip answers the first half and takes the top of the page; the
 * instruments are the standing facts, deliberately quieter than the strip and
 * on one line rather than in eight equal boxes. Everything on this page except
 * the strip's lower half is the humans' side of the line: survey answers and
 * unread reports are people's work, and tinting them would spend the machine's
 * paper on something the machine did not write.
 */
export default function Overview() {
  const token = useAdminToken();
  const { range, setRange, sinceMs } = useRange();
  const { config } = useOps();

  const calls = useQuery(adminApi.aiCallStats, { token, sinceMs });
  const suggestions = useQuery(adminApi.suggestionStats, { token, sinceMs });
  const chat = useQuery(adminApi.chatStats, { token, sinceMs });
  const users = useQuery(adminApi.userStats, { token, sinceMs });
  const surveys = useQuery(adminApi.surveyList, { token });

  // One list serves both the strip and the unread panel. The strip plots every
  // report in its window — an unread filter would hide the ones already
  // triaged, which is exactly the traffic the night is measured against — so
  // the query carries no status and the panel filters what it needs. It also
  // asks for the duplicates the server hides by default: linking them is one
  // of the night's jobs, and a strip that drops them contradicts the very
  // sentence above it ("8 reports in… linked 4 duplicates").
  const reports = useQuery(adminApi.feedbackList, {
    token,
    paginationOpts: { numItems: 200, cursor: null },
    includeDuplicates: true,
  });
  const runs = useQuery(adminApi.runList, { token, limit: 20 });

  // The inbox does not show duplicates, so neither does the count that points
  // at it. And the page is capped at 200, which makes that count a floor —
  // the same trailing + the instruments wear, for the same reason.
  const unread = reports?.page.filter(
    (f) => f.status === "new" && !f.duplicateOf,
  );
  const moreUnread = reports?.isDone === false;

  const cost = calls?.features.reduce((s, f) => s + f.costUsd, 0);
  const shown = suggestions?.kinds.reduce((s, k) => s + k.shown, 0);
  const accepted = suggestions?.kinds.reduce((s, k) => s + k.accepted, 0);
  const survivalCount = suggestions?.kinds.reduce(
    (s, k) => s + k.survivalCount,
    0,
  );
  const survivalTotal = suggestions?.kinds.reduce(
    (s, k) => s + k.survivalTotal,
    0,
  );

  // Both tallies count answers, so both want answered rows: a survey row with
  // no answer would tally under an empty label and draw a nameless line.
  const pmf = surveys?.filter(
    (s) => s.survey === "pmf" && !s.dismissed && s.answer,
  );
  const reasons = surveys?.filter(
    (s) => s.survey === "dismiss_reason" && s.answer,
  );

  return (
    <div className="space-y-8">
      {/* The title leads so the heading outline is honest — the strip's own
          "The night's take" is a section within the page, not above it — and
          so the range chips sit beside the figures they govern rather than
          beside the strip, which keeps its own fixed overnight window. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="ops-title">Overview</h1>
        <RangeChips range={range} onChange={setRange} />
      </div>

      <HorizonStrip reports={reports?.page} runs={runs} />

      {/* Eight facts on one rule-divided line. A value that has not arrived is
          an em-dash: a real-looking zero is a lie about what you are reading.
          A trailing + is the other half of that promise — three of these
          figures are sums over a sample the query caps, and a capped sum is a
          floor, not a total. */}
      <div className="ops-instruments">
        <Instrument
          label="Users"
          value={
            users &&
            `${users.totalUsers.toLocaleString()}${users.totalCapped ? "+" : ""}`
          }
          note={users && `+${users.newUsers.toLocaleString()} new in range`}
        />
        <Instrument
          label="Active users"
          value={users && users.activeUsers.toLocaleString()}
          note={
            users &&
            (users.totalUsers
              ? `${pctOf(users.activeUsers, users.totalUsers)} of everyone`
              : "no accounts yet")
          }
        />
        <Instrument
          label="Pages created"
          value={users && users.pagesCreated.toLocaleString()}
          note="in range"
        />
        <Instrument
          label="Reports filed"
          value={users && users.reports.toLocaleString()}
          note="in range"
        />
        <Instrument
          label="Model spend"
          value={
            cost === undefined
              ? undefined
              : `${usd(cost)}${calls?.capped ? "+" : ""}`
          }
          note={calls && `${calls.sampled.toLocaleString()} calls`}
        />
        <Instrument
          label="Suggestions shown"
          value={
            shown === undefined
              ? undefined
              : `${shown.toLocaleString()}${suggestions?.capped ? "+" : ""}`
          }
          note={
            shown === undefined || accepted === undefined
              ? undefined
              : shown === 0
                ? "none shown in range"
                : `${pctOf(accepted, shown)} accepted`
          }
        />
        <Instrument
          label="Survival avg"
          value={
            survivalCount === undefined || survivalTotal === undefined
              ? undefined
              : pctOf(survivalTotal, survivalCount)
          }
          note={
            survivalCount === undefined
              ? undefined
              : `${survivalCount.toLocaleString()} scored`
          }
        />
        <Instrument
          label="Chat turns"
          value={chat && chat.turns.toLocaleString()}
          note={chat && `${chat.rewound.toLocaleString()} rewound`}
        />
      </div>

      <Panel
        title="Unread"
        aside={
          <>
            {unread && (
              <span className="ops-mono text-ink-3">
                {unread.length}
                {moreUnread ? "+" : ""}
              </span>
            )}
            <Link
              href="/feedback"
              className="text-[length:var(--text-ui)] text-ink-2 hover:text-ink"
            >
              Open the inbox →
            </Link>
          </>
        }
      >
        {unread === undefined ? (
          <Loading />
        ) : unread.length === 0 ? (
          <Empty>
            Inbox zero — reports land here with their screenshot, console tail
            and replay link.
          </Empty>
        ) : (
          // The same line the inbox draws. The two lists used to look identical
          // and behave differently, which is a lie the row itself was telling.
          <>
            <ul className="ops-rows">
              {unread.slice(0, 6).map((f) => (
                <li key={f._id}>
                  <TicketRow row={f} threshold={config?.scoreThreshold} />
                </li>
              ))}
            </ul>
            {/* Six rows under a header that says forty-seven needs a sentence,
                or the count reads as a miscount. */}
            {unread.length > 6 && (
              <p className="ops-note border-t border-rule px-2.5 py-2">
                {unread.length - 6}
                {moreUnread ? "+" : ""} more in the inbox.
              </p>
            )}
          </>
        )}
      </Panel>

      {/* Survey answers, written by people. Sheet, never Watch. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Who they are">
          {users === undefined ? (
            <Loading />
          ) : users.roles.length === 0 ? (
            <Empty>
              No accounts yet — the survey&rsquo;s role answers land here.
            </Empty>
          ) : (
            <Counts rows={users.roles.map((r) => [r.role, r.count])} />
          )}
        </Panel>

        <Panel title="PMF · “how disappointed?”">
          {pmf === undefined ? (
            <Loading />
          ) : pmf.length === 0 ? (
            <Empty>
              No answers yet — the question shows once, on day 3, to users with
              an accepted suggestion.
            </Empty>
          ) : (
            <Counts rows={tally(pmf.map((s) => s.answer ?? ""))} />
          )}
        </Panel>

        <Panel title="Dismiss reasons · sampled">
          {reasons === undefined ? (
            <Loading />
          ) : reasons.length === 0 ? (
            <Empty>
              No samples yet — asked after every ~15th dismissed suggestion.
            </Empty>
          ) : (
            <Counts rows={tally(reasons.map((s) => s.answer ?? ""))} />
          )}
        </Panel>
      </div>
    </div>
  );
}

/** An answer and how many people gave it. The three tallies are the same shape. */
function Counts({ rows }: { rows: [string, number][] }) {
  return (
    <ul className="space-y-1 p-4 text-[length:var(--text-ui)]">
      {rows.map(([label, n]) => (
        <li key={label} className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate">{label}</span>
          <span className="shrink-0 tabular-nums text-ink-2">{n}</span>
        </li>
      ))}
    </ul>
  );
}

function tally(values: string[]): [string, number][] {
  const map = new Map<string, number>();
  for (const value of values) map.set(value, (map.get(value) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}
