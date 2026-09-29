"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  adminApi,
  AFFILIATE_LINK_BASE,
  type AffiliateAccount,
  type AffiliateDetail,
  type AffiliateRow,
  type AffiliateStatsRow,
} from "@/lib/api";
import { useAct } from "@/lib/act";
import { cash, pctOf, shortUser, when } from "@/lib/format";
import { useAdminToken } from "@/lib/session";
import { CopyLink } from "../../components/CopyLink";
import { Empty, Instrument, Loading, Panel } from "../../components/Bits";
import { useAffiliateStats } from "../stats";

/**
 * One affiliate: their link, where it lands, whose it is, ninety days of
 * clicks, how far the people it brought got, and each of those people.
 *
 * The detail is a query, so it moves as clicks arrive. `today` is this
 * browser's UTC day: a Convex query reads its clock once and caches the
 * answer, so a quiet link's chart would otherwise stop on the day it was
 * first opened. The money is the stats action, as on the list.
 */
export default function AffiliatePage() {
  const { id } = useParams<{ id: string }>();
  const token = useAdminToken();
  // The list says whether the id exists before the detail is asked for: the
  // detail throws on an unknown or malformed id, and a thrown query takes the
  // whole page down where a wrong id should read as a dead end.
  const list = useQuery(adminApi.affiliateList, { token });
  const known = list?.some((row) => row._id === id);
  const today = useUtcDay();
  const fresh = useQuery(adminApi.affiliateDetail, known ? { token, id, today } : "skip");
  const { stats, broken, reload } = useAffiliateStats(token);
  // New arguments (the day turning) make the query answer `undefined` until
  // it has run again. Keeping the last answer meanwhile stops the page falling
  // back to Loading and unmounting a half-typed edit.
  const [kept, setKept] = useState<AffiliateDetail | undefined>(undefined);
  if (fresh !== undefined && fresh !== kept) setKept(fresh);
  const detail = fresh ?? (kept?.affiliate._id === id ? kept : undefined);

  if (list !== undefined && !known)
    return (
      <div className="space-y-4">
        <BackLink />
        <h1 className="ops-title">No such affiliate</h1>
        <p className="ops-prose">
          Nothing is on file under <span className="ops-mono break-all">{id}</span>.
          It may be a typo, or a link from another deployment.
        </p>
      </div>
    );

  if (detail === undefined)
    return (
      <div className="space-y-4">
        <BackLink />
        <Loading />
      </div>
    );

  const { affiliate } = detail;
  const row = stats?.rows.find((r) => r.id === affiliate._id);

  return (
    <div className="space-y-6">
      <Header token={token} affiliate={affiliate} onChanged={reload} />
      <Figures detail={detail} row={row} currency={stats?.currency ?? null} broken={broken} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Chart days={detail.days} />
        </div>
        <Funnel detail={detail} row={row} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Edit key={affiliate._id} token={token} affiliate={affiliate} />
        <Promotion
          token={token}
          affiliate={affiliate}
          row={row}
          broken={broken}
          onChanged={reload}
        />
      </div>

      <Accounts detail={detail} />
    </div>
  );
}

/** Today as a UTC "YYYY-MM-DD", checked each minute so the chart turns over at midnight UTC. */
function useUtcDay() {
  const utc = () => new Date().toISOString().slice(0, 10);
  const [today, setToday] = useState(utc);
  useEffect(() => {
    const tick = setInterval(() => setToday(utc()), 60_000);
    return () => clearInterval(tick);
  }, []);
  return today;
}

