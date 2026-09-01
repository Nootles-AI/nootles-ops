import type { TicketStatus } from "@/lib/api";

/**
 * Linear's status vocabulary, redrawn in this palette: dotted circle for the
 * untriaged, empty for seen, half-filled amber for in progress, green check
 * for done, crossed gray for declined.
 *
 * There was a sixth, `pr_filed` — a closed ring around a waiting centre. It is
 * gone with the GitHub poll that was the only thing that ever set it; a ticket
 * with an unmerged pull request against it is `in_progress`, which is what
 * that glyph was drawing a longer way round.
 *
 * Linear draws the untriaged with a dashed ring. Here it cannot: dashed is
 * spoken for across the whole app — the machine did not act here — and this
 * glyph sits a few pixels from the watch cell, which says exactly that. Status
 * is a human fact, so it is spelled in human marks.
 */
export function StatusIcon({ status }: { status: TicketStatus }) {
  const label = status.replace("_", " ");
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 14 14",
    role: "img",
    "aria-label": label,
    className: "shrink-0",
  };
  switch (status) {
    // The same ring as `seen`, still carrying the row's unread dot: nobody
    // has opened it yet. Seen is that ring with the dot spent.
    case "new":
      return (
        <svg {...common}>
          <circle
            cx="7"
            cy="7"
            r="5.25"
            fill="none"
            stroke="var(--ink-3)"
            strokeWidth="1.5"
          />
          <circle cx="7" cy="7" r="2.25" fill="var(--ink)" />
        </svg>
      );
    case "seen":
      return (
        <svg {...common}>
          <circle
            cx="7"
            cy="7"
            r="5.25"
            fill="none"
            stroke="var(--ink-3)"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "in_progress":
      return (
        <svg {...common}>
          <circle
            cx="7"
            cy="7"
            r="5.25"
            fill="none"
            stroke="var(--ember)"
            strokeWidth="1.5"
          />
          <path d="M7 3.75 A3.25 3.25 0 0 1 7 10.25 Z" fill="var(--ember)" />
        </svg>
      );
    case "done":
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="6" fill="var(--accent)" />
          <path
            d="M4.4 7.2 6.2 9l3.4-3.8"
            fill="none"
            stroke="var(--sheet)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "declined":
      return (
        <svg {...common}>
          {/* Muted, not faint: Ink 4 is the placeholder tier and lands at
              2.6:1 on either paper, so both the disc and the cross knocked
              out of it fall under the 3:1 a glyph has to clear. This is the
              one status an operator must not mistake for `done`. */}
          <circle cx="7" cy="7" r="6" fill="var(--ink-3)" />
          <path
            d="M4.8 4.8l4.4 4.4M9.2 4.8l-4.4 4.4"
            stroke="var(--sheet)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}
