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
  | "done"
  | "declined";

export type TicketPriority = "urgent" | "high" | "medium" | "low";

export type TicketKind = "issue" | "wish";

/**
 * The two words for the two kinds, in the three lengths the interface needs.
 *
 * One word per kind, everywhere. The dashboard used to call a `wish` a "wish"
 * in a row, a "feature request" on its own page and a "Feature" in the filter
 * — three names for one thing, which is three things to learn. `short` is
 * sized for the row's 34px mono slot; nothing here may outgrow it.
 */
export const KIND_WORDS: Record<
  TicketKind,
  { short: string; long: string; plural: string }
> = {
  issue: { short: "bug", long: "bug report", plural: "bugs" },
  wish: { short: "wish", long: "wish", plural: "wishes" },
};

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

/**
 * The same ten, three letters wide. A narrow inbox trades the words for these
 * so the report's own text keeps the room; the full label rides along as the
 * cell's title and accessible name, and the filter's dropdown lists them all
 * in words, which is where anyone would look them up.
 */
export const CATEGORY_CODES: Record<TicketCategory, string> = {
  canvas: "CNV",
  code: "COD",
  math: "MTH",
  tables: "TBL",
  autocomplete: "ATC",
  chat: "CHT",
  editor: "TXT",
  sharing: "SHR",
  account: "ACC",
  general: "GEN",
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
  /** When the reporter was told this was fixed. Absent = they have not been. */
  notifiedAt?: number;
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

/**
 * A ticket in the inbox. The list row used to carry more than the ticket — the
 * states of every pull request naming it, grouped server-side — because the
 * deployment polled GitHub and kept a row per PR. It no longer does, so the
 * row is the ticket and nothing else.
 */
export type FeedbackListRow = FeedbackRow;

/** What the detail page gets: the ticket and its duplicate links. */
export type FeedbackDetail = FeedbackRow & {
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

// ---- Billing --------------------------------------------------------------

/**
 * What an account may do, as `convex/entitlements.ts` resolves it. `source` is
 * the interesting half: it says WHICH of the four things is letting them in,
 * which is the difference between a customer and someone we comped.
 */
export type Entitlement = {
  plan: "free" | "pro";
  source: "none" | "vip" | "code" | "subscription";
  left: { projects: number; completions: number; chats: number } | null;
  used: { projects: number; completions: number; chats: number } | null;
  expiresAt?: number;
  cancelAtPeriodEnd?: boolean;
};

export const PLAN_SOURCE_LABELS: Record<Entitlement["source"], string> = {
  none: "Free",
  vip: "VIP",
  code: "Code",
  subscription: "Paid",
};

export type AccessCodeRow = {
  id: string;
  code: string;
  label: string;
  maxRedemptions: number | null;
  redemptions: number;
  durationDays: number | null;
  expiresAt: number | null;
  disabledAt: number | null;
  /** Whether somebody could take it right now — withdrawal, expiry and cap all in. */
  redeemable: boolean;
  createdAt: number;
};

export type RedemptionRow = {
  ownerId: string;
  email: string | null;
  name: string | null;
  redeemedAt: number;
  expiresAt: number | null;
  live: boolean;
};

export type BillingAccount = {
  entitlement: Entitlement;
  vipNote: string | null;
  vipSetAt: number | null;
  stripeCustomerId: string | null;
  subscription: {
    status: string;
    interval: "month" | "year";
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
    priceId: string;
    subscriptionId: string;
    updatedAt: number;
  } | null;
  walls: {
    firstAt: number;
    lastAt: number;
    projects: number;
    completions: number;
    chats: number;
  } | null;
  checkoutAt: number | null;
  checkouts: number;
};

/**
 * A Stripe promotion code, flattened. Distinct from an access code in the one
 * way that matters: money still changes hands, just less of it — so Stripe
 * owns it, and this is a window rather than a table.
 */
export type DiscountRow = {
  id: string;
  code: string;
  active: boolean;
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
  /** "once" | "forever" | "repeating". */
  duration: string;
  redemptions: number;
  maxRedemptions: number | null;
  /** SECONDS, as Stripe counts — not milliseconds like everything else here. */
  expiresAt: number | null;
};

export type ProAccountRow = {
  ownerId: string;
  email: string | null;
  name: string | null;
  entitlement: Entitlement;
};

/** One paying customer and what they are charged. Amounts are in cents. */
export type PayingRow = {
  ownerId: string;
  email: string | null;
  name: string | null;
  interval: "month" | "year" | null;
  status: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
  /** What leaves their card each period. Null if the price could not be read. */
  amount: number | null;
  currency: string | null;
  /** The same, divided by twelve on an annual plan, so a column can be summed. */
  monthly: number | null;
};

export type RevenueReport = {
  paying: PayingRow[];
  mrr: number;
  currency: string | null;
  /** Rows whose Stripe price would not load — excluded from `mrr`, so said. */
  unpriced: number;
};

/** Somebody the paywall stopped. Present here means they are still not paying. */
export type StalledRow = {
  ownerId: string;
  email: string | null;
  name: string | null;
  plan: "free" | "pro";
  source: Entitlement["source"];
  firstAt: number;
  lastAt: number;
  hits: number;
  projects: number;
  completions: number;
  chats: number;
  /** How many times they opened Stripe. Above zero and still here = looked and left. */
  checkouts: number;
  checkoutAt: number | null;
};

export type FunnelReport = {
  walled: number;
  reachedCheckout: number;
  converted: number;
  stalled: StalledRow[];
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
  feedbackSetText: makeFunctionReference<
    "mutation",
    { token: string; id: string; text: string },
    null
  >("admin:feedbackSetText"),
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
  /**
   * Mints a read-only stand-in session for one user — see `convex/
   * impersonation.ts` in the main repo. The only function here that is not
   * under `admin:`, because signing needs the Node runtime and the runtime
   * directive is per-module.
   *
   * The returned token is spent by opening `{app}/impersonate#{token}`. Every
   * write made under it is refused by the deployment, so this widens what an
   * operator can SEE and nothing else.
   */
  impersonate: makeFunctionReference<
    "action",
    { token: string; subject: string; reason: string },
    { token: string; expiresAt: number }
  >("impersonationMint:start"),
  chatStats: makeFunctionReference<
    "query",
    { token: string; sinceMs: number },
    { turns: number; rewound: number; byStatus: { status: string; count: number }[] }
  >("admin:chatStats"),
  surveyList: makeFunctionReference<"query", { token: string }, SurveyRow[]>(
    "admin:surveyList",
  ),

  // ---- Billing (convex/adminBilling.ts) ----------------------------------

  codeList: makeFunctionReference<"query", { token: string }, AccessCodeRow[]>(
    "adminBilling:codeList",
  ),
  codeCreate: makeFunctionReference<
    "mutation",
    {
      token: string;
      label: string;
      code?: string;
      maxRedemptions?: number;
      durationDays?: number;
      expiresAt?: number;
    },
    string
  >("adminBilling:codeCreate"),
  codeSetDisabled: makeFunctionReference<
    "mutation",
    { token: string; id: string; disabled: boolean },
    null
  >("adminBilling:codeSetDisabled"),
  codeRedemptions: makeFunctionReference<
    "query",
    { token: string; id: string },
    RedemptionRow[]
  >("adminBilling:codeRedemptions"),
  setVip: makeFunctionReference<
    "mutation",
    { token: string; ownerId: string; vip: boolean; note?: string },
    null
  >("adminBilling:setVip"),
  accountFor: makeFunctionReference<
    "query",
    { token: string; ownerId: string },
    BillingAccount
  >("adminBilling:accountFor"),
  proAccounts: makeFunctionReference<"query", { token: string }, ProAccountRow[]>(
    "adminBilling:proAccounts",
  ),

  funnel: makeFunctionReference<"query", { token: string }, FunnelReport>(
    "adminBilling:funnel",
  ),
  /** An action: the amounts live in Stripe, so this one has to go and ask. */
  revenue: makeFunctionReference<"action", { token: string }, RevenueReport>(
    "adminBilling:revenue",
  ),

  /** Actions, not queries — these three talk to Stripe, so nothing reactive. */
  discountList: makeFunctionReference<"action", { token: string }, DiscountRow[]>(
    "adminBilling:discountList",
  ),
  discountCreate: makeFunctionReference<
    "action",
    {
      token: string;
      label: string;
      code: string;
      percentOff?: number;
      amountOff?: number;
      currency?: string;
      forever: boolean;
      maxRedemptions?: number;
      expiresAt?: number;
    },
    string
  >("adminBilling:discountCreate"),
  discountSetActive: makeFunctionReference<
    "action",
    { token: string; id: string; active: boolean },
    null
  >("adminBilling:discountSetActive"),
};
