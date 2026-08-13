"use client";

import { useQuery } from "convex/react";
import { adminApi } from "@/lib/api";
import { useSession } from "@/lib/session";
import { NavLink } from "./NavLink";

/**
 * The Inbox nav item, wearing its unread count the way a real one does.
 * "Inbox" and not "Feedback": that is the word the page it opens, the back
 * links and the empty states all use — feedback is the data model's word.
 */
export function FeedbackLink() {
  const { token } = useSession();
  const count = useQuery(adminApi.feedbackNewCount, token ? { token } : "skip");
  return (
    <NavLink href="/feedback">
      Inbox
      {count ? (
        <span className="ops-badge">
          {count > 99 ? "99+" : count}
          {/* Otherwise it announces "Inbox 3", which is a count of nothing. */}
          <span className="sr-only"> unread</span>
        </span>
      ) : null}
    </NavLink>
  );
}
