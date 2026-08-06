"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { adminApi } from "@/lib/api";
import { pctOf, shortUser, ticketName, usd, when } from "@/lib/format";
import { useAdminToken } from "@/lib/session";
import { StatusIcon } from "../../components/StatusIcon";

/** One user, watched closely — milestones, features touched, what it costs. */
export default function UserDetail() {
  const { ownerId } = useParams<{ ownerId: string }>();
  const token = useAdminToken();
  const detail = useQuery(adminApi.userDetail, { token, ownerId });

  if (detail === undefined) return <p className="text-muted">Loading…</p>;
  if (detail === null)
    return (
      <p className="text-muted">
        No such user.{" "}
        <Link href="/users" className="underline">
          Back to the roster
        </Link>
        .
      </p>
    );

  const { profile, tutorial } = detail;
  const spend = detail.features.reduce((s, f) => s + f.costUsd, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <Link href="/users" className="text-[13px] text-muted hover:text-foreground">
          ← Users
        </Link>
        {profile.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.imageUrl} alt="" className="ops-who-face is-lg" />
        )}
        <h1 className="text-lg font-semibold tracking-tight">
          {profile.name ?? profile.email ?? shortUser(profile.ownerId)}
        </h1>
        {profile.name && profile.email && (
          <span className="text-[13px] text-muted">{profile.email}</span>
        )}
        {profile.email && (
          <a href={`mailto:${profile.email}`} className="ops-chip">
            Write to them ✉
          </a>
        )}
        <span className="ml-auto text-[12px] text-faint">
          joined {when(profile.createdAt)} · last active{" "}
          {detail.lastActiveAt ? when(detail.lastActiveAt) : "never"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="ops-chip">role · {profile.role ?? "–"}</span>
        <span className="ops-chip">use case · {profile.useCase ?? "–"}</span>
        <span className="ops-chip">onboarding · {profile.status}</span>
        <span className={`ops-chip${profile.letterSeen ? " is-on" : ""}`}>
          {profile.letterSeen ? "Letter read" : "Letter unread"}
        </span>
        <span
          className={`ops-chip${tutorial && (tutorial.edited || tutorial.aiRows > 0) ? " is-on" : ""}`}
        >
          {tutorial === null
            ? "No tutorial seeded"
            : tutorial.edited
              ? "Tutorial edited"
              : tutorial.aiRows > 0
                ? `Tutorial opened (${tutorial.aiRows} AI rows)`
                : "Tutorial untouched"}
        </span>
        <span className={`ops-chip${detail.firstAcceptedAt ? " is-on" : ""}`}>
          {detail.firstAcceptedAt
            ? `First accept ${when(detail.firstAcceptedAt)}`
            : "No accepted suggestion yet"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Projects" value={String(detail.projects.length)} />
        <MiniStat label="Pages" value={String(detail.pageCount)} />
        <MiniStat label="Reports" value={String(detail.reports.length)} />
        <MiniStat label="Their spend" value={usd(spend)} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="ops-card overflow-x-auto">
          <header className="border-b border-border px-4 py-3">
            <h2 className="ops-meta">Suggestions by kind</h2>
          </header>
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
                  <td className="num">{k.shown}</td>
                  <td className="num">{k.accepted}</td>
                  <td className="num">{pctOf(k.accepted, k.shown)}</td>
                </tr>
              ))}
              {detail.suggestionKinds.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-muted">
                    No AI activity recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="ops-card overflow-x-auto">
          <header className="border-b border-border px-4 py-3">
            <h2 className="ops-meta">AI features</h2>
          </header>
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
              {detail.features.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-muted">
                    No model calls yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="ops-card p-4">
          <h2 className="ops-meta">Projects</h2>
          <ul className="mt-2 space-y-1 text-[13px]">
            {detail.projects.map((p) => (
              <li key={p.id} className="flex justify-between gap-3">
                <span className="truncate">{p.title || "Untitled"}</span>
                <span className="shrink-0 text-[12px] text-faint">
                  {p.shared ? "shared · " : ""}
                  {when(p.createdAt)}
                </span>
              </li>
            ))}
            {detail.projects.length === 0 && (
              <li className="text-muted">None yet.</li>
            )}
          </ul>
        </section>

        <section className="ops-card p-4">
          <h2 className="ops-meta">Their reports</h2>
          <ul className="mt-2 space-y-1.5 text-[13px]">
            {detail.reports.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/feedback/${ticketName(r.number)}`}
                  className="flex items-center gap-2 hover:underline"
                >
                  <StatusIcon status={r.status} />
                  <span className="ops-ticket-id">{ticketName(r.number)}</span>
                  <span className="ops-meta shrink-0">
                    {r.kind === "issue" ? "bug" : "wish"}
                  </span>
                  <span className="min-w-0 truncate">{r.text}</span>
                  <span className="ml-auto shrink-0 text-[12px] text-faint">
                    {when(r.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
            {detail.reports.length === 0 && <li className="text-muted">None yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ops-card p-4">
      <p className="ops-meta">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
    </div>
  );
}
