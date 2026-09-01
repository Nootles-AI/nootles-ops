"use client";

import { useEffect, useState } from "react";
import { ticketName } from "@/lib/format";

/**
 * A ticket's name, and one click to have it.
 *
 * This used to copy `NT-42_` — the prefix *with* its delimiter — because a
 * pull-request title had to begin that way for the poller to match it. Nothing
 * matches it now, so the trailing underscore is a character the operator has
 * to delete every time they paste the name anywhere that is not a branch. The
 * bare name is what is copied.
 */
export function TicketName({ number }: { number: number }) {
  const name = ticketName(number);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1200);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <button
      className="ops-chip text-[length:var(--text-meta)] tabular-nums"
      title={`Copy "${name}"`}
      onClick={() => {
        void navigator.clipboard
          .writeText(name)
          .then(() => setCopied(true))
          // A clipboard the browser won't grant is not worth an error state.
          .catch(() => {});
      }}
    >
      {copied ? "Copied" : name}
    </button>
  );
}
