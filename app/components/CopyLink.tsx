"use client";

import { useEffect, useState } from "react";
import { AFFILIATE_LINK_BASE } from "@/lib/api";

/**
 * An affiliate's link, one click to have it — the thing an operator is asked
 * for most, so it is on every row rather than behind the detail page. Says
 * "Copied" for a moment, the way the ticket name does.
 */
export function CopyLink({ slug, label = "Copy link" }: { slug: string; label?: string }) {
  const link = `${AFFILIATE_LINK_BASE}${slug}`;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1200);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <button
      type="button"
      className="ops-chip"
      title={`Copy ${link}`}
      onClick={() => {
        void navigator.clipboard
          .writeText(link)
          .then(() => setCopied(true))
          // A clipboard the browser won't grant is not worth an error state.
          .catch(() => {});
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
