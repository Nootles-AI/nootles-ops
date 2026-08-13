"use client";

import { useEffect, useState } from "react";
import { ticketName } from "@/lib/format";

/**
 * A ticket's name, and the fastest way to start a PR for it.
 *
 * Copying yields `NT-42_` — the prefix *with* its delimiter — because that is
 * what the convention wants next: paste, keep typing, and the title matches
 * `NT-{n}_pr_name`. Copying the bare name would leave the one character most
 * likely to be forgotten to be typed by hand.
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
      title={`Copy "${name}_" for a PR title`}
      onClick={() => {
        void navigator.clipboard
          .writeText(`${name}_`)
          .then(() => setCopied(true))
          // A clipboard the browser won't grant is not worth an error state.
          .catch(() => {});
      }}
    >
      {copied ? "Copied" : name}
    </button>
  );
}
