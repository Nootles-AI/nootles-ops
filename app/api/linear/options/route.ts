import type { LinearOptions } from "@/lib/linear";
import {
  LinearFailed,
  TEAM_KEY,
  linear,
  operatorCheck,
  refuse,
} from "@/lib/linear.server";

/**
 * GET /api/linear/options — what the team's new-issue modal would offer:
 * its states, labels, members, open projects, and cycles and estimates if
 * it uses them. Fetched when the modal opens, never cached, so a label
 * renamed in Linear is renamed here on the next click.
 *
 * `first:` on every connection is load-bearing: Linear scores a query's
 * complexity by the product of its connections' page sizes, and the
 * defaults put this one 17× over the limit.
 */

const QUERY = /* GraphQL */ `
  query Options($key: String!, $today: DateTimeOrDuration!) {
    teams(first: 1, filter: { key: { eq: $key } }) {
      nodes {
        id
        key
        name
        issueEstimationType
        issueEstimationAllowZero
        issueEstimationExtended
        cyclesEnabled
        defaultIssueState { id }
        states(first: 50) { nodes { id name type position color } }
        labels(first: 100) { nodes { id name color isGroup parent { name } } }
        members(first: 100, filter: { active: { eq: true } }) {
          nodes { id name displayName email avatarUrl }
        }
        projects(first: 50, filter: { state: { in: ["backlog", "planned", "started"] } }) {
          nodes { id name projectMilestones(first: 20) { nodes { id name } } }
        }
        cycles(first: 20, filter: { endsAt: { gte: $today } }) {
          nodes { id number name }
        }
        activeCycle { id }
      }
    }
  }
`;

type Team = {
  id: string;
  key: string;
  name: string;
  issueEstimationType: "notUsed" | "exponential" | "fibonacci" | "linear" | "tShirt";
  issueEstimationAllowZero: boolean;
  issueEstimationExtended: boolean;
  cyclesEnabled: boolean;
  defaultIssueState: { id: string } | null;
  states: { nodes: { id: string; name: string; type: string; position: number; color: string }[] };
  labels: {
    nodes: { id: string; name: string; color: string; isGroup: boolean; parent: { name: string } | null }[];
  };
  members: {
    nodes: { id: string; name: string; displayName: string; email: string | null; avatarUrl: string | null }[];
  };
  projects: {
    nodes: { id: string; name: string; projectMilestones: { nodes: { id: string; name: string }[] } }[];
  };
  cycles: { nodes: { id: string; number: number; name: string | null }[] };
  activeCycle: { id: string } | null;
};

/** Linear's workflow order, which is not the states' `position` alone. */
const STATE_ORDER = ["triage", "backlog", "unstarted", "started", "completed", "canceled", "duplicate"];

/**
 * The points a team's estimate picker offers, in Linear's own four scales.
 * `extended` adds one more step at the top; `allowZero` one at the bottom.
 */
function estimateScale(team: Team): LinearOptions["estimate"] {
  const type = team.issueEstimationType;
  if (type === "notUsed") return null;
  const base: { value: number; label: string }[] = (() => {
    switch (type) {
      case "exponential":
        return [1, 2, 4, 8, 16, ...(team.issueEstimationExtended ? [32] : [])].map(
          (v) => ({ value: v, label: String(v) }),
        );
      case "fibonacci":
        return [1, 2, 3, 5, 8, ...(team.issueEstimationExtended ? [13] : [])].map(
          (v) => ({ value: v, label: String(v) }),
        );
      case "linear":
        return [1, 2, 3, 4, 5, ...(team.issueEstimationExtended ? [6, 7] : [])].map(
          (v) => ({ value: v, label: String(v) }),
        );
      case "tShirt":
        return ["XS", "S", "M", "L", "XL", ...(team.issueEstimationExtended ? ["XXL"] : [])].map(
          (label, i) => ({ value: i + 1, label }),
        );
    }
  })();
  return {
    scale: team.issueEstimationAllowZero ? [{ value: 0, label: "0" }, ...base] : base,
  };
}

export async function GET(request: Request) {
  const refused = await operatorCheck(request);
  if (refused) return refused;

  let team: Team | undefined;
  try {
    const data = await linear<{ teams: { nodes: Team[] } }>(QUERY, {
      key: TEAM_KEY,
      today: new Date().toISOString(),
    });
    team = data.teams.nodes[0];
  } catch (error) {
    return refuse(502, error instanceof LinearFailed ? error.message : "Linear did not answer.");
  }
  if (!team) {
    return refuse(502, `Linear has no team with the key ${TEAM_KEY}.`);
  }

  const options: LinearOptions = {
    team: {
      id: team.id,
      key: team.key,
      name: team.name,
      defaultStateId: team.defaultIssueState?.id ?? null,
    },
    states: [...team.states.nodes]
      .sort(
        (a, b) =>
          STATE_ORDER.indexOf(a.type) - STATE_ORDER.indexOf(b.type) ||
          a.position - b.position,
      )
      .map(({ id, name, type, color }) => ({ id, name, type, color })),
    labels: team.labels.nodes
      .filter((l) => !l.isGroup)
      .map(({ id, name, color, parent }) => ({
        id,
        name,
        color,
        group: parent?.name ?? null,
      })),
    members: team.members.nodes,
    projects: team.projects.nodes.map((p) => ({
      id: p.id,
      name: p.name,
      milestones: p.projectMilestones.nodes,
    })),
    cycles: team.cyclesEnabled
      ? team.cycles.nodes.map((c) => ({
          ...c,
          active: c.id === team.activeCycle?.id,
        }))
      : null,
    estimate: estimateScale(team),
  };
  return Response.json(options);
}
