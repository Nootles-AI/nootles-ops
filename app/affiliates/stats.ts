"use client";

import { useCallback, useEffect, useState } from "react";
import { useAction } from "convex/react";
import { adminApi, type AffiliateStats } from "@/lib/api";

/**
 * The affiliates' funnels and money, once per mount and again on `reload`.
 *
 * An action, not a query — MRR and code redemptions are Stripe's, so nothing
 * here is reactive and the page says when it was generated. `broken` is the
 * deployment's own sentence when it could not answer (almost always "No Stripe
 * key is set on this deployment."), which is a fact about setup: the pages
 * fall back to the list's reactive counts and say it, rather than hide it.
 *
 * A reply that arrives after a newer request was sent is dropped, so a slow
 * first load cannot overwrite the reload a mutation asked for.
 */
export function useAffiliateStats(token: string) {
  const load = useAction(adminApi.affiliateStats);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [broken, setBroken] = useState<string | null>(null);
  const [asked, setAsked] = useState(0);

  useEffect(() => {
    let current = true;
    void load({ token })
      .then((got) => {
        if (!current) return;
        setStats(got);
        setBroken(null);
      })
      .catch((error: unknown) => {
        if (!current) return;
        // Stale numbers beside a fresh failure would read as current.
        setStats(null);
        setBroken((error as { data?: string })?.data ?? "Stripe did not answer.");
      });
    return () => {
      current = false;
    };
  }, [load, token, asked]);

  const reload = useCallback(() => setAsked((n) => n + 1), []);
  return { stats, broken, reload };
}
