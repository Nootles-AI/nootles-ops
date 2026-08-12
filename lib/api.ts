import { makeFunctionReference } from "convex/server";

/**
 * Hand-typed references to the admin functions in the Nootles deployment
 * (convex/admin.ts in the main repo). This repo has no convex/ directory of
 * its own, so the contract is mirrored here — both sides are ours, and the
 * dashboard breaking loudly on a mismatch is the behavior we want.
 */

export type TicketStatus =
  | "new"
  | "seen"
  | "in_progress"
  | "pr_filed"
  | "done"
  | "declined";

export type TicketPriority = "urgent" | "high" | "medium" | "low";

export type TicketCategory =
  | "canvas"
  | "code"
  | "math"
  | "tables"
  | "autocomplete"
  | "chat"
  | "editor"
  | "sharing"
  | "account"
  | "general";

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  canvas: "Canvas & diagrams",
  code: "Code",
  math: "Math",
  tables: "Tables",
  autocomplete: "Autocomplete",
  chat: "Chat agent",
  editor: "Text editing",
  sharing: "Sharing",
  account: "Account & sign-in",
  general: "General / other",
};

export type FeedbackRow = {
  _id: string;
  _creationTime: number;
  /** The ticket's name is `NT-{number}` — see `ticketName` in lib/format. */
  number: number;
  ownerId: string;
  kind: "issue" | "wish";
  text: string;
  screenshotStorageId?: string;
  screenshotUrl: string | null;
  consoleLog?: string;
  recentOps?: unknown[];
  pageId?: string;
  projectId?: string;
  replayUrl?: string;
  env: { sha?: string; ua: string; viewport: string };
  status: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  email?: string;
  /** Set = this repeats another ticket, and is hidden from the inbox. */
  duplicateOf?: string;
  duplicateSetBy?: "agent" | "human";
  /** Set = kept away from the agent; the queues never return it. */
  agentSkip?: boolean;
  triageScore?: number;
  triageNotes?: string;
  triagedAt?: number;
  rubricVersion?: string;
  agentAttemptedAt?: number;
  agentOutcome?: "filed" | "failed" | "declined";
  createdAt: number;
};

/** A ticket in the inbox, which also knows whether any PR names it. */
export type FeedbackListRow = FeedbackRow & { prStates: PrState[] };

export type PrState = "draft" | "open" | "closed" | "merged";

export type TicketPr = {
  _id: string;
  repo: string;
  prNumber: number;
  title: string;
  url: string;
  state: PrState;
  mergedAt?: number;
  agentFiled: boolean;
  firstSeenAt: number;
};

/** What the detail page gets: the ticket, its PRs, and its duplicate links. */
export type FeedbackDetail = FeedbackRow & {
  prs: TicketPr[];
  duplicateOfNumber: number | null;
  duplicateNumbers: number[];
};

export type AgentRun = {
  _id: string;
  kind: "triage" | "implement";
  startedAt: number;
  finishedAt?: number;
  status: "running" | "ok" | "failed";
  ticketsRead: number;
  duplicatesLinked: number;
  scored: number;
  prsFiled: number;
  errors: string[];
  notes?: string;
};

export type OpsConfig = {
  agentEnabled: boolean;
  implementEnabled: boolean;
  maxPerRun: number;
  coolingHours: number;
  scoreThreshold: number;
};

export type SuggestionRow = {
  _id: string;
  _creationTime: number;
  ownerId: string;
  pageId: string;
  kind: string;
  gateOk: boolean;
  shown: boolean;
  outcome: "gated" | "accepted" | "dismissed" | "superseded" | "failed";
  latencyMs: number;
  suggestionText?: string;
  contextBefore?: string;
  model?: string;
  pageMode?: "create" | "complete";
  docLength?: number;
  decisionMs?: number;
  dismissReason?: string;
  blockIds?: string[];
  acceptedText?: string;
  candidateCount?: number;
  chosenIndex?: number;
  survivalScore?: number;
  survivalCheckedAt?: number;
  undoneWithinMs?: number;
  createdAt: number;
};

export type SuggestionKindStats = {
  kind: string;
  shown: number;
  accepted: number;
  dismissed: number;
  superseded: number;
  failed: number;
  gated: number;
  undone: number;
  latencyTotal: number;
  decisionTotal: number;
  decisionCount: number;
  survivalTotal: number;
  survivalCount: number;
};

export type AiCallRow = {
  _id: string;
  _creationTime: number;
  ownerId: string;
  feature: "fim" | "reformat" | "diagram" | "chat";
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  latencyMs: number;
  ttfbMs?: number;
  status: "ok" | "error" | "aborted" | "timeout";
  errorCode?: string;
  costUsd?: number;
  createdAt: number;
};

export type AiFeatureStats = {
  feature: string;
  calls: number;
  errors: number;
  aborted: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  p50: number;
  p95: number;
};

export type SurveyRow = {
  _id: string;
  _creationTime: number;
  ownerId: string;
  survey: "pmf" | "dismiss_reason";
  answer?: string;
  dismissed: boolean;
  createdAt: number;
};

export type UserRow = {
  ownerId: string;
  email: string | null;
  name: string | null;
  imageUrl: string | null;
  role: string | null;
  useCase: string | null;
  status: "surveying" | "touring" | "done" | "skipped";
  createdAt: number;
  letterSeen: boolean;
  lastActiveAt: number | null;
};

