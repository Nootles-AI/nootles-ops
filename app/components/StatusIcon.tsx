import type { TicketStatus } from "@/lib/api";

/**
 * Linear's status vocabulary, redrawn in this palette: dashed circle for the
 * untriaged, empty for seen, half-filled amber for in progress, green check
 * for done, crossed gray for declined.
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
    case "new":
      return (
        <svg {...common}>
          <circle
            cx="7"
            cy="7"
            r="5.25"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="1.5"
            strokeDasharray="2.4 2.2"
          />
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
            stroke="var(--muted)"
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
            stroke="var(--warn)"
            strokeWidth="1.5"
          />
          <path d="M7 3.75 A3.25 3.25 0 0 1 7 10.25 Z" fill="var(--warn)" />
        </svg>
      );
    case "done":
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="6" fill="var(--ok)" />
          <path
            d="M4.4 7.2 6.2 9l3.4-3.8"
            fill="none"
            stroke="#fff"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "declined":
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="6" fill="var(--faint)" />
          <path
            d="M4.8 4.8l4.4 4.4M9.2 4.8l-4.4 4.4"
            stroke="#fff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}
