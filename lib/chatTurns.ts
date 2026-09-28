import type { AiCallRow } from "./api";

export type ChatTurn = {
  id: string;
  ownerId: string;
  rows: AiCallRow[];
  requestCount: number;
  endedAt: number;
  requestMs: number;
  elapsedMs: number;
  ttfbMs?: number;
  costUsd?: number;
  status: AiCallRow["status"];
};

/** Groups only calls with a stable chat turn id; older calls stay in the request log. */
export function chatTurns(rows: AiCallRow[]): ChatTurn[] {
  const groups = new Map<string, AiCallRow[]>();
  for (const row of rows) {
    if (!row.turnId) continue;
    const key = JSON.stringify([row.ownerId, row.turnId]);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => {
      // `aiCallRecent` arrives newest first, but a settlement can be delayed.
      const ordered = group.sort((a, b) => a.createdAt - b.createdAt);
      const requests = ordered.filter((row) => row.turnRequest);
      // Ledger writes are fire-and-forget, so an earlier request can land later.
      const first = requests.length
        ? requests.reduce((earliest, row) =>
            row.createdAt - row.latencyMs < earliest.createdAt - earliest.latencyMs
              ? row
              : earliest,
          )
        : ordered[0];
      const last = ordered[ordered.length - 1];
      const knownCosts = ordered.filter((row) => row.costUsd !== undefined);
      const status =
        ordered.find((row) => row.status === "error")?.status ??
        ordered.find((row) => row.status === "timeout")?.status ??
        ordered.find((row) => row.status === "aborted")?.status ??
        "ok";
      return {
        id: first.turnId!,
        ownerId: first.ownerId,
        rows: ordered,
        requestCount: requests.length,
        endedAt: last.createdAt,
        requestMs: requests.reduce((sum, row) => sum + row.latencyMs, 0),
        elapsedMs: Math.max(0, last.createdAt - (first.createdAt - first.latencyMs)),
        ttfbMs: first.ttfbMs,
        costUsd: knownCosts.length
          ? knownCosts.reduce((sum, row) => sum + row.costUsd!, 0)
          : undefined,
        status,
      } satisfies ChatTurn;
    })
    .sort((a, b) => b.endedAt - a.endedAt);
}
