"use client";

import { useQuery } from "convex/react";
import { adminApi } from "@/lib/api";
import { useSession } from "@/lib/session";
import { NavLink } from "./NavLink";

/** The Feedback nav item, wearing its unread count the way an inbox does. */
export function FeedbackLink() {
  const { token } = useSession();
  const count = useQuery(adminApi.feedbackNewCount, token ? { token } : "skip");
  return (
    <NavLink href="/feedback">
      Feedback
      {count ? (
        <span className="ops-badge">{count > 99 ? "99+" : count}</span>
      ) : null}
    </NavLink>
  );
}
