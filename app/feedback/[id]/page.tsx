"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { adminApi } from "@/lib/api";
import { when } from "@/lib/format";

const STATUSES = ["new", "seen", "done"] as const;

export default function FeedbackDetail() {
  const { id } = useParams<{ id: string }>();
  const row = useQuery(adminApi.feedbackGet, { id });
  const setStatus = useMutation(adminApi.feedbackSetStatus);

  if (row === undefined) return <p className="text-muted">Loading…</p>;
  if (row === null)
    return (
      <p className="text-muted">
        This report doesn&rsquo;t exist.{" "}
        <Link href="/feedback" className="underline">
          Back to the inbox
        </Link>
        .
      </p>
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/feedback" className="text-[13px] text-muted hover:text-foreground">
          ← Inbox
        </Link>
        <span className="ops-meta">{row.kind === "issue" ? "bug report" : "feature request"}</span>
        <span className="text-[12px] text-faint">{when(row.createdAt)}</span>
        <div className="ml-auto flex gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`ops-chip${row.status === s ? " is-on" : ""}`}
              onClick={() => void setStatus({ id: row._id, status: s })}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <section className="ops-card p-4">
        <p className="max-w-prose whitespace-pre-wrap text-[14px] leading-relaxed">
          {row.text}
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        {row.replayUrl && (
          <a
            href={row.replayUrl}
            target="_blank"
            rel="noreferrer"
            className="ops-chip is-on"
          >
            Watch session replay ↗
          </a>
        )}
        <span className="ops-chip">user · {row.ownerId}</span>
        {row.env.sha && <span className="ops-chip">build · {row.env.sha}</span>}
        <span className="ops-chip">viewport · {row.env.viewport}</span>
        {row.pageId && <span className="ops-chip">page · {row.pageId}</span>}
      </div>

      {row.screenshotUrl && (
        <section className="ops-card p-3">
          <h2 className="ops-meta mb-2">Screenshot at report time</h2>
          <a href={row.screenshotUrl} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={row.screenshotUrl}
              alt="Screenshot attached to the report"
              className="max-h-[480px] w-auto rounded border border-border"
            />
          </a>
        </section>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <section>
          <h2 className="ops-meta mb-2">Console tail</h2>
          <pre className="ops-pre">{row.consoleLog?.trim() || "(empty)"}</pre>
        </section>
        <section>
          <h2 className="ops-meta mb-2">Recent ops</h2>
          <pre className="ops-pre">
            {row.recentOps?.length
              ? JSON.stringify(row.recentOps, null, 2)
              : "(none recorded)"}
          </pre>
        </section>
      </div>

      <p className="text-[12px] text-faint">
        Reported from {row.env.ua}
      </p>
    </div>
  );
}
