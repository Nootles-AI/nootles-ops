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
  return day(ms);
}

/**
 * `when`, narrow enough for the inbox row's age track, which is sized for
 * "59m ago". Past a week `when` gives the day, and a day from another year
 * cannot carry its year in that width ("Dec 20, 2025" is 77px of a 52px
 * track) — so it gives up the day for the year: "Dec ’25". The row keeps the
 * full date in its title.
 */
export function age(at: number): string {
  const date = new Date(at);
  if (
    Date.now() - at < 7 * 24 * 60 * 60_000 ||
    date.getFullYear() === new Date().getFullYear()
  ) {
    return when(at);
  }
  const month = date.toLocaleDateString(undefined, { month: "short" });
  return `${month} ’${String(date.getFullYear()).slice(-2)}`;
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

/**
 * The day an instant falls on. Deadlines use it directly — when a plan renews,
 * a code closes, a grant runs out — because `when` counts back from now and
 * would call every future instant "just now". `when` hands over to it too,
 * once something is more than a week old. The year is said once it is not
 * this one: a renewal next September and one this September, or a report from
 * last December and one from this December, are otherwise the same cell.
 */
export function day(at: number): string {
  const date = new Date(at);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== new Date().getFullYear() && { year: "numeric" }),
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
 * A ticket's name. The one spelling of it — the dashboard's URLs and the copy
 * button are both this string.
 */
export function ticketName(number: number): string {
  return `NT-${number}`;
}

/**
 * The number out of a `NT-42` route segment, or null.
 *
 * Still lenient about case and a trailing `_slug`. That leniency was put here
 * for pasted PR branch names, and nothing links a branch to a ticket any more
 * — but the agent still names its branches `NT-42_what_was_fixed`, so a
 * pasted one landing on the ticket costs nothing and saves a 404. Strict about
 * the rest, since a wrong ticket is worse than no ticket.
 */
export function ticketNumber(segment: string): number | null {
  const match = /^NT-(\d+)(?:_|$)/i.exec(decodeURIComponent(segment));
  return match ? Number(match[1]) : null;
}
