"use client";

import Link from "next/link";
import { clock } from "@/lib/format";
import { useOps } from "@/lib/ops";
import { useSession } from "@/lib/session";

/**
 * The watch readout. The night shift is present on every page as one mono
 * line — armed or not, implementing or triaging, and how the last run went.
 *
 * It is here because the question it answers is the one an operator has
 * before they have chosen a page, and because a run that died at 03:12 used
 * to be visible on no screen at all.
 */
export function WatchReadout() {
  const { token } = useSession();
  const { config, lastRun } = useOps();
  if (!token) return null;

  const off = config && !config.agentEnabled;
  const pip = off
    ? "is-off"
    : lastRun?.status === "ok"
      ? "is-ok"
      : lastRun?.status === "failed"
        ? "is-failed"
        : lastRun?.status === "running"
          ? "is-running"
          : "";

  return (
    <Link
      href="/agent"
      // min-h-6 because at phone width this line is mostly pip and clock, and
      // an 11px row is not a reachable tap target.
      className="ops-readout min-h-6"
      title={
        lastRun
          ? `Last run ${lastRun.kind} · ${lastRun.status} · read ${lastRun.ticketsRead}, scored ${lastRun.scored}, filed ${lastRun.prsFiled}`
          : "The agent has not run yet"
      }
    >
      {/* The word survives below sm even when the label does not: without it a
          narrow header leaves this link with no name but its href. Not the
          section-heading class — a label set larger than its own value inverts
          the hierarchy, so it takes the readout's size and only the UI weight. */}
      <span className="font-medium sr-only sm:not-sr-only sm:inline">
        Watch
      </span>
      <span className={`ops-pip ${pip}`} aria-hidden />
      {/* Armed or not is a word at every width. The pip is the same seven
          pixels whether the night went well or died at 03:12, so hue alone
          cannot be the only thing carrying the state. */}
      <span>
        {config === undefined ? "—" : off ? "off" : "on"}
        {config && !off && (
          <span className="hidden min-[900px]:inline">
            {config.implementEnabled ? " · implementing" : " · triage only"}
          </span>
        )}
      </span>
      {lastRun && (
        <>
          <span className="hidden min-[900px]:inline text-ink-3" aria-hidden>
            ·
          </span>
          <span>
            <span className="hidden min-[1180px]:inline">last run </span>
            {clock(lastRun.startedAt)}
          </span>
          <span>
            {lastRun.status === "running"
              ? "running"
              : lastRun.status === "failed"
                ? "failed"
                : "ok"}
            {lastRun.status === "ok" && (
              <span className="hidden min-[900px]:inline">
                {` · ${lastRun.prsFiled} filed`}
              </span>
            )}
          </span>
        </>
      )}
    </Link>
  );
}
