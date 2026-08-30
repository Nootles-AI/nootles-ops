"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useAction, useQuery } from "convex/react";
import { useAct } from "@/lib/act";
import { adminApi, KIND_WORDS } from "@/lib/api";
import { pctOf, shortUser, ticketName, usd, when } from "@/lib/format";
import { useAdminToken } from "@/lib/session";
import { Empty, Instrument, Loading, Panel } from "../../components/Bits";
import { StatusIcon } from "../../components/StatusIcon";
import { Face } from "../../components/Who";

/**
 * One user, watched closely — milestones, features touched, what they cost.
 *
 * Sheet throughout, no exceptions: this is a person's record, and the coding
 * agent has nothing to do with it. Their reports link out to tickets, where
 * the machine's paper lives; the list of them is still theirs.
 */
export default function UserDetail() {
  const { ownerId } = useParams<{ ownerId: string }>();
  const token = useAdminToken();
  const detail = useQuery(adminApi.userDetail, { token, ownerId });

  // `undefined` is still arriving; `null` is the deployment saying there is no
  // such person. Collapsing the two would let a wrong id read as a slow one.
  if (detail === undefined)
    return (
      <div className="space-y-4">
        <BackLink />
        <Loading />
      </div>
    );

  if (detail === null)
    return (
      <div className="space-y-4">
        <BackLink />
        {/* The same treatment a missing ticket gets: a wrong id is a dead end
            either way, and it should read the same on both detail pages. */}
        <h1 className="ops-title">No such user</h1>
        <p className="ops-prose">
          Nothing is on file under{" "}
          <span className="ops-mono break-all">{ownerId}</span>. It may be a
          typo, or the id may belong to an account that was never created.
        </p>
      </div>
    );

  const { profile, tutorial } = detail;
  // `||`, not `??`: a profile stamped with an empty string is as nameless as
  // one stamped with nothing, and `??` would put that empty string in the
  // title — a person with a blank name would get a page with no heading and
  // no address on it at all.
  const email = profile.email?.trim() || null;
  const name = profile.name?.trim() || email || shortUser(profile.ownerId);
  // Survey answers, free text. A blank answer is an unanswered question.
  const role = profile.role?.trim() || null;
  const useCase = profile.useCase?.trim() || null;
  // Face reads the profile's own name ahead of the fallback, so a name stamped
  // as an empty string would draw "?" over the initial we do have.
  const who = {
    imageUrl: profile.imageUrl,
    name: profile.name?.trim() || null,
    email,
  };
  const spend = detail.features.reduce((s, f) => s + f.costUsd, 0);
  const modelCalls = detail.features.reduce((s, f) => s + f.calls, 0);
  const sharedProjects = detail.projects.filter((p) => p.shared).length;
  const openReports = detail.reports.filter(
    (r) => r.status !== "done" && r.status !== "declined",
  ).length;

  // The tutorial has four states and only two of them count as reached. The
  // seeded/untouched pair reads as absence, so it stays unlit.
  const tutorialReached =
    tutorial !== null && (tutorial.edited || tutorial.aiRows > 0);
  const tutorialLabel =
    tutorial === null
      ? "No tutorial seeded"
      : tutorial.edited
        ? "Tutorial edited"
        : tutorial.aiRows > 0
          ? `Tutorial opened · ${tutorial.aiRows} AI rows`
          : "Tutorial untouched";

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <BackLink />
        <div className="flex flex-wrap items-center gap-3">
          <Face user={who} fallback={name} large />
          <h1 className="ops-title min-w-0 break-words">{name}</h1>
          {/* Only when it is not already the title — a nameless account is
              headed by its address, and printing it twice says nothing. */}
          {email && email !== name && (
            <span className="ops-note max-w-full truncate">{email}</span>
          )}
          {email && (
            <a href={`mailto:${email}`} className="ops-chip">
              Write to them
            </a>
          )}
          <StandIn ownerId={profile.ownerId} />
          <p className="ops-mono ml-auto text-ink-2">
            joined {when(profile.createdAt)} · last active{" "}
            {detail.lastActiveAt ? when(detail.lastActiveAt) : "never"}
          </p>
        </div>

        {/* The progress record. Lit means it happened; plain means it has not
            yet — which is why every chip is drawn, including the empty ones. */}
        <ul className="flex flex-wrap gap-2" aria-label="Milestones">
          <Chip on={!!role} title={role ?? undefined}>
            {role ? `Role · ${role}` : "No role given"}
          </Chip>
          <Chip on={!!useCase} title={useCase ?? undefined}>
            {useCase ? `Use case · ${useCase}` : "No use case given"}
          </Chip>
          <Chip on={profile.status === "done"}>
            Onboarding · {profile.status}
          </Chip>
          <Chip on={profile.letterSeen}>
            {profile.letterSeen ? "Letter read" : "Letter unread"}
          </Chip>
          <Chip on={tutorialReached}>{tutorialLabel}</Chip>
          <Chip on={!!detail.firstAcceptedAt}>
            {detail.firstAcceptedAt
              ? `First accept ${when(detail.firstAcceptedAt)}`
              : "No accepted suggestion yet"}
          </Chip>
        </ul>
      </header>

      {/* Four figures, drawn the way the Overview draws eight — a figure
          should look the same wherever it appears. The utility pins the row at
          four columns, because the shared grid opens to eight past 1100px and
          would leave this row half empty. */}
      <div className="ops-instruments sm:grid-cols-4">
        <Instrument
          label="Projects"
          value={detail.projects.length.toLocaleString()}
          note={sharedProjects ? `${sharedProjects} shared` : undefined}
        />
        <Instrument label="Pages" value={detail.pageCount.toLocaleString()} />
        <Instrument
          label="Reports"
          value={detail.reports.length.toLocaleString()}
          note={openReports ? `${openReports} still open` : undefined}
        />
        <Instrument
          label="Their spend"
          value={usd(spend)}
          note={`${modelCalls.toLocaleString()} model calls`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Suggestions by kind"
          aside={
            detail.suggestionsSampled > 0 ? (
              <span className="ops-note">
                {detail.suggestionsSampled.toLocaleString()} sampled
              </span>
            ) : undefined
          }
        >
          {detail.suggestionKinds.length === 0 ? (
            <Empty>
              No suggestions yet. Nothing has been offered to them in the
              editor.
            </Empty>
          ) : (
            <div className="ops-scroll">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Kind</th>
                    <th className="num">Shown</th>
                    <th className="num">Accepted</th>
                    <th className="num">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.suggestionKinds.map((k) => (
                    <tr key={k.kind}>
                      <td className="font-medium">{k.kind}</td>
                      <td className="num">{k.shown.toLocaleString()}</td>
                      <td className="num">{k.accepted.toLocaleString()}</td>
                      <td className="num">{pctOf(k.accepted, k.shown)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="AI features">
          {detail.features.length === 0 ? (
            <Empty>
              No model calls yet. Nothing they have done reached a model.
            </Empty>
          ) : (
            <div className="ops-scroll">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th className="num">Calls</th>
                    <th className="num">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.features.map((f) => (
                    <tr key={f.feature}>
                      <td className="font-medium">{f.feature}</td>
                      <td className="num">{f.calls.toLocaleString()}</td>
                      <td className="num">{usd(f.costUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Projects">
          {detail.projects.length === 0 ? (
            <Empty>
              No projects yet. Nothing has been created under this account.
            </Empty>
          ) : (
            <ul>
              {detail.projects.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2 text-[length:var(--text-ui)] last:border-b-0"
                >
                  <span className="min-w-0 truncate">
                    {p.title || "Untitled"}
                  </span>
                  <span className="ops-note shrink-0">
                    {p.shared ? "shared · " : ""}
                    {when(p.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Not TicketRow: that draws a FeedbackListRow, and this endpoint
            returns a slimmer shape with no PR states. Same vocabulary, drawn
            by hand — and the route carries the ticket's name, not its id, so
            a pasted PR branch resolves to the same page. */}
        <div className="lg:col-span-2">
          <Panel title="Their reports">
            {detail.reports.length === 0 ? (
              <Empty>No reports yet. They have not sent anything in.</Empty>
            ) : (
              <ul>
                {detail.reports.map((r) => (
                  <li
                    key={r.id}
                    className="border-b border-rule last:border-b-0"
                  >
                    <Link
                      href={`/feedback/${ticketName(r.number)}`}
                      className="flex items-center gap-2.5 px-4 py-2 text-[length:var(--text-ui)] hover:bg-hover"
                    >
                      <StatusIcon status={r.status} />
                      <span className="ops-id">{ticketName(r.number)}</span>
                      <span className="ops-kind shrink-0">
                        {KIND_WORDS[r.kind].short}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{r.text}</span>
                      {/* Not .ops-age: that class gives its slot up to the
                          inbox row's kebab, and goes to opacity 0 outright on
                          a coarse pointer. There is no kebab here, so the
                          date is drawn the way the Projects list draws it. */}
                      <span className="ops-note shrink-0">
                        {when(r.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

/**
 * Look at Nootles through this person's account, for half an hour, read-only.
 *
 * The reason is asked for rather than optional: the deployment logs every
 * session to an `impersonations` row, and a log of unexplained entries is a
 * log nobody can audit. It is also the one field a human writes, so the
 * deployment refuses anything under three characters.
 *
 * Opens in a new tab, and the token rides in the fragment — browsers send a
 * fragment to no server and write it to no referrer, so it is spoken only in
 * the tab that redeems it. Not a link with an href, because the token does
 * not exist until the action answers.
 */
function StandIn({ ownerId }: { ownerId: string }) {
  const token = useAdminToken();
  const start = useAction(adminApi.impersonate);
  const act = useAct();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");

  // No app to send the operator to means no button, rather than one that
  // mints a real session and then drops it on the floor.
  const app = process.env.NEXT_PUBLIC_NOOTLES_URL;
  if (!app) return null;

  if (!asking) {
    return (
      <button className="ops-chip" onClick={() => setAsking(true)}>
        Stand in
      </button>
    );
  }

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        act.run(
          "start the session",
          start({ token, subject: ownerId, reason }).then((session) => {
            window.open(`${app}/impersonate#${session.token}`, "_blank", "noopener");
            setAsking(false);
            setReason("");
          }),
        );
      }}
    >
      <input
        className="ops-input"
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why? (logged)"
        aria-label="Reason for standing in"
      />
      <button
        className="ops-chip"
        disabled={act.busy || reason.trim().length < 3}
      >
        {act.busy ? "Minting…" : "Go"}
      </button>
      <button
        type="button"
        className="ops-chip"
        onClick={() => {
          setAsking(false);
          act.dismiss();
        }}
      >
        Cancel
      </button>
      {act.failed && <p className="ops-failed">Could not {act.failed}.</p>}
    </form>
  );
}

/** Kept in all three branches, so a wrong id never strands the operator. */
function BackLink() {
  return (
    <Link
      href="/users"
      className="ops-note inline-flex h-6 items-center hover:text-ink"
    >
      ← Users
    </Link>
  );
}

/**
 * One milestone. Reached and not-reached are separated by ink alone, so the
 * row still reads as progress with both states drawn. Not `is-on`: that tint
 * marks the one option picked out of a control group, and a finished account
 * lights six of these at once — six sage chips in a row under the title would
 * spend the accent on something nobody chose.
 * A use case is free text, so the label truncates rather than pushing the
 * page sideways on a phone.
 */
function Chip({
  on,
  title,
  children,
}: {
  on?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <li
      className={`ops-chip max-w-full ${on ? "border-rule-strong text-ink" : "text-ink-3"}`}
      title={title}
    >
      <span className="min-w-0 truncate">{children}</span>
    </li>
  );
}
