"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedbackDetail } from "@/lib/api";
import { useAct } from "@/lib/act";
import {
  LINEAR_PRIORITIES,
  bodyFor,
  createLinearIssue,
  fetchLinearOptions,
  labelFor,
  priorityFor,
  telemetryFor,
  titleFor,
  type LinearDraft,
  type LinearIssue,
  type LinearOptions,
  type LinearPriority,
} from "@/lib/linear";
import { useAdminToken } from "@/lib/session";
import { Loading } from "./Bits";
import { useWho } from "./Who";

/**
 * Filing the report in Linear, without leaving the ticket.
 *
 * The modal is Linear's own new-issue modal, field for field: title,
 * description, then status, priority, assignee, labels, project, cycle,
 * estimate and due date — the last three only when the team uses them. What
 * differs is what it already knows: the title is the report's first line,
 * the priority is the ticket's, the label is Bug or Feature by the ticket's
 * kind, and everything the report carried that nobody typed — build, browser,
 * page, replay, console tail, op log — is appended under a rule when the
 * issue is filed. That block is shown, folded, so the operator can see what
 * goes out with their words.
 *
 * The draft lives in the button, not the dialog, so Escape closes the window
 * without losing what was typed; Cancel does the same. Filing is what clears
 * it.
 */
export function FileInLinear({ row }: { row: FeedbackDetail }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<LinearDraft | null>(null);
  const [filed, setFiled] = useState<LinearIssue | null>(null);

  return (
    <>
      {filed && (
        <a
          href={filed.url}
          target="_blank"
          rel="noreferrer"
          className="ops-chip"
          title="Open it in Linear"
        >
          Filed as {filed.identifier} <span aria-hidden>↗</span>
        </a>
      )}
      <button
        className="ops-chip"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        File in Linear
      </button>
      {open && (
        <IssueDialog
          row={row}
          draft={draft}
          onDraft={setDraft}
          onClose={() => setOpen(false)}
          onFiled={(issue) => {
            setFiled(issue);
            setDraft(null);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function IssueDialog({
  row,
  draft,
  onDraft,
  onClose,
  onFiled,
}: {
  row: FeedbackDetail;
  draft: LinearDraft | null;
  onDraft: (draft: LinearDraft) => void;
  onClose: () => void;
  onFiled: (issue: LinearIssue) => void;
}) {
  const token = useAdminToken();
  const who = useWho(row.ownerId);
  const ref = useRef<HTMLDialogElement>(null);
  const [options, setOptions] = useState<LinearOptions | null>(null);
  const load = useAct();
  const file = useAct();

  // A native dialog: the focus trap, the Escape key and the backdrop are the
  // browser's, and `close` fires for every way out so the parent hears them all.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!el.open) el.showModal();
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, [onClose]);

  // The team's choices are fetched on every open, never remembered: a label
  // renamed in Linear this morning should be renamed here this afternoon.
  const { run: fetchOptions } = load;
  useEffect(() => {
    fetchOptions("reach Linear", fetchLinearOptions(token).then(setOptions));
  }, [fetchOptions, token]);

  // The prefill waits for the options, since two of its values — the default
  // state and the kind's label — are ids only Linear knows.
  useEffect(() => {
    if (!options || draft) return;
    const label = labelFor(row.kind, options.labels);
    onDraft({
      title: titleFor(row.text),
      description: quoted(row.text),
      stateId: options.team.defaultStateId,
      priority: priorityFor(row.priority),
      assigneeId: null,
      labelIds: label ? [label] : [],
      projectId: null,
      projectMilestoneId: null,
      cycleId: null,
      estimate: null,
      dueDate: null,
    });
  }, [options, draft, row, onDraft]);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const telemetry = telemetryFor(row, origin, who);
  const set = (patch: Partial<LinearDraft>) => draft && onDraft({ ...draft, ...patch });
  const project = options?.projects.find((p) => p.id === draft?.projectId);

  const submit = () => {
    if (!draft || !draft.title.trim() || file.busy) return;
    file.run(
      "file this in Linear",
      createLinearIssue(token, {
        ...draft,
        title: draft.title.trim(),
        description: bodyFor(draft.description, telemetry),
      }).then(onFiled),
    );
  };

  return (
    <dialog ref={ref} className="ops-dialog" aria-labelledby="linear-issue-head">
      <form
        method="dialog"
        className={file.busy ? "is-resolving" : undefined}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <header className="ops-panel-head">
          <h2 id="linear-issue-head" className="ops-eyebrow shrink-0">
            New issue
          </h2>
          {options && (
            <span className="ops-mono text-ink-2">
              {options.team.name} · {options.team.key}
            </span>
          )}
        </header>

        {!options || !draft ? (
          load.failed ? (
            <p className="ops-failed p-4" role="alert">
              Could not {load.failed}.{load.why ? ` ${load.why}` : ""}
            </p>
          ) : (
            <Loading />
          )
        ) : (
          <div className="space-y-3 p-4">
            <input
              className="ops-dialog-title"
              placeholder="Issue title"
              aria-label="Title"
              autoFocus
              value={draft.title}
              onChange={(e) => set({ title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <textarea
              className="ops-dialog-body"
              placeholder="Add description…"
              aria-label="Description"
              value={draft.description}
              onChange={(e) => set({ description: e.target.value })}
              onKeyDown={(e) => {
                // Linear's own chord for filing from the description.
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  submit();
                }
              }}
            />

            <div className="flex flex-wrap items-center gap-1.5">
              <select
                className="ops-chip"
                aria-label="Status"
                value={draft.stateId ?? ""}
                onChange={(e) => set({ stateId: e.target.value || null })}
              >
                {options.states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                className="ops-chip"
                aria-label="Priority"
                value={draft.priority}
                onChange={(e) =>
                  set({ priority: Number(e.target.value) as LinearPriority })
                }
              >
                {LINEAR_PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>

              <select
                className="ops-chip"
                aria-label="Assignee"
                value={draft.assigneeId ?? ""}
                onChange={(e) => set({ assigneeId: e.target.value || null })}
              >
                <option value="">Unassigned</option>
                {options.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName || m.name}
                  </option>
                ))}
              </select>

              <select
                className="ops-chip"
                aria-label="Project"
                value={draft.projectId ?? ""}
                disabled={options.projects.length === 0}
                title={options.projects.length === 0 ? "The team has no open projects" : undefined}
                onChange={(e) =>
                  set({ projectId: e.target.value || null, projectMilestoneId: null })
                }
              >
                <option value="">
                  {options.projects.length === 0 ? "No projects" : "No project"}
                </option>
                {options.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {project && project.milestones.length > 0 && (
                <select
                  className="ops-chip"
                  aria-label="Milestone"
                  value={draft.projectMilestoneId ?? ""}
                  onChange={(e) => set({ projectMilestoneId: e.target.value || null })}
                >
                  <option value="">No milestone</option>
                  {project.milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              )}

              {options.cycles && (
                <select
                  className="ops-chip"
                  aria-label="Cycle"
                  value={draft.cycleId ?? ""}
                  onChange={(e) => set({ cycleId: e.target.value || null })}
                >
                  <option value="">No cycle</option>
                  {options.cycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name ?? `Cycle ${c.number}`}
                      {c.active ? " · active" : ""}
                    </option>
                  ))}
                </select>
              )}

              {options.estimate && (
                <select
                  className="ops-chip"
                  aria-label="Estimate"
                  value={draft.estimate ?? ""}
                  onChange={(e) =>
                    set({ estimate: e.target.value === "" ? null : Number(e.target.value) })
                  }
                >
                  <option value="">No estimate</option>
                  {options.estimate.scale.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              )}

              <input
                type="date"
                className="ops-chip tabular-nums"
                aria-label="Due date"
                value={draft.dueDate ?? ""}
                onChange={(e) => set({ dueDate: e.target.value || null })}
              />
            </div>

            {options.labels.length > 0 && (
              <div
                className="flex flex-wrap items-center gap-1.5"
                role="group"
                aria-label="Labels"
              >
                <span className="ops-eyebrow mr-1">Labels</span>
                {options.labels.map((l) => {
                  const on = draft.labelIds.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      className={`ops-chip${on ? " is-on" : ""}`}
                      aria-pressed={on}
                      onClick={() =>
                        set({
                          labelIds: on
                            ? draft.labelIds.filter((id) => id !== l.id)
                            : [...draft.labelIds, l.id],
                        })
                      }
                    >
                      <span
                        className="ops-swatch"
                        style={{ "--swatch": l.color } as React.CSSProperties}
                        aria-hidden
                      />
                      {l.group ? `${l.group} › ${l.name}` : l.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Folded, not hidden: what leaves with the operator's words is
                theirs to read before it goes. */}
            <details className="ops-dialog-fold">
              <summary className="ops-note">
                Appended below the description: the report&rsquo;s telemetry
              </summary>
              <pre className="ops-pre mt-2">{telemetry}</pre>
            </details>

            {file.failed && (
              <p className="ops-failed" role="alert">
                Could not {file.failed}.{file.why ? ` ${file.why}` : ""}
              </p>
            )}
          </div>
        )}

        <footer className="flex items-center justify-end gap-1.5 border-t border-rule px-4 py-3">
          <button
            type="button"
            className="ops-chip"
            disabled={file.busy}
            onClick={() => ref.current?.close()}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ops-chip is-on"
            disabled={!draft || !draft.title.trim() || file.busy}
          >
            {file.busy ? "Filing…" : "Create issue"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

/** The reporter's words, as a quotation — theirs, under the operator's. */
function quoted(text: string): string {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
}
