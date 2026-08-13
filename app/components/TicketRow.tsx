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

  // Said once, shown twice: three 8px squares name nothing on their own, so
  // the sentence has to be spoken as well as hung on the group as a tooltip.
  const carries = [
    row.screenshotUrl ? "screenshot" : "no screenshot",
    row.replayUrl ? "replay" : "no replay",
    row.consoleLog ? "console tail" : "no console tail",
  ].join(" · ");

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

      {/* Three fixed slots, lit or unlit — absence drawn rather than left as
          a hole, so the column can be read downward. Above the hit area like
          the watch cell beside it, or the link's overlay swallows the hover
          and the only key to which square is which never opens. */}
      <span className="ops-carries ops-over" title={carries}>
        <span className="sr-only">{carries}</span>
        <i className={row.screenshotUrl ? "is-on" : ""} aria-hidden />
        <i className={row.replayUrl ? "is-on" : ""} aria-hidden />
        <i className={row.consoleLog ? "is-on" : ""} aria-hidden />
      </span>

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
