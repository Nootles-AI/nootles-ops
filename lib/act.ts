"use client";

import { useCallback, useState } from "react";

/**
 * Every mutation in this dashboard used to be fired as `.catch(() => {})`, so
 * a priority that failed to save looked exactly like one that saved. This
 * gives a call two things it did not have: a pending window, and a sentence
 * when it fails.
 *
 *   const act = useAct();
 *   act.run("set the priority", setPriority({ token, id, priority }));
 *   …
 *   {act.failed && <p className="ops-failed">Could not {act.failed}. Try again.</p>}
 */
/**
 * What the deployment said, when it said anything worth repeating.
 *
 * A production deployment redacts the message of a plain `Error`, so most
 * failures arrive as "Server Error" and are worth hiding. A `ConvexError`
 * carries its `data` through on purpose — that is the deliberate half, written
 * to be read by whoever tripped it, and the only half worth showing.
 */
function saidWhy(error: unknown): string | null {
  const data = (error as { data?: unknown })?.data;
  return typeof data === "string" && data.trim() ? data.trim() : null;
}

export function useAct() {
  const [inFlight, setInFlight] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const [why, setWhy] = useState<string | null>(null);

  const run = useCallback((what: string, call: Promise<unknown>) => {
    setInFlight((n) => n + 1);
    setFailed(null);
    setWhy(null);
    void call
      .catch((error: unknown) => {
        setFailed(what);
        setWhy(saidWhy(error));
      })
      .finally(() => setInFlight((n) => n - 1));
  }, []);

  return {
    run,
    busy: inFlight > 0,
    failed,
    /** The deployment's own sentence, when it wrote one. */
    why,
    dismiss: useCallback(() => {
      setFailed(null);
      setWhy(null);
    }, []),
  };
}
