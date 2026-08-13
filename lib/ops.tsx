"use client";

import { createContext, useContext } from "react";
import { useQuery } from "convex/react";
import { adminApi, type AgentRun, type OpsConfig } from "@/lib/api";
import { useSession } from "@/lib/session";

/**
 * What the night shift is set to do, and how its last run went — fetched once
 * and shared, because two things need it everywhere: the header's watch
 * readout, and the inbox, where a triage score is meaningless until you know
 * the threshold it is being measured against.
 */

type Ops = {
  config: (OpsConfig & { configured: boolean }) | undefined;
  lastRun: AgentRun | undefined;
  /**
   * Whether the run list has arrived. Without it, `lastRun === undefined`
   * says both "still loading" and "the agent has never run", and a page
   * cannot tell the honest silence from the impatient one.
   */
  runsLoaded: boolean;
};

const OpsContext = createContext<Ops>({
  config: undefined,
  lastRun: undefined,
  runsLoaded: false,
});

export function OpsProvider({ children }: { children: React.ReactNode }) {
  const { token } = useSession();
  const config = useQuery(adminApi.opsConfigGet, token ? { token } : "skip");
  const runs = useQuery(
    adminApi.runList,
    token ? { token, limit: 1 } : "skip",
  );
  return (
    <OpsContext.Provider
      value={{
        config,
        lastRun: runs?.[0],
        runsLoaded: runs !== undefined,
      }}
    >
      {children}
    </OpsContext.Provider>
  );
}

export function useOps(): Ops {
  return useContext(OpsContext);
}
