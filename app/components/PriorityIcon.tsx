import type { TicketPriority } from "@/lib/api";

/**
 * Linear's priority vocabulary: ascending bars for low/medium/high, a filled
 * square wearing an exclamation for urgent, three faint dots for none.
 *
 * Priority carries no colour, and that is deliberate — the bars are drawn in
 * the muted tier and only Urgent is tinted. A red/amber/green priority ramp is
 * the loudest thing that separates a dashboard from the one it is modelled on.
 */
export function PriorityIcon({ priority }: { priority?: TicketPriority }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 14 14",
    role: "img",
    "aria-label": priority ?? "no priority",
    className: "shrink-0",
  };
  if (priority === "urgent") {
    return (
      <svg {...common}>
        <rect x="1" y="1" width="12" height="12" rx="3" fill="var(--urgent)" />
        <path
          d="M7 3.8v3.9"
          stroke="var(--sheet)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="7" cy="10.1" r="0.9" fill="var(--sheet)" />
      </svg>
    );
  }
  if (!priority) {
    return (
      <svg {...common}>
        <circle cx="3" cy="7" r="1" fill="var(--ink-3)" />
        <circle cx="7" cy="7" r="1" fill="var(--ink-3)" />
        <circle cx="11" cy="7" r="1" fill="var(--ink-3)" />
      </svg>
    );
  }
  const lit = { low: 1, medium: 2, high: 3 }[priority];
  const bars = [
    { x: 1.5, y: 8, h: 4 },
    { x: 5.75, y: 5, h: 7 },
    { x: 10, y: 2, h: 10 },
  ];
  return (
    <svg {...common}>
      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={b.y}
          width="2.5"
          height={b.h}
          rx="1"
          fill={i < lit ? "var(--ink-2)" : "var(--rule)"}
        />
      ))}
    </svg>
  );
}
