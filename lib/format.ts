export function usd(n: number): string {
  if (n === 0) return "$0";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

export function when(ms: number): string {
  const mins = Math.floor((Date.now() - ms) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function ms(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${Math.round(n)}ms`;
}

/**
 * The wall-clock time, which is what the night is measured in. `when` answers
 * "how long ago"; this answers "at what hour" — the question the handover
 * strip and the watch readout are both asking.
 */
export function clock(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function pctOf(part: number, whole: number): string {
  return whole ? `${Math.round((part / whole) * 100)}%` : "–";
}

/** A user id shortened to something scannable in a table. */
export function shortUser(id: string): string {
  return id.replace(/^user_/, "").slice(0, 8);
}

/**
 * A ticket's name. The one spelling of it — the dashboard's URLs, the copy
 * button, and the PR title convention (`NT-42_what_was_fixed`) are all this
 * string, so a PR can name the ticket it fixes and be found again.
 */
export function ticketName(number: number): string {
  return `NT-${number}`;
}

/**
 * The number out of a `NT-42` route segment, or null. Lenient about case and a
 * trailing slug so a pasted PR branch name resolves too; strict about the rest,
 * since a wrong ticket is worse than a 404.
 */
export function ticketNumber(segment: string): number | null {
  const match = /^NT-(\d+)(?:_|$)/i.exec(decodeURIComponent(segment));
  return match ? Number(match[1]) : null;
}
