import {
  CATEGORY_LABELS,
  KIND_WORDS,
  type FeedbackDetail,
  type TicketPriority,
  type UserRow,
} from "@/lib/api";
import { ticketName } from "@/lib/format";

/**
 * Filing a report in Linear, from the ticket page.
 *
 * The shape here is Linear's own new-issue modal: a title, a description, and
 * the property row beneath them. What the team has switched off — cycles,
 * estimates — is switched off here too, which is what `LinearOptions` carries
 * back from the deployment's Linear key. The key itself never reaches the
 * browser: both calls go through this app's own route handlers, which check
 * the operator's session against the Nootles deployment before they touch
 * Linear. See app/api/linear/.
 */

/** Linear's scale: 0 = no priority, 1 = urgent … 4 = low. */
export type LinearPriority = 0 | 1 | 2 | 3 | 4;

export const LINEAR_PRIORITIES: { id: LinearPriority; label: string }[] = [
  { id: 0, label: "No priority" },
  { id: 1, label: "Urgent" },
  { id: 2, label: "High" },
  { id: 3, label: "Medium" },
  { id: 4, label: "Low" },
];

export type LinearOptions = {
  team: { id: string; key: string; name: string; defaultStateId: string | null };
  /** In workflow order: backlog → unstarted → started → completed → canceled. */
  states: { id: string; name: string; type: string; color: string }[];
  /** Applicable labels only — a label group cannot be put on an issue. */
  labels: { id: string; name: string; color: string; group: string | null }[];
  members: {
    id: string;
    name: string;
    displayName: string;
    email: string | null;
    avatarUrl: string | null;
  }[];
  projects: { id: string; name: string; milestones: { id: string; name: string }[] }[];
  /** Null when the team has cycles switched off, so the field is not drawn. */
  cycles:
    | { id: string; number: number; name: string | null; active: boolean }[]
    | null;
  /** Null when the team does not estimate. Otherwise the points on its scale. */
  estimate: { scale: { value: number; label: string }[] } | null;
};

export type LinearDraft = {
  title: string;
  description: string;
  stateId: string | null;
  priority: LinearPriority;
  assigneeId: string | null;
  labelIds: string[];
  projectId: string | null;
  projectMilestoneId: string | null;
  cycleId: string | null;
  estimate: number | null;
  /** `YYYY-MM-DD`, the way Linear's TimelessDate is spelled. */
  dueDate: string | null;
};

export type LinearIssue = { id: string; identifier: string; url: string };

// ---- Prefilling ------------------------------------------------------------

/**
 * A title out of the report: its first paragraph, with the whitespace folded
 * and the end cut at a word. A paragraph, not a line — a report typed with
 * hard returns would otherwise give up a fragment. Linear takes far longer,
 * but a title is what shows in a list, and the whole report is a click away
 * underneath it.
 */
