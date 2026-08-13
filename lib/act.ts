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
export function useAct() {
  const [inFlight, setInFlight] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);

  const run = useCallback((what: string, call: Promise<unknown>) => {
    setInFlight((n) => n + 1);
    setFailed(null);
    void call
      .catch(() => setFailed(what))
      .finally(() => setInFlight((n) => n - 1));
  }, []);

  return {
    run,
    busy: inFlight > 0,
    failed,
    dismiss: useCallback(() => setFailed(null), []),
  };
}
