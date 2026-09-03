import type { LinearDraft, LinearIssue } from "@/lib/linear";
import {
  LinearFailed,
  TEAM_KEY,
  linear,
  operatorCheck,
  refuse,
} from "@/lib/linear.server";

/**
 * POST /api/linear/issues — files one issue under the team. The body is a
 * `LinearDraft`: the modal's fields as the operator left them, with the
 * telemetry already at the bottom of the description. The response is the
 * issue's identifier and URL, which is all the page needs to say "filed".
 */

const TEAM = /* GraphQL */ `
  query Team($key: String!) {
    teams(first: 1, filter: { key: { eq: $key } }) { nodes { id } }
  }
`;

const CREATE = /* GraphQL */ `
  mutation Create($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue { id identifier url }
    }
  }
`;

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

/** The draft as sent, or the sentence that says what is wrong with it. */
function read(body: unknown): LinearDraft | string {
  if (typeof body !== "object" || body === null) return "The request had no body.";
  const b = body as Record<string, unknown>;
  const title = str(b.title);
  if (!title) return "An issue needs a title.";
  const priority = b.priority;
  if (![0, 1, 2, 3, 4].includes(priority as number)) return "That is not a priority Linear knows.";
  const labelIds = Array.isArray(b.labelIds) ? b.labelIds.filter((l) => typeof l === "string") : [];
  const dueDate = str(b.dueDate);
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return "The due date is not a date.";
  const estimate = b.estimate;
  if (estimate !== null && estimate !== undefined && typeof estimate !== "number") {
    return "The estimate is not a number.";
  }
  return {
    title,
    description: typeof b.description === "string" ? b.description : "",
    stateId: str(b.stateId),
    priority: priority as LinearDraft["priority"],
    assigneeId: str(b.assigneeId),
    labelIds: labelIds as string[],
    projectId: str(b.projectId),
    projectMilestoneId: str(b.projectMilestoneId),
    cycleId: str(b.cycleId),
    estimate: typeof estimate === "number" ? estimate : null,
    dueDate,
  };
}

export async function POST(request: Request) {
  const refused = await operatorCheck(request);
  if (refused) return refused;

  const draft = read(await request.json().catch(() => null));
  if (typeof draft === "string") return refuse(400, draft);

  try {
    const { teams } = await linear<{ teams: { nodes: { id: string }[] } }>(TEAM, {
      key: TEAM_KEY,
    });
    const teamId = teams.nodes[0]?.id;
    if (!teamId) return refuse(502, `Linear has no team with the key ${TEAM_KEY}.`);

    const { issueCreate } = await linear<{
      issueCreate: { success: boolean; issue: LinearIssue | null };
    }>(CREATE, {
      input: {
        teamId,
        title: draft.title,
        description: draft.description,
        priority: draft.priority,
        labelIds: draft.labelIds,
        ...(draft.stateId ? { stateId: draft.stateId } : {}),
        ...(draft.assigneeId ? { assigneeId: draft.assigneeId } : {}),
        ...(draft.projectId ? { projectId: draft.projectId } : {}),
        ...(draft.projectMilestoneId ? { projectMilestoneId: draft.projectMilestoneId } : {}),
        ...(draft.cycleId ? { cycleId: draft.cycleId } : {}),
        ...(draft.estimate !== null ? { estimate: draft.estimate } : {}),
        ...(draft.dueDate ? { dueDate: draft.dueDate } : {}),
      },
    });
    if (!issueCreate.success || !issueCreate.issue) {
      return refuse(502, "Linear did not create the issue.");
    }
    return Response.json(issueCreate.issue);
  } catch (error) {
    return refuse(502, error instanceof LinearFailed ? error.message : "Linear did not answer.");
  }
}
