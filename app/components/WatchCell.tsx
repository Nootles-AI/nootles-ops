import type { FeedbackListRow, PrState } from "@/lib/api";
import { PrIcon } from "./PrIcon";

/**
 * The row's one piece of the machine's paper: everything the night shift did
 * to this ticket, in 84px.
 *
 * Five separate optional columns used to carry this — a PR glyph, a PR count,
 * an "omitted" pill, a score, and the gaps between them — so no two rows put
 * the same fact at the same x and the column could not be read downward. Here
 * they are one cell on one tint, which turns two hundred of them into a band.
 *
 * The band is the point. What you are looking for at 7am is not what the
 * agent did, it is where it never got to, and that is only legible as a gap.
 */

/**
 * Which of a ticket's pull requests speaks for it: the furthest along, so a
 * merged PR beside an abandoned one reads as merged.
 */
const PR_RANK: PrState[] = ["merged", "open", "draft", "closed"];

function leadPr(states: PrState[]): PrState | null {
  return PR_RANK.find((s) => states.includes(s)) ?? null;
}

export function WatchCell({
  row,
  threshold,
}: {
  row: FeedbackListRow;
  /** From /agent. Below it, the agent will not pick the ticket up tonight. */
  threshold?: number;
}) {
  const lead = leadPr(row.prStates);
  const scored = row.triageScore !== undefined;

  // Nothing here at all, and nobody stopped it: the night shift simply did
  // not reach this one.
  const unsigned =
    !row.agentSkip &&
    !scored &&
    row.agentAttemptedAt === undefined &&
    row.prStates.length === 0;

  const said = [
    row.agentSkip && "omitted from agent review",
    scored && `scored ${row.triageScore}`,
    threshold !== undefined && scored
      ? row.triageScore! >= threshold
        ? "above tonight's threshold"
        : "below tonight's threshold"
      : null,
    row.agentOutcome === "failed" && "the attempt failed",
    row.agentOutcome === "declined" && "the agent declined it",
    lead && `${row.prStates.length} pull request${row.prStates.length > 1 ? "s" : ""}, ${lead}`,
    unsigned && "not handed to the agent yet",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span
      className={`ops-cell${unsigned ? " is-unsigned" : ""}${
        row.agentSkip ? " is-omitted" : ""
      }`}
      title={said}
    >
      <span className="sr-only">{said}</span>
      {(row.agentOutcome === "declined" || row.agentOutcome === "failed") && (
        <span className={`ops-outcome is-${row.agentOutcome}`} aria-hidden />
      )}
      {lead && (
        <>
          <PrIcon state={lead} />
          {row.prStates.length > 1 && (
            <span className="ops-prcount" aria-hidden>
              {row.prStates.length}
            </span>
          )}
        </>
      )}
      {scored && (
        <span
          aria-hidden
          className={`ops-score${
            threshold === undefined
              ? "" // The bar itself is still arriving; claim nothing yet.
              : row.triageScore! >= threshold
                ? " is-over"
                : " is-under"
          }${row.agentOutcome === "failed" ? " is-failed" : ""}`}
        >
          {row.triageScore}
        </span>
      )}
    </span>
  );
}
