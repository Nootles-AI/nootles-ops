"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { adminApi } from "@/lib/api";

/**
 * Authorization, said plainly. Authentication is Clerk's (the middleware
 * already forced sign-in); this asks the deployment whether the signed-in
 * subject is the operator. Every admin query re-checks server-side — this
 * only decides what to render.
 */
export function Guard({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(adminApi.me, isAuthenticated ? {} : "skip");

  if (isLoading || (isAuthenticated && me === undefined)) {
    return <p className="text-muted">Loading…</p>;
  }
  if (!isAuthenticated || !me?.isAdmin) {
    return (
      <div className="ops-card mx-auto mt-24 max-w-sm p-6 text-center">
        <p className="font-medium">This is the operator&rsquo;s dashboard.</p>
        <p className="mt-1 text-[13px] text-muted">
          You&rsquo;re signed in, but not as the operator of this deployment.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
