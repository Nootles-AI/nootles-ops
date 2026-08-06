"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { adminApi, type OpsConfig } from "@/lib/api";
import { ms, when } from "@/lib/format";
import { useAdminToken } from "@/lib/session";

/**
 * What the agent did last night, and the knobs that decide what it may do next.
 *
 * The runs table is the point: PRs show up on GitHub and scores show up on
 * tickets, but a run that dies halfway leaves no trace anywhere else — without
 * this page it would look exactly like a quiet night.
 */
export default function Agent() {
  const token = useAdminToken();
  const runs = useQuery(adminApi.runList, { token, limit: 20 });
  const config = useQuery(adminApi.opsConfigGet, { token });

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold tracking-tight">Agent</h1>

      {config === undefined ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <Knobs token={token} config={config} configured={config.configured} />
      )}

      <section className="ops-card overflow-x-auto">
        <header className="border-b border-border px-4 py-3">
          <h2 className="ops-meta">Runs</h2>
        </header>
        {runs === undefined ? (
          <p className="p-4 text-muted">Loading…</p>
        ) : runs.length === 0 ? (
          <p className="p-4 text-[13px] text-muted">
            No runs yet. Nothing has been scheduled against these queues.
          </p>
        ) : (
          <table className="ops-table">
            <thead>
              <tr>
                <th>Started</th>
                <th>Kind</th>
                <th>Status</th>
                <th className="num">Read</th>
                <th className="num">Deduped</th>
                <th className="num">Scored</th>
                <th className="num">PRs</th>
                <th className="num">Took</th>
                <th>Errors</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r._id}>
                  <td className="whitespace-nowrap text-[12px] text-muted">
                    {when(r.startedAt)}
                  </td>
                  <td className="ops-meta">{r.kind}</td>
                  <td className="whitespace-nowrap text-[12px]">
                    <span
                      className={`ops-dot${
                        r.status === "ok"
                          ? " is-ok"
                          : r.status === "failed"
                            ? " is-bad"
                            : " is-warn"
                      }`}
                    />{" "}
                    {r.status}
                  </td>
                  <td className="num">{r.ticketsRead}</td>
                  <td className="num">{r.duplicatesLinked}</td>
                  <td className="num">{r.scored}</td>
                  <td className="num">{r.prsFiled}</td>
                  <td className="num text-[12px] text-muted">
                    {r.finishedAt ? ms(r.finishedAt - r.startedAt) : "–"}
                  </td>
                  <td className="max-w-md">
                    {r.errors.length === 0 ? (
                      <span className="text-faint">–</span>
                    ) : (
                      <span
                        className="block truncate text-[12px]"
                        style={{ color: "var(--bad)" }}
                        title={r.errors.join("\n")}
                      >
                        {r.errors[0]}
                        {r.errors.length > 1 && ` (+${r.errors.length - 1})`}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

/**
 * The knobs live in the database, not in the agent's prompt, because the queue
 * queries read them — which is what makes them binding rather than advisory.
 */
function Knobs({
  token,
  config,
  configured,
}: {
  token: string;
  config: OpsConfig;
  configured: boolean;
}) {
  const save = useMutation(adminApi.opsConfigSet);
  const [draft, setDraft] = useState<OpsConfig>({
    agentEnabled: config.agentEnabled,
    implementEnabled: config.implementEnabled,
    maxPerRun: config.maxPerRun,
    coolingHours: config.coolingHours,
    scoreThreshold: config.scoreThreshold,
  });
  const [saved, setSaved] = useState(false);

  const commit = (next: OpsConfig) => {
    setDraft(next);
    setSaved(false);
    void save({ token, ...next })
      .then(() => setSaved(true))
      .catch(() => {});
  };

  return (
    <section className="ops-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="ops-meta mr-1">Controls</h2>
        <button
          className={`ops-chip${draft.agentEnabled ? " is-on" : ""}`}
          onClick={() => commit({ ...draft, agentEnabled: !draft.agentEnabled })}
        >
          {draft.agentEnabled ? "Agent enabled" : "Agent off"}
        </button>
        <button
          className={`ops-chip${draft.implementEnabled ? " is-on" : ""}`}
          title="Off means triage only: score and dedupe, write no code"
          onClick={() =>
            commit({ ...draft, implementEnabled: !draft.implementEnabled })
          }
        >
          {draft.implementEnabled ? "Implementing" : "Triage only"}
        </button>
        {saved && <span className="text-[12px] text-faint">Saved</span>}
        {!configured && (
          <span className="text-[12px] text-faint">
            Defaults — nothing saved yet
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-4">
        <Num
          label="Max per run"
          value={draft.maxPerRun}
          onChange={(maxPerRun) => commit({ ...draft, maxPerRun })}
        />
        <Num
          label="Cooling hours"
          value={draft.coolingHours}
          onChange={(coolingHours) => commit({ ...draft, coolingHours })}
        />
        <Num
          label="Score threshold"
          value={draft.scoreThreshold}
          onChange={(scoreThreshold) => commit({ ...draft, scoreThreshold })}
        />
      </div>

      {!draft.agentEnabled && (
        <p className="mt-3 text-[12px] text-faint">
          With the agent off, both queues return nothing — the switch is read by
          the queries, not by the agent.
        </p>
      )}
    </section>
  );
}

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[13px]">
      <span className="ops-meta">{label}</span>
      <input
        className="ops-input w-20 tabular-nums"
        type="number"
        min={0}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n) && n >= 0) onChange(n);
        }}
      />
    </label>
  );
}