export function titleFor(text: string): string {
  const line =
    text
      .split(/\r?\n\s*\r?\n/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .find((p) => p) ?? "";
  if (line.length <= 120) return line;
  const cut = line.slice(0, 120);
  const at = cut.lastIndexOf(" ");
  return `${at > 60 ? cut.slice(0, at) : cut}…`;
}

export function priorityFor(priority: TicketPriority | undefined): LinearPriority {
  switch (priority) {
    case "urgent":
      return 1;
    case "high":
      return 2;
    case "medium":
      return 3;
    case "low":
      return 4;
    default:
      return 0;
  }
}

/**
 * The label that says what kind of report this is, if the team keeps one by
 * the usual name. Matched by name, not by id: labels are the team's to
 * rename, and a missing one costs nothing but the prefill.
 */
export function labelFor(
  kind: FeedbackDetail["kind"],
  labels: LinearOptions["labels"],
): string | null {
  const wanted = kind === "issue" ? "bug" : "feature";
  return labels.find((l) => l.name.trim().toLowerCase() === wanted)?.id ?? null;
}

// ---- The telemetry --------------------------------------------------------

/** Neither the console nor the op log may crowd out the report above them. */
const TAIL = 3000;

function tail(text: string): string {
  const t = text.trim();
  return t.length > TAIL ? `…${t.slice(-TAIL)}` : t;
}

function head(text: string): string {
  return text.length > TAIL ? `${text.slice(0, TAIL)}\n…` : text;
}

/** Markdown code fences are only fences while the content has none. */
function fence(lang: string, body: string): string {
  const ticks = /`{3,}/.test(body) ? "````" : "```";
  return `${ticks}${lang}\n${body}\n${ticks}`;
}

/**
 * Everything the report carried that a person did not type, as Markdown for
 * the bottom of the issue. The operator's words go above it and this goes
 * below a rule, so the issue reads as theirs with the record attached — not
 * as a dump with a sentence on top.
 *
 * `origin` is this dashboard's, so the links lead back to the ticket and the
 * reporter here; `who` is the reporter as the directory knows them.
 */
export function telemetryFor(
  row: FeedbackDetail,
  origin: string,
  who: UserRow | undefined,
): string {
  const name = ticketName(row.number);
  const facts: string[] = [];

  facts.push(
    `**Ops ticket** [${name}](${origin}/feedback/${name}) · ${KIND_WORDS[row.kind].long}` +
      (row.priority ? ` · ${row.priority} priority` : "") +
      (row.category ? ` · ${CATEGORY_LABELS[row.category]}` : "") +
      ` · filed ${new Date(row.createdAt).toISOString()}`,
  );

  const reporter = who?.name?.trim() || who?.email?.trim() || row.ownerId;
  facts.push(
    `**Reporter** [${reporter}](${origin}/users/${row.ownerId})` +
      (row.email ? ` · ${row.email}` : "") +
      ` · \`${row.ownerId}\``,
  );

  const env = [
    row.env.sha ? `**Build** \`${row.env.sha}\`` : null,
    `**Viewport** \`${row.env.viewport}\``,
  ].filter(Boolean);
  facts.push(env.join(" · "));

  const where = [
    row.pageId ? `**Page** \`${row.pageId}\`` : null,
    row.projectId ? `**Project** \`${row.projectId}\`` : null,
  ].filter(Boolean);
  if (where.length) facts.push(where.join(" · "));

  if (row.replayUrl) facts.push(`**Session replay** ${row.replayUrl}`);
  if (row.screenshotUrl) facts.push(`**Screenshot** ${row.screenshotUrl}`);

  if (row.triagedAt !== undefined) {
    facts.push(
      `**Agent triage** ${row.triageScore ?? "unscored"}` +
        (row.rubricVersion ? ` · rubric ${row.rubricVersion}` : "") +
        (row.triageNotes?.trim() ? ` — ${row.triageNotes.trim()}` : ""),
    );
  }
  if (row.duplicateOfNumber !== null) {
    facts.push(`**Duplicate of** ${ticketName(row.duplicateOfNumber)}`);
  }

  const parts = [
    "---",
    "",
    "### From Nootles Ops",
    "",
    facts.map((f) => `- ${f}`).join("\n"),
  ];

  if (row.consoleLog?.trim()) {
    parts.push("", "**Console tail**", "", fence("text", tail(row.consoleLog)));
  }
  if (row.recentOps?.length) {
    parts.push(
      "",
      "**Recent ops** — the last edits before the report",
      "",
      fence("json", head(JSON.stringify(row.recentOps, null, 2))),
    );
  }

  parts.push("", `**User agent** ${row.env.ua}`);
  return parts.join("\n");
}

/** The issue's body: what the operator wrote, then the record. */
export function bodyFor(description: string, telemetry: string): string {
  const own = description.trim();
  return own ? `${own}\n\n${telemetry}` : telemetry;
}

// ---- Talking to this app's own Linear handlers ----------------------------

/**
 * A refusal with its sentence on `data`, which is where `useAct` looks for
 * one — the same slot a `ConvexError` carries its message in, so the ticket
 * page reports a Linear failure the way it reports every other one.
 */
class Refused extends Error {
  data: string;
  constructor(why: string) {
    super(why);
    this.data = why;
  }
}

async function call<T>(
  path: string,
  token: string,
  init?: { method: "POST"; body: unknown },
): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? "GET",
    headers: {
      authorization: `Bearer ${token}`,
      ...(init ? { "content-type": "application/json" } : {}),
    },
    ...(init ? { body: JSON.stringify(init.body) } : {}),
  });
  const body = (await res.json().catch(() => null)) as
    | ({ why?: string } & T)
    | null;
  if (!res.ok) {
    throw new Refused(
      body?.why ?? `This dashboard answered ${res.status} for Linear.`,
    );
  }
  return body as T;
}

export function fetchLinearOptions(token: string): Promise<LinearOptions> {
  return call<LinearOptions>("/api/linear/options", token);
}

export function createLinearIssue(
  token: string,
  draft: LinearDraft,
): Promise<LinearIssue> {
  return call<LinearIssue>("/api/linear/issues", token, {
    method: "POST",
    body: draft,
  });
}