export type UserDetail = {
  profile: {
    ownerId: string;
    email: string | null;
    name: string | null;
    imageUrl: string | null;
    role: string | null;
    useCase: string | null;
    status: string;
    createdAt: number;
    hints: string[];
    letterSeen: boolean;
    hasSeed: boolean;
  };
  tutorial: { edited: boolean; aiRows: number } | null;
  projects: { id: string; title: string; createdAt: number; shared: boolean }[];
  pageCount: number;
  suggestionKinds: { kind: string; shown: number; accepted: number }[];
  suggestionsSampled: number;
  firstAcceptedAt: number | null;
  features: { feature: string; calls: number; costUsd: number }[];
  lastActiveAt: number | null;
  reports: {
    id: string;
    number: number;
    kind: "issue" | "wish";
    text: string;
    status: TicketStatus;
    createdAt: number;
  }[];
};

type Page<T> = { page: T[]; isDone: boolean; continueCursor: string };
type PaginationOpts = { numItems: number; cursor: string | null };

export const adminApi = {
  login: makeFunctionReference<
    "mutation",
    { username: string; password: string },
    string
  >("admin:login"),
  logout: makeFunctionReference<"mutation", { token: string }, null>(
    "admin:logout",
  ),
  validate: makeFunctionReference<"query", { token: string }, boolean>(
    "admin:validate",
  ),
  feedbackList: makeFunctionReference<
    "query",
    {
      token: string;
      paginationOpts: PaginationOpts;
      kind?: "issue" | "wish";
      status?: TicketStatus;
      includeDuplicates?: boolean;
    },
    Page<FeedbackListRow>
  >("admin:feedbackList"),
  feedbackNewCount: makeFunctionReference<"query", { token: string }, number>(
    "admin:feedbackNewCount",
  ),
  feedbackGet: makeFunctionReference<
    "query",
    { token: string; id: string },
    FeedbackDetail | null
  >("admin:feedbackGet"),
  feedbackByNumber: makeFunctionReference<
    "query",
    { token: string; number: number },
    FeedbackDetail | null
  >("admin:feedbackByNumber"),
  feedbackSetDuplicate: makeFunctionReference<
    "mutation",
    { token: string; id: string; duplicateOf: string | null },
    null
  >("admin:feedbackSetDuplicate"),
  feedbackSetAgentSkip: makeFunctionReference<
    "mutation",
    { token: string; id: string; skip: boolean },
    null
  >("admin:feedbackSetAgentSkip"),
  feedbackClearTriage: makeFunctionReference<
    "mutation",
    { token: string; id: string },
    null
  >("admin:feedbackClearTriage"),
  feedbackClearAgentAttempt: makeFunctionReference<
    "mutation",
    { token: string; id: string },
    null
  >("admin:feedbackClearAgentAttempt"),
  opsConfigGet: makeFunctionReference<
    "query",
    { token: string },
    OpsConfig & { configured: boolean }
  >("admin:opsConfigGet"),
  opsConfigSet: makeFunctionReference<
    "mutation",
    { token: string } & OpsConfig,
    null
  >("admin:opsConfigSet"),
  runList: makeFunctionReference<
    "query",
    { token: string; limit?: number },
    AgentRun[]
  >("admin:runList"),
  feedbackSetStatus: makeFunctionReference<
    "mutation",
    { token: string; id: string; status: TicketStatus },
    null
  >("admin:feedbackSetStatus"),
  feedbackSetPriority: makeFunctionReference<
    "mutation",
    { token: string; id: string; priority?: TicketPriority },
    null
  >("admin:feedbackSetPriority"),
  feedbackSetKind: makeFunctionReference<
    "mutation",
    { token: string; id: string; kind: "issue" | "wish" },
    null
  >("admin:feedbackSetKind"),
  feedbackSetCategory: makeFunctionReference<
    "mutation",
    { token: string; id: string; category?: TicketCategory },
    null
  >("admin:feedbackSetCategory"),
  suggestionStats: makeFunctionReference<
    "query",
    { token: string; sinceMs: number },
    { sampled: number; capped: boolean; kinds: SuggestionKindStats[] }
  >("admin:suggestionStats"),
  suggestionRecent: makeFunctionReference<
    "query",
    { token: string; limit?: number; kind?: string },
    SuggestionRow[]
  >("admin:suggestionRecent"),
  aiCallStats: makeFunctionReference<
    "query",
    { token: string; sinceMs: number },
    {
      sampled: number;
      capped: boolean;
      features: AiFeatureStats[];
      costByDay: { day: string; costUsd: number }[];
      spenders: { ownerId: string; costUsd: number }[];
    }
  >("admin:aiCallStats"),
  aiCallRecent: makeFunctionReference<
    "query",
    { token: string; limit?: number },
    AiCallRow[]
  >("admin:aiCallRecent"),
  userStats: makeFunctionReference<
    "query",
    { token: string; sinceMs: number },
    {
      totalUsers: number;
      totalCapped: boolean;
      newUsers: number;
      activeUsers: number;
      pagesCreated: number;
      reports: number;
      roles: { role: string; count: number }[];
    }
  >("admin:userStats"),
  userList: makeFunctionReference<"query", { token: string }, UserRow[]>(
    "admin:userList",
  ),
  userDetail: makeFunctionReference<
    "query",
    { token: string; ownerId: string },
    UserDetail | null
  >("admin:userDetail"),
  chatStats: makeFunctionReference<
    "query",
    { token: string; sinceMs: number },
    { turns: number; rewound: number; byStatus: { status: string; count: number }[] }
  >("admin:chatStats"),
  surveyList: makeFunctionReference<"query", { token: string }, SurveyRow[]>(
    "admin:surveyList",
  ),
};
