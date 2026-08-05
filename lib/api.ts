import { makeFunctionReference } from "convex/server";

/**
 * Hand-typed references to the admin functions in the Nootles deployment
 * (convex/admin.ts in the main repo). This repo has no convex/ directory of
 * its own, so the contract is mirrored here — both sides are ours, and the
 * dashboard breaking loudly on a mismatch is the behavior we want.
 */

export type TicketStatus = "new" | "seen" | "in_progress" | "done" | "declined";

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
  createdAt: number;
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
    },
    Page<FeedbackRow>
  >("admin:feedbackList"),
  feedbackNewCount: makeFunctionReference<"query", { token: string }, number>(
    "admin:feedbackNewCount",
  ),
  feedbackGet: makeFunctionReference<
    "query",
    { token: string; id: string },
    FeedbackRow | null
  >("admin:feedbackGet"),
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
  chatStats: makeFunctionReference<
    "query",
    { token: string; sinceMs: number },
    { turns: number; rewound: number; byStatus: { status: string; count: number }[] }
  >("admin:chatStats"),
  surveyList: makeFunctionReference<"query", { token: string }, SurveyRow[]>(
    "admin:surveyList",
  ),
};
