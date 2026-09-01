import type { FeedbackListRow } from "@/lib/api";

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
 *
 * The glyph and the count are gone with the PR link, and the cell keeps its
 * width: the band is what is being read, and a band that narrows because a
 * fact was retired is a band that has to be re-learned.
 */

export function WatchCell({
  row,
  threshold,
}: {
  row: FeedbackListRow;
  /** From /agent. Below it, the agent will not pick the ticket up tonight. */
  threshold?: number;
}) {
  const scored = row.triageScore !== undefined;

  // Nothing here at all, and nobody stopped it: the night shift simply did
  // not reach this one.
  const unsigned =
    !row.agentSkip && !scored && row.agentAttemptedAt === undefined;

  const said = [
    row.agentSkip && "omitted from agent review",
    scored && `scored ${row.triageScore}`,
    threshold !== undefined && scored
      ? row.triageScore! >= threshold
        ? "above tonight's threshold"
        : "below tonight's threshold"
      : null,
    row.agentOutcome === "filed" && "a fix was filed",
    row.agentOutcome === "failed" && "the attempt failed",
    row.agentOutcome === "declined" && "the agent declined it",
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
      {/* All three outcomes now, not two. `filed` used to be spoken by the PR
          glyph beside this square, and with the glyph gone it would otherwise
          be the one thing the agent can do that leaves no mark in the inbox —
          a filed ticket drawn exactly like an untouched scored one. */}
      {row.agentOutcome && (
        <span className={`ops-outcome is-${row.agentOutcome}`} aria-hidden />
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
