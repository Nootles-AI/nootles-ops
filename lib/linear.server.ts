import { ConvexHttpClient } from "convex/browser";
import { adminApi } from "@/lib/api";

/**
 * The server half of filing in Linear — only ever imported by the route
 * handlers under app/api/linear/. Two env vars, both read here and nowhere
 * else:
 *
 *   LINEAR_API_KEY   a personal or workspace key from Linear → Settings → API.
 *                    Never NEXT_PUBLIC_: it stays on the server.
 *   LINEAR_TEAM_KEY  the team issues are filed under. Defaults to "NT".
 *
 * An operator's session token is the only credential the browser holds, so
 * every handler first asks the Nootles deployment whether that token is live
 * — the same `admin:validate` the Guard asks — and only then spends the key.
 */

export const TEAM_KEY = process.env.LINEAR_TEAM_KEY?.trim() || "NT";

/** A refusal the browser can repeat: `{ why }` with a sentence in it. */
export function refuse(status: number, why: string): Response {
  return Response.json({ why }, { status });
}

/**
 * Null when the bearer token is a live operator session; otherwise the
 * response that says why not.
 */
export async function operatorCheck(request: Request): Promise<Response | null> {
  const bearer = request.headers.get("authorization") ?? "";
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7).trim() : "";
  if (!token) return refuse(401, "Sign in to the dashboard first.");

  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return refuse(503, "NEXT_PUBLIC_CONVEX_URL is not set.");

  let valid: boolean;
  try {
    valid = await new ConvexHttpClient(url).query(adminApi.validate, { token });
  } catch {
    return refuse(502, "The Nootles deployment did not answer.");
  }
  return valid ? null : refuse(401, "Your operator session has expired.");
}

export class LinearFailed extends Error {}

/** One GraphQL call to Linear. Throws `LinearFailed` with Linear's own sentence. */
export async function linear<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const key = process.env.LINEAR_API_KEY?.trim();
  if (!key) {
    throw new LinearFailed(
      "Linear is not connected: LINEAR_API_KEY is not set on this dashboard.",
    );
  }
  let res: Response;
  try {
    res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: key },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new LinearFailed("Linear did not answer.");
  }
  const body = (await res.json().catch(() => null)) as {
    data?: T;
    errors?: {
      message?: string;
      extensions?: { userPresentableMessage?: string };
    }[];
  } | null;
  if (body?.errors?.length) {
    const first = body.errors[0];
    throw new LinearFailed(
      first.extensions?.userPresentableMessage ??
        first.message ??
        "Linear refused the request.",
    );
  }
  if (!res.ok || !body?.data) {
    throw new LinearFailed(`Linear answered ${res.status}.`);
  }
  return body.data;
}