/** A UTC day key as the chart names it — in UTC, so no reader's timezone moves it a day. */
function utcLabel(key: string): string {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function BackLink() {
  return (
    <Link href="/affiliates" className="ops-note inline-flex h-6 items-center hover:text-ink">
      ← Affiliates
    </Link>
  );
}

function Header({
  token,
  affiliate,
  onChanged,
}: {
  token: string;
  affiliate: AffiliateRow;
  onChanged: () => void;
}) {
  const setDisabled = useMutation(adminApi.affiliateSetDisabled);
  const act = useAct();
  const disabled = affiliate.disabledAt !== undefined;
  const link = `${AFFILIATE_LINK_BASE}${affiliate.slug}`;

  return (
    <header className="space-y-3">
      <BackLink />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className={`ops-title min-w-0 break-words ${disabled ? "text-ink-3" : ""}`}>
          {affiliate.name}
        </h1>
        <span className={`ops-chip ${disabled ? "text-ink-3" : "border-rule-strong text-ink"}`}>
          {disabled ? `Disabled ${when(affiliate.disabledAt!)}` : "Counting"}
        </span>
        <button
          type="button"
          className="ops-chip"
          disabled={act.busy}
          onClick={() =>
            act.run(
              disabled ? "enable this link" : "disable this link",
              setDisabled({ token, id: affiliate._id, disabled: !disabled }).then(onChanged),
            )
          }
        >
          {disabled ? "Enable" : "Disable"}
        </button>
        {act.failed && (
          <span className="ops-failed" role="status">
            Could not {act.failed}.{act.why ? ` ${act.why}` : ""}
          </span>
        )}
        <p className="ops-mono ml-auto text-ink-2">created {when(affiliate.createdAt)}</p>
      </div>
      <dl className="grid gap-x-6 gap-y-1.5 text-[length:var(--text-ui)] sm:grid-cols-[auto_minmax(0,1fr)]">
        <dt className="ops-note">Link</dt>
        <dd className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="ops-mono break-all">{link}</span>
          <CopyLink slug={affiliate.slug} label="Copy" />
        </dd>
        <dt className="ops-note">Sends people to</dt>
        <dd className="ops-mono break-all">{affiliate.destination}</dd>
        <dt className="ops-note">Their account</dt>
        <dd className="min-w-0">
          {affiliate.ownerId ? (
            <Link className="text-ink hover:underline" href={`/users/${affiliate.ownerId}`}>
              {affiliate.ownerEmail ?? shortUser(affiliate.ownerId)}
            </Link>
          ) : (
            <span className="text-ink-3">Not set</span>
          )}
        </dd>
        {affiliate.note && (
          <>
            <dt className="ops-note">Note</dt>
            <dd className="break-words">{affiliate.note}</dd>
          </>
        )}
      </dl>
      {disabled && (
        <p className="ops-note">
          Disabled: clicks land on the marketing site and nobody new is credited
          to it. What it already brought stays below.
        </p>
      )}
    </header>
  );
}

/**
 * How many of the link's signups got this far. The stats row counts every
 * one of them; until it answers, or when it cannot, the accounts this page
 * holds are counted instead — all of them unless the link brought more than
 * the newest 200, in which case `partial` says so.
 */
function counted(detail: AffiliateDetail, row: AffiliateStatsRow | undefined) {
  const { accounts } = detail;
  const count = (pick: (a: AffiliateAccount) => boolean | undefined) =>
    accounts.filter((a) => pick(a)).length;
  return {
    viaLink: row?.viaLink ?? count((a) => a.via === "link"),
    viaCode: row?.viaCode ?? count((a) => a.via === "code"),
    onboarded: row?.onboarded ?? count((a) => a.onboarded),
    walled: row?.walled ?? count((a) => a.walled),
    reachedCheckout: row?.reachedCheckout ?? count((a) => a.reachedCheckout),
    paying: row?.paying ?? count((a) => a.paying),
    team: row?.teamPaying ?? count((a) => a.team),
    partial: row === undefined && accounts.length < detail.affiliate.signups,
  };
}

function Figures({
  detail,
  row,
  currency,
  broken,
}: {
  detail: AffiliateDetail;
  row: AffiliateStatsRow | undefined;
  currency: string | null;
  broken: string | null;
}) {
  const { affiliate } = detail;
  const got = counted(detail, row);
  const newest = got.partial ? ` (newest ${detail.accounts.length})` : "";
  return (
    <div className="ops-instruments sm:grid-cols-4">
      <Instrument
        label="Clicks"
        value={affiliate.clicks.toLocaleString()}
        note={`${affiliate.visitors.toLocaleString()} visitors`}
      />
      <Instrument
        label="Signups"
        value={affiliate.signups.toLocaleString()}
        note={`${got.viaLink} by link · ${got.viaCode} by code${newest}`}
      />
      <Instrument
        label="Paying"
        value={got.paying.toLocaleString()}
        note={
          got.team
            ? `${got.team} bought Team${newest}`
            : `${got.reachedCheckout} reached checkout${newest}`
        }
      />
      <Instrument
        label="MRR"
        value={row?.mrr === undefined ? undefined : cash(row.mrr, currency)}
        note={
          broken
            ? "Needs Stripe"
            : row?.teamMrr
              ? `+ ${cash(row.teamMrr, currency)} Team`
              : "Annual spread over twelve"
        }
      />
    </div>
  );
}

/**
 * Ninety days, one column each: clicks as the pale bar, unique visitors that
 * day drawn over it. Every figure is in the column's title, and the peak and
 * totals are written out, so nothing is carried by the drawing alone.
 */
function Chart({ days }: { days: AffiliateDetail["days"] }) {
  const peak = Math.max(0, ...days.map((d) => d.clicks));
  const clicks = days.reduce((s, d) => s + d.clicks, 0);
  const visitors = days.reduce((s, d) => s + d.visitors, 0);
  const height = (n: number) => (peak > 0 && n > 0 ? `${Math.max((n / peak) * 100, 3)}%` : "0");

  return (
    <Panel
      title="Last 90 days"
      aside={
        <span className="ops-note tabular-nums">
          {clicks.toLocaleString()} clicks · {visitors.toLocaleString()} visitor-days
        </span>
      }
    >
      {clicks === 0 ? (
        <Empty>No clicks in the last ninety days.</Empty>
      ) : (
        <div className="p-4">
          <div className="mb-2 flex items-center gap-4 ops-note">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px] bg-rule-strong" aria-hidden />
              Clicks
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px] bg-ink-2" aria-hidden />
              Visitors
            </span>
            <span className="ml-auto tabular-nums">peak {peak.toLocaleString()} a day</span>
          </div>
          <div
            className="flex h-28 items-end gap-px border-b border-rule"
            role="img"
            aria-label={`Daily clicks for the last 90 days, peaking at ${peak}`}
          >
            {days.map((d) => (
              <div
                key={d.day}
                className="relative h-full min-w-0 flex-1 hover:bg-hover"
                title={`${utcLabel(d.day)} · ${d.clicks} clicks · ${d.visitors} visitors`}
                data-day={d.day}
                data-clicks={d.clicks}
                data-visitors={d.visitors}
              >
                <span
                  className="absolute inset-x-0 bottom-0 rounded-t-[2px] bg-rule-strong"
                  style={{ height: height(d.clicks) }}
                />
                <span
                  className="absolute inset-x-0 bottom-0 rounded-t-[2px] bg-ink-2"
                  style={{ height: height(d.visitors) }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between ops-note tabular-nums">
            <span>{utcLabel(days[0].day)}</span>
            <span>{utcLabel(days[Math.floor(days.length / 2)].day)}</span>
            <span>Today (UTC)</span>
          </div>
        </div>
      )}
    </Panel>
  );
}

/**
 * The same seven steps as the list, down the page, each as a share of the
 * step it follows from (as on the list: a wall and a checkout
 * are each a share of signups, since neither implies the other).
 */
function Funnel({ detail, row }: { detail: AffiliateDetail; row: AffiliateStatsRow | undefined }) {
  const { affiliate, accounts } = detail;
  const got = counted(detail, row);
  // [label, count, index of the step it is a share of]
  const steps: [string, number, number | null][] = [
    ["Clicks", affiliate.clicks, null],
    ["Visitors", affiliate.visitors, 0],
    ["Signups", affiliate.signups, 1],
    ["Onboarded", got.onboarded, 2],
    ["Hit a wall", got.walled, 2],
    ["Opened checkout", got.reachedCheckout, 2],
    ["Paying", got.paying, 5],
  ];

  return (
    <Panel title="Funnel">
      <ol className="space-y-1.5 p-4">
        {steps.map(([name, value, of]) => (
          <li
            key={name}
            className="grid grid-cols-[minmax(0,1fr)_auto_3rem] items-baseline gap-3 text-[length:var(--text-ui)]"
          >
            <span className="text-ink-2">{name}</span>
            <span className="tabular-nums">{value.toLocaleString()}</span>
            <span className="ops-note text-right tabular-nums">
              {of === null ? "" : pctOf(value, steps[of][1])}
            </span>
          </li>
        ))}
      </ol>
      <p className="ops-note border-t border-rule px-4 py-2">
        Walls and checkouts as a share of signups; paying of checkouts.
        {got.partial &&
          ` Past signups: the newest ${accounts.length} of ${affiliate.signups.toLocaleString()}, until the full count loads.`}
      </p>
    </Panel>
  );
}

/**
 * Name, note, destination and owner. The slug is shown and not editable:
 * it is already printed in bios and videos. Only what changed is sent; an
 * empty note or owner clears it.
 */
function Edit({ token, affiliate }: { token: string; affiliate: AffiliateRow }) {
  const update = useMutation(adminApi.affiliateUpdate);
  const act = useAct();
  const [name, setName] = useState(affiliate.name);
  const [note, setNote] = useState(affiliate.note ?? "");
  const [destination, setDestination] = useState(affiliate.destination);
  const [owner, setOwner] = useState(affiliate.ownerId ?? "");
  const [saved, setSaved] = useState(false);

  const patch = {
    ...(name.trim() !== affiliate.name ? { name } : {}),
    ...(note.trim() !== (affiliate.note ?? "") ? { note } : {}),
    ...(destination.trim() !== affiliate.destination ? { destination } : {}),
    ...(owner.trim() !== (affiliate.ownerId ?? "") ? { ownerId: owner.trim() || null } : {}),
  };
  const changed = Object.keys(patch).length > 0;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!changed || act.busy) return;
    setSaved(false);
    act.run("save those changes", update({ token, id: affiliate._id, ...patch }).then(() => setSaved(true)));
  };

  return (
    <Panel title="Details">
      <form className="grid gap-3 p-4" onSubmit={submit}>
        <label className="block space-y-1">
          <span className="ops-note">Slug</span>
          <input
            className="ops-input ops-mono h-7 text-ink-3"
            value={affiliate.slug}
            readOnly
            aria-readonly
            title="A slug cannot change: the link is already out in the world."
          />
        </label>
        <label className="block space-y-1">
          <span className="ops-note">Name</span>
          <input className="ops-input h-7" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="ops-note">Sends people to</span>
          <input
            className="ops-input h-7"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            spellCheck={false}
          />
          <span className="ops-note block text-ink-3">
            https on nootles.com, www.nootles.com or app.nootles.com only.
          </span>
        </label>
        <label className="block space-y-1">
          <span className="ops-note">Their Nootles account</span>
          <input
            className="ops-input ops-mono h-7"
            placeholder="user_… (blank for none)"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            spellCheck={false}
          />
        </label>
        <label className="block space-y-1">
          <span className="ops-note">Note</span>
          <input className="ops-input h-7" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="ops-chip" disabled={act.busy || !changed}>
            Save
          </button>
          {act.failed && (
            <span className="ops-failed" role="status">
              Could not {act.failed}.{act.why ? ` ${act.why}` : ""}
            </span>
          )}
          {saved && !changed && !act.failed && (
            <span className="ops-note" role="status">
              Saved
            </span>
          )}
        </div>
      </form>
    </Panel>
  );
}

/**
 * A Stripe promotion code of theirs, made under Billing → Discount codes. A
 * checkout that redeems it is credited to them even without the link. Stripe
 * is asked, so the answer — and any refusal — is the deployment's sentence.
 */
function Promotion({
  token,
  affiliate,
  row,
  broken,
  onChanged,
}: {
  token: string;
  affiliate: AffiliateRow;
  row: AffiliateStatsRow | undefined;
  broken: string | null;
  onChanged: () => void;
}) {
  const link = useAction(adminApi.affiliateLinkPromotion);
  const act = useAct();
  const [code, setCode] = useState("");

  return (
    <Panel title="Promotion code">
      <div className="space-y-3 p-4">
        {affiliate.promotionCode ? (
          <div className="flex flex-wrap items-center gap-3 text-[length:var(--text-ui)]">
            <span className="ops-mono">{affiliate.promotionCode}</span>
            <span className="ops-note">
              {row?.promotionRedemptions !== undefined
                ? `used ${row.promotionRedemptions} times, by anyone`
                : broken
                  ? "uses unknown — Stripe did not answer"
                  : ""}
            </span>
            <button
              type="button"
              className="ops-chip ml-auto"
              disabled={act.busy}
              onClick={() =>
                act.run(
                  "unlink that code",
                  link({ token, id: affiliate._id, code: null }).then(onChanged),
                )
              }
            >
              Unlink
            </button>
          </div>
        ) : (
          <p className="ops-note">
            No code linked. Make one under Billing → Discount codes, then link it
            here by the code customers type.
          </p>
        )}
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!code.trim() || act.busy) return;
            act.run(
              "link that code",
              link({ token, id: affiliate._id, code: code.trim() }).then(() => {
                setCode("");
                onChanged();
              }),
            );
          }}
        >
          <input
            className="ops-input ops-mono h-7 w-48"
            placeholder="CODE"
            aria-label="The promotion code as customers type it"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
          />
          <button type="submit" className="ops-chip" disabled={act.busy || !code.trim()}>
            {affiliate.promotionCode ? "Replace" : "Link code"}
          </button>
        </form>
        {act.failed && (
          <p className="ops-failed" role="status">
            Could not {act.failed}.{act.why ? ` ${act.why}` : ""}
          </p>
        )}
      </div>
    </Panel>
  );
}

