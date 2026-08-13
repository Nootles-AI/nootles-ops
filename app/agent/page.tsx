"use client";

import { useId, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { adminApi, type OpsConfig } from "@/lib/api";
import { useAct } from "@/lib/act";
import { clock, ms, when } from "@/lib/format";
import { useAdminToken } from "@/lib/session";
import { Empty, Loading, Panel } from "../components/Bits";

/**
 * What the agent did last night, and the knobs that decide what it may do next.
 *
 * The runs table is the point: PRs show up on GitHub and scores show up on
 * tickets, but a run that dies halfway leaves no trace anywhere else — without
 * this page it would look exactly like a quiet night.
 *
 * Every panel here is on the machine's paper, and this is the only page in the
 * app where that is true of the whole screen. Nothing on it was authored by a
 * person: the runs are the agent's, and the knobs are read by the agent.
 */
export default function Agent() {
  const token = useAdminToken();
  const runs = useQuery(adminApi.runList, { token, limit: 20 });
  const config = useQuery(adminApi.opsConfigGet, { token });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="ops-title">Agent</h1>
        <p className="ops-prose mt-1 text-ink-2">
          What the night shift is allowed to do, and what it did.
        </p>
      </div>

      {config === undefined ? (
        <Panel title="Controls" machine>
          <Loading />
        </Panel>
      ) : (
        <Knobs token={token} config={config} configured={config.configured} />
      )}

      <Panel title="Runs" machine>
        {runs === undefined ? (
          <Loading />
        ) : runs.length === 0 ? (
          <Empty>
            No runs yet. Nothing has been scheduled against these queues.
          </Empty>
        ) : (
          // The wrapper scrolls, not the panel, so the heading stays put when a
          // phone drags the nine columns sideways.
          <div className="ops-scroll">
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
                    {/* "3h ago" does not say which night this run belongs to,
                        so the wall clock rides alongside it. */}
                    <td className="whitespace-nowrap">
                      <span className="text-[length:var(--text-note)] text-ink-2">
                        {when(r.startedAt)}
                      </span>{" "}
                      <span className="ops-mono text-ink-2">
                        {clock(r.startedAt)}
                      </span>
                    </td>
                    <td className="ops-mono text-ink-2">{r.kind}</td>
                    <td className="whitespace-nowrap text-[length:var(--text-note)]">
                      <span
                        className={`ops-dot${
                          r.status === "ok"
                            ? " is-ok"
                            : r.status === "failed"
                              ? " is-bad"
                              : " is-warn"
                        }`}
                        aria-hidden
                      />{" "}
                      {r.status}
                    </td>
                    <td className="num">{r.ticketsRead}</td>
                    <td className="num">{r.duplicatesLinked}</td>
                    <td className="num">{r.scored}</td>
                    <td className="num">{r.prsFiled}</td>
                    <td className="num text-[length:var(--text-note)] text-ink-2">
                      {r.finishedAt ? ms(r.finishedAt - r.startedAt) : "—"}
                    </td>
                    {/* The clamp lives on the block inside the cell, not on
                        the cell: an auto-layout table ignores max-width on a
                        <td>, so one stack trace would drag the nine columns
                        sideways instead of ellipsing. */}
                    <td>
                      {r.errors.length === 0 ? (
                        <span className="text-ink-2">—</span>
                      ) : (
                        <span
                          className="block max-w-md truncate text-[length:var(--text-note)] text-alarm"
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
          </div>
        )}
      </Panel>
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
  const act = useAct();
  const [saved, setSaved] = useState(false);

  // Each knob writes on change; `what` is the verb the failure line borrows, so
  // a save that fell over names the knob the operator just touched rather than
  // the whole panel.
  //
  // A write carries the whole config, so the other four knobs are read from the
  // live query at the moment of the write, never from a mount-time snapshot:
  // with three operators on this dashboard, a stale copy would post one of
  // them over another's change — silently re-arming the agent.
  const commit = (patch: Partial<OpsConfig>, what: string) => {
    const next: OpsConfig = {
      agentEnabled: config.agentEnabled,
      implementEnabled: config.implementEnabled,
      maxPerRun: config.maxPerRun,
      coolingHours: config.coolingHours,
      scoreThreshold: config.scoreThreshold,
      ...patch,
    };
    setSaved(false);
    act.run(
      what,
      save({ token, ...next }).then(() => setSaved(true)),
    );
  };

  return (
    <Panel
      title="Controls"
      machine
      aside={
        <>
          {!configured && (
            <span className="ops-note">Defaults — nothing saved yet</span>
          )}
          {/* The acknowledgement is the only proof a knob landed, so it is
              spoken as well as shown. */}
          {saved && (
            <span className="ops-note" role="status">
              Saved
            </span>
          )}
        </>
      }
    >
      <div className="p-4">
        {/* `is-resolving` dims the grid while a save is in flight; aria-busy
            is the same fact for anyone not reading the dim. */}
        <div
          aria-busy={act.busy}
          className={`grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3${
            act.busy ? " is-resolving" : ""
          }`}
        >
          <Choice
            label="Agent"
            options={[
              { value: false, label: "Off", what: "turn the agent off" },
              { value: true, label: "On", what: "turn the agent on" },
            ]}
            value={config.agentEnabled}
            onChange={(agentEnabled, what) => commit({ agentEnabled }, what)}
          />
          <Choice
            label="What it may do"
            options={[
              {
                value: false,
                label: "Triage only",
                what: "hold the agent to triage only",
              },
              {
                value: true,
                label: "Implementing",
                what: "let the agent implement",
              },
            ]}
            value={config.implementEnabled}
            onChange={(implementEnabled, what) =>
              commit({ implementEnabled }, what)
            }
            note="Triage only scores and links duplicates; it writes no code."
          />
          <Num
            label="Max per run"
            value={config.maxPerRun}
            onChange={(maxPerRun) =>
              commit({ maxPerRun }, "save the max per run")
            }
          />
          <Num
            label="Cooling hours"
            value={config.coolingHours}
            onChange={(coolingHours) =>
              commit({ coolingHours }, "save the cooling hours")
            }
          />
          <Num
            label="Score threshold"
            value={config.scoreThreshold}
            onChange={(scoreThreshold) =>
              commit({ scoreThreshold }, "save the score threshold")
            }
            note="How many points a report needs before the agent will pick it up tonight — the number every triage score in the inbox is measured against."
          />
        </div>

        {act.failed && (
          <p className="ops-failed mt-4" role="status">
            Could not {act.failed}. Try again.
          </p>
        )}

        {!config.agentEnabled && (
          <p className="ops-note mt-4 max-w-[68ch]">
            With the agent off, both queues return nothing — the switch is read
            by the queries, not by the agent.
          </p>
        )}
      </div>
    </Panel>
  );
}

/**
 * A two-state knob drawn as a ladder rather than a pill, because both of these
 * read left to right as more machine: off before on, triage before code.
 */
function Choice({
  label,
  options,
  value,
  onChange,
  note,
}: {
  label: string;
  options: { value: boolean; label: string; what: string }[];
  value: boolean;
  onChange: (value: boolean, what: string) => void;
  note?: string;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <p className="ops-eyebrow" id={id}>
        {label}
      </p>
      <div
        className="ops-ladder mt-1.5"
        role="radiogroup"
        aria-labelledby={id}
        aria-describedby={note ? `${id}-note` : undefined}
      >
        {options.map((o) => (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className="min-h-7"
            onClick={() => onChange(o.value, o.what)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {note && (
        <p className="ops-note mt-1.5" id={`${id}-note`}>
          {note}
        </p>
      )}
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
  note,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  note?: string;
}) {
  const id = useId();

  // The text is held here and only committed when the operator leaves the
  // field, because an <input type="number"> reads "" the instant it is cleared
  // to be retyped — and Number("") is 0. Committing on change would send
  // scoreThreshold 0 (the agent picks up every ticket) or maxPerRun 0 (it
  // picks up none) to the deployment on the way to the number actually wanted.
  const [text, setText] = useState(String(value));
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setText(String(value));
  }

  // Anything that is not a number the agent could act on puts the field back
  // to what the deployment currently holds, rather than writing a guess.
  const commit = () => {
    const n = Number(text.trim());
    if (text.trim() === "" || !Number.isFinite(n) || n < 0) {
      setText(String(value));
      return;
    }
    setText(String(n));
    if (n !== value) onChange(n);
  };

  return (
    <div className="min-w-0">
      <label className="block">
        <span className="ops-eyebrow">{label}</span>
        <input
          className="ops-input mt-1.5 block h-7 w-24 tabular-nums"
          type="number"
          min={0}
          inputMode="numeric"
          aria-describedby={note ? `${id}-note` : undefined}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
          }}
        />
      </label>
      {note && (
        <p className="ops-note mt-1.5" id={`${id}-note`}>
          {note}
        </p>
      )}
    </div>
  );
}
