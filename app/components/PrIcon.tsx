import type { PrState } from "@/lib/api";

/**
 * GitHub's pull-request states, redrawn in this palette the way `StatusIcon`
 * redraws Linear's — one branch metaphor held across all four, so the shape
 * says "pull request" and the colour says which kind.
 *
 * Draft is hollow and grey (begun, not offered), open is green with both
 * branches live, merged curves the right branch into the left, and closed
 * crosses it out.
 */
export function PrIcon({ state }: { state: PrState }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 14 14",
    role: "img",
    "aria-label": `pull request ${state}`,
    className: "shrink-0",
  };
  const color = `var(--pr-${state})`;
  const line = {
    stroke: color,
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    fill: "none",
  };

  if (state === "merged") {
    return (
      <svg {...common}>
        <circle cx="4" cy="3" r="1.7" fill={color} />
        <path d="M4 4.7v6.6" {...line} />
        <circle cx="4" cy="11" r="1.7" fill={color} />
        {/* The right branch bends back into the left one — the merge itself. */}
        <path d="M10 4.7v1.1A2.6 2.6 0 0 1 7.4 8.4H5.7" {...line} />
        <circle cx="10" cy="3" r="1.7" fill={color} />
      </svg>
    );
  }

  if (state === "closed") {
    return (
      <svg {...common}>
        <circle cx="4" cy="3" r="1.7" fill={color} />
        <path d="M4 4.7v6.6" {...line} />
        <circle cx="4" cy="11" r="1.7" fill={color} />
        {/* The branch that was never taken, struck out where it would have
            joined — no dangling stub, or it reads as a third branch. */}
        <path d="M8 6.6 12 10.6M12 6.6 8 10.6" {...line} />
      </svg>
    );
  }

  // Draft and open share their geometry; only weight and colour differ. The
  // strokes stay solid in both: this glyph is drawn inside the watch cell,
  // where dashed already means the machine never acted — and a draft PR is
  // proof that it did.
  const hollow = state === "draft";
  return (
    <svg {...common}>
      <circle
        cx="4"
        cy="3"
        r="1.7"
        fill={hollow ? "none" : color}
        stroke={color}
        strokeWidth={hollow ? 1.4 : 0}
      />
      <path d="M4 4.7v6.6" {...line} />
      <circle
        cx="4"
        cy="11"
        r="1.7"
        fill={hollow ? "none" : color}
        stroke={color}
        strokeWidth={hollow ? 1.4 : 0}
      />
      <path d="M10 4.7v4.6" {...line} />
      <circle
        cx="10"
        cy="3"
        r="1.7"
        fill={hollow ? "none" : color}
        stroke={color}
        strokeWidth={hollow ? 1.4 : 0}
      />
      <circle
        cx="10"
        cy="11"
        r="1.7"
        fill="none"
        stroke={color}
        strokeWidth="1.4"
      />
    </svg>
  );
}