function Mark({ on }: { on: boolean | undefined }) {
  return (
    <td className="text-center">
      {on === undefined ? (
        <span className="text-ink-3">?</span>
      ) : on ? (
        <span aria-label="yes">✓</span>
      ) : (
        <span className="text-ink-3" aria-label="no">
          –
        </span>
      )}
    </td>
  );
}

function Accounts({ detail }: { detail: AffiliateDetail }) {
  const { accounts, affiliate } = detail;
  return (
    <Panel
      title="Accounts it brought"
      aside={
        accounts.length < affiliate.signups ? (
          <span className="ops-note">
            newest {accounts.length} of {affiliate.signups.toLocaleString()}
          </span>
        ) : undefined
      }
    >
      {accounts.length === 0 ? (
        <Empty>Nobody yet. An account is credited when someone new signs up within 30 days of a click.</Empty>
      ) : (
        <div className="ops-scroll">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Via</th>
                <th>Clicked</th>
                <th>Credited</th>
                <th className="text-center">Onboarded</th>
                <th className="text-center">Walled</th>
                <th className="text-center">Checkout</th>
                <th className="text-center">Paying</th>
                <th className="text-center">Team</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.ownerId}>
                  <td>
                    <Link className="text-ink hover:underline" href={`/users/${a.ownerId}`}>
                      {a.email ?? a.name ?? shortUser(a.ownerId)}
                    </Link>
                  </td>
                  <td className="text-[length:var(--text-note)]">{a.via === "code" ? "Code" : "Link"}</td>
                  <td className="text-[length:var(--text-note)] text-ink-2">
                    {a.clickedAt === undefined ? "–" : when(a.clickedAt)}
                  </td>
                  <td className="text-[length:var(--text-note)] text-ink-2">{when(a.attributedAt)}</td>
                  <Mark on={a.onboarded} />
                  <Mark on={a.walled} />
                  <Mark on={a.reachedCheckout} />
                  <Mark on={a.paying} />
                  <Mark on={a.team} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
