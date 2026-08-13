"use client";

import Link from "next/link";
import {
  CATEGORY_CODES,
  CATEGORY_LABELS,
  KIND_WORDS,
  type FeedbackListRow,
} from "@/lib/api";
import { ticketName, when } from "@/lib/format";
import { Kebab } from "./Menu";
import { PriorityIcon } from "./PriorityIcon";
import { StatusIcon } from "./StatusIcon";
import { WatchCell } from "./WatchCell";
import { Who } from "./Who";

/**
 * A ticket, on one line. The same line wherever a ticket appears — the
 * Overview's unread list used to look identical to the inbox's rows and
 * behave differently, which is a lie the row itself was telling.
 *
 * The row is a grid and the title's link stretches over it, rather than a
 * link wrapping the whole row. That is what lets the reporter and the kebab
 * be real controls instead of dead affordances nested inside another link.
 */
export function TicketRow({
  row,
  threshold,
  onMenu,
  menuOpen,
}: {
  row: FeedbackListRow;
  /** Tonight's score threshold, from /agent. */
  threshold?: number;
  /** Omit to render a row with no actions. */
  onMenu?: (at: { x: number; y: number }, row: FeedbackListRow) => void;
  menuOpen?: boolean;
}) {
  const unread = row.status === "new";
  const category = row.category ?? "general";

  // The marks say it by shape; this says it in words, for the tooltip and for
  // anything listening rather than looking. Empty when the report brought
  // nothing — most rows — so that neither the tooltip nor the screen reader
  // announces an absence two hundred times over.
  const carries = [
    row.screenshotUrl && "a screenshot",
    row.replayUrl && "a replay",
    row.consoleLog && "a console tail",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={`ops-row${unread ? " is-unread" : ""}`}
      onContextMenu={
        onMenu
          ? (e) => {
              e.preventDefault();
              onMenu({ x: e.clientX, y: e.clientY }, row);
            }
          : undefined
      }
    >
      <span className="ops-slot-dot flex justify-center" aria-hidden>
        {unread && <span className="ops-unread" />}
      </span>
      <span className="ops-slot-pri flex justify-center">
        <PriorityIcon priority={row.priority} />
      </span>
      <span className="ops-slot-sta flex justify-center">
        <StatusIcon status={row.status} />
      </span>

      <span className="ops-id">{ticketName(row.number)}</span>
      <span className="ops-kind">{KIND_WORDS[row.kind].short}</span>

      <Link href={`/feedback/${ticketName(row.number)}`} className="ops-row-hit">
        {row.text}
      </Link>

      {/* What the report brought with it. These were three identical squares,
          lit or unlit, on the theory that drawing the absent ones let the
          column be read downward — but three identical squares are a code
          nobody is issued the key to, and the unlit ones are what turned real
          marks into an abstract pattern. Now each is its own shape and is
          drawn only when the ticket actually carries it. Above the hit area,
          or the row link's overlay swallows the tooltip. */}
      {carries ? (
        <span className="ops-carries ops-over" title={carries}>
          <span className="sr-only">Carries {carries}</span>
          {row.screenshotUrl && <ShotMark />}
          {row.replayUrl && <ReplayMark />}
          {row.consoleLog && <ConsoleMark />}
        </span>
      ) : (
        // The track still needs its child or every column after it shifts.
        <span className="ops-carries" aria-hidden />
      )}

      {/* The words while there is room for them; three letters when there is
          not. The full label stays as the title either way, and the filter's
          dropdown lists all ten in words. */}
      <span className="ops-cat" title={CATEGORY_LABELS[category]}>
        <span className="ops-cat-word">{CATEGORY_LABELS[category]}</span>
        <span className="ops-cat-code" aria-hidden>
          {CATEGORY_CODES[category]}
        </span>
      </span>

      <WatchCell row={row} threshold={threshold} />

      <span className="ops-slot-who ops-over min-w-0">
        <Who ownerId={row.ownerId} />
      </span>

      <span className="ops-age">{when(row.createdAt)}</span>

      {onMenu && (
        <Kebab
          open={!!menuOpen}
          label={`Actions for ${ticketName(row.number)}`}
          onOpen={(at) => onMenu(at, row)}
        />
      )}
    </div>
  );
}

/* Three marks, told apart by silhouette rather than by position: a framed
   picture, a play triangle, a prompt. Each is 12px, drawn in the muted tier,
   and named by the group's tooltip and its screen-reader line. */

const mark = {
  width: 12,
  height: 12,
  viewBox: "0 0 12 12",
  "aria-hidden": true,
  className: "shrink-0",
} as const;

/**
 * A screenshot was taken at report time.
 *
 * The first cut of this drew a full mountain range across the frame and the
 * strokes fused into its left, bottom and right walls, so at 12px it read as
 * a filled rectangle — the exact thing three identical squares were doing. A
 * frame, one peak, one sun, and a pixel of air between the peak and every
 * wall, is the most that fits at this size.
 */
function ShotMark() {
  return (
    <svg {...mark}>
      <rect
        x="1.1"
        y="2.1"
        width="9.8"
        height="7.8"
        rx="1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.05"
      />
      <circle cx="4.1" cy="4.9" r="0.95" fill="currentColor" />
      <path
        d="M3.1 8.6 6.1 5.9l2.6 2.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.05"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A session replay can be watched. */
function ReplayMark() {
  return (
    <svg {...mark}>
      <circle
        cx="6"
        cy="6"
        r="5.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M4.9 3.9 8.4 6l-3.5 2.1z" fill="currentColor" />
    </svg>
  );
}

/**
 * The console tail came with it. A prompt: the chevron and the line it types
 * on, weighted to hold its own beside the framed picture and the play ring,
 * and centred rather than sitting low in the box.
 */
function ConsoleMark() {
  return (
    <svg {...mark}>
      <path
        d="M1.9 3.3 5.1 6.2 1.9 9.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.7 9.1h3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
