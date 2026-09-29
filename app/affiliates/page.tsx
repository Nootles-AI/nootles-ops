"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import {
  adminApi,
  AFFILIATE_LINK_BASE,
  type AffiliateRow,
  type AffiliateStatsRow,
} from "@/lib/api";
import { useAct } from "@/lib/act";
import { cash, pctOf, when } from "@/lib/format";
import { useAdminToken } from "@/lib/session";
import { CopyLink } from "../components/CopyLink";
import { Empty, Instrument, Loading, Panel } from "../components/Bits";
import { useAffiliateStats } from "./stats";

/** What a new link sends people to unless told otherwise — the backend's own default. */
const DEFAULT_DESTINATION = "https://nootles.com/";

/**
 * Influencers' links, and what each one brought — measurement only: nothing
 * here pays anybody.
 *
 * Two sources, joined by id. The list is a query, so clicks, signups and a
 * link just made or disabled appear on their own. The funnel past signups and
 * the money are an action (`affiliateStats`), because the prices are Stripe's;
 * it loads on mount and again after every change here, and until it answers —
 * or if it cannot — the rows keep the list's counts and the rest reads "–".
 */
export default function Affiliates() {
  const token = useAdminToken();
  const list = useQuery(adminApi.affiliateList, { token });
  const { stats, broken, reload } = useAffiliateStats(token);

  const byId = new Map(stats?.rows.map((row) => [row.id, row]) ?? []);
  const sum = (pick: (row: AffiliateRow) => number) =>
    list?.reduce((total, row) => total + pick(row), 0);
  const clicks = sum((row) => row.clicks);
  const visitors = sum((row) => row.visitors);
  const signups = sum((row) => row.signups);
  const paying = stats?.rows.reduce((total, row) => total + (row.paying ?? 0), 0);
  const reached = stats?.rows.reduce((total, row) => total + (row.reachedCheckout ?? 0), 0);
  const mrr = stats?.rows.reduce((total, row) => total + (row.mrr ?? 0), 0);
  const teamMrr = stats?.rows.reduce((total, row) => total + (row.teamMrr ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="ops-title">Affiliates</h1>
        <p className="ops-prose mt-1 text-ink-2">
          Influencers&rsquo; links, and how far the people they send get: from
          a click to a paying account.
        </p>
      </div>

      <div className="ops-instruments sm:grid-cols-4">
        <Instrument
          label="Clicks"
          value={clicks?.toLocaleString()}
          note={visitors === undefined ? undefined : `${visitors.toLocaleString()} visitors`}
        />
        <Instrument
          label="Signups"
          value={signups?.toLocaleString()}
          note={
            visitors === undefined || signups === undefined
              ? undefined
              : `${pctOf(signups, visitors)} of visitors`
          }
        />
        <Instrument
          label="Paying"
          value={paying?.toLocaleString()}
          note={
            broken
              ? "Needs Stripe"
              : reached === undefined
                ? undefined
                : `${reached} reached checkout`
          }
        />
        <Instrument
          label="MRR"
          value={stats && mrr !== undefined ? cash(mrr, stats.currency) : undefined}
          note={
            broken
              ? "Needs Stripe"
              : stats?.unpriced
                ? `${stats.unpriced} without a readable price`
                : stats && teamMrr
                  ? `+ ${cash(teamMrr, stats.currency)} Team`
                  : "Annual spread over twelve"
          }
        />
      </div>

      <Panel
        title="Links"
        aside={
          stats && (
            <span className="ops-note" title={new Date(stats.generatedAt).toLocaleString()}>
              Funnel as of {when(stats.generatedAt)}
            </span>
          )
        }
      >
        {/* Said, not hidden: without Stripe the funnel past signups cannot be
            priced, and the rows below are the list's own counts. */}
        {broken && (
          <p className="ops-note border-b border-rule px-4 py-2" role="status">
            Clicks and signups only — the funnel did not load. {broken}
          </p>
        )}
        {list === undefined ? (
          <Loading />
        ) : list.length === 0 ? (
          <Empty>
            No links yet. Make one below and hand it to whoever is promoting
            Nootles.
          </Empty>
        ) : (
          <div className="ops-scroll">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Affiliate</th>
                  <th className="num">Clicks</th>
                  <th className="num">Visitors</th>
                  <th className="num">Signups</th>
                  <th className="num">Onboarded</th>
                  <th className="num" title="Share of signups">Walled</th>
                  <th className="num" title="Share of signups">Checkout</th>
                  <th className="num" title="Share of checkouts">Paying</th>
                  <th className="num">MRR</th>
                  <th className="num">Team</th>
                  <th className="num" title="Signups through the link, and through the linked code">
                    Link · code
                  </th>
                  <th className="num" title="Stripe's count of the linked code's redemptions">
                    Code used
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <LinkRow
                    key={row._id}
                    token={token}
                    row={row}
                    stats={byId.get(row._id)}
                    currency={stats?.currency ?? null}
                    onChanged={reload}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Create token={token} list={list} onCreated={reload} />
    </div>
  );
}

/**
 * A figure and, under it, how much of the step before it made it this far.
 * Absent is "–", never 0: a funnel that has not loaded is not a funnel of
 * zeros.
 */
function Step({ value, of }: { value: number | undefined; of?: number | undefined }) {
  return (
    <td className="num tabular-nums">
      {value === undefined ? (
        <span className="text-ink-3">–</span>
      ) : (
        <>
          {value.toLocaleString()}
          {of !== undefined && (
            <span className="ops-note block leading-tight text-ink-3">{pctOf(value, of)}</span>
          )}
        </>
      )}
    </td>
  );
}

function LinkRow({
  token,
  row,
  stats,
  currency,
  onChanged,
}: {
  token: string;
  row: AffiliateRow;
  stats: AffiliateStatsRow | undefined;
  currency: string | null;
  onChanged: () => void;
}) {
  const setDisabled = useMutation(adminApi.affiliateSetDisabled);
  const act = useAct();
  const disabled = row.disabledAt !== undefined;

  return (
    <tr className={disabled ? "text-ink-3" : undefined}>
      <td className="min-w-48">
        <Link
          href={`/affiliates/${row._id}`}
          className={`font-medium hover:underline ${disabled ? "text-ink-3" : "text-ink"}`}
        >
          {row.name}
        </Link>
        <span className="ops-mono block text-[length:var(--text-note)] text-ink-3">
          /r/{row.slug}
          {disabled && ` · disabled ${when(row.disabledAt!)}`}
        </span>
        {act.failed && (
          <span className="ops-failed block">
            Could not {act.failed}.{act.why ? ` ${act.why}` : ""}
          </span>
        )}
      </td>
      <Step value={row.clicks} />
      <Step value={row.visitors} of={row.clicks} />
      <Step value={row.signups} of={row.visitors} />
      <Step value={stats?.onboarded} of={row.signups} />
      {/* A wall and a checkout are each a share of signups: someone can open
          checkout from the plan page without meeting a wall, so neither is a
          step after the other. Paying is a share of checkouts. */}
      <Step value={stats?.walled} of={row.signups} />
      <Step value={stats?.reachedCheckout} of={row.signups} />
      <Step value={stats?.paying} of={stats?.reachedCheckout} />
      <td className="num tabular-nums">
        {stats?.mrr === undefined ? (
          <span className="text-ink-3">–</span>
        ) : (
          cash(stats.mrr, currency)
        )}
      </td>
      <td className="num tabular-nums">
        {stats?.teamPaying === undefined ? (
          <span className="text-ink-3">–</span>
        ) : stats.teamPaying === 0 ? (
          "0"
        ) : (
          <>
            {stats.teamPaying}
            <span className="ops-note block leading-tight text-ink-3">
              {cash(stats.teamMrr ?? 0, currency)}
            </span>
          </>
        )}
      </td>
      <td className="num tabular-nums">
        {stats?.viaLink === undefined || stats.viaCode === undefined ? (
          <span className="text-ink-3">–</span>
        ) : (
          `${stats.viaLink} · ${stats.viaCode}`
        )}
      </td>
      <td className="num tabular-nums">
        {stats?.promotionRedemptions !== undefined ? (
          <span title={row.promotionCode}>{stats.promotionRedemptions}</span>
        ) : row.promotionCode ? (
          <span className="text-ink-3" title={row.promotionCode}>
            –
          </span>
        ) : (
          <span className="text-ink-3" title="No code linked">
            none
          </span>
        )}
      </td>
      <td className="text-right whitespace-nowrap">
        <span className="inline-flex gap-1.5">
          <CopyLink slug={row.slug} />
          <button
            type="button"
            className="ops-chip"
            disabled={act.busy}
            onClick={() =>
              act.run(
                disabled ? "enable that link" : "disable that link",
                setDisabled({ token, id: row._id, disabled: !disabled }).then(onChanged),
              )
            }
          >
            {disabled ? "Enable" : "Disable"}
          </button>
        </span>
      </td>
    </tr>
  );
}

/**
 * A new link. The slug is what gets printed in a bio, so it cannot be changed
 * afterwards; the deployment normalizes it and refuses a bad, reserved or
 * taken one in a sentence, which is shown as written.
 */
function Create({
  token,
  list,
  onCreated,
}: {
  token: string;
  list: AffiliateRow[] | undefined;
  onCreated: () => void;
}) {
  const create = useMutation(adminApi.affiliateCreate);
  const act = useAct();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [destination, setDestination] = useState(DEFAULT_DESTINATION);
  const [note, setNote] = useState("");
  const [owner, setOwner] = useState("");
  const [made, setMade] = useState<string | null>(null);

  const ready = slug.trim() && name.trim();
  const fresh = made ? list?.find((row) => row._id === made) : undefined;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || act.busy) return;
    setMade(null);
    act.run(
      "make that link",
      create({
        token,
        slug: slug.trim(),
        name: name.trim(),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(destination.trim() ? { destination: destination.trim() } : {}),
        ...(owner.trim() ? { ownerId: owner.trim() } : {}),
      }).then((id) => {
        setMade(id);
        setSlug("");
        setName("");
        setDestination(DEFAULT_DESTINATION);
        setNote("");
        setOwner("");
        onCreated();
      }),
    );
  };

  return (
    <Panel title="New link">
      <form className="grid gap-3 p-4 sm:grid-cols-2" onSubmit={submit}>
        <label className="block space-y-1">
          <span className="ops-note">Slug</span>
          <span className="flex items-center gap-1.5">
            <span className="ops-mono shrink-0 text-[length:var(--text-note)] text-ink-3">
              {AFFILIATE_LINK_BASE.replace("https://", "")}
            </span>
            <input
              className="ops-input ops-mono h-7"
              placeholder="jane"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </span>
        </label>
        <label className="block space-y-1">
          <span className="ops-note">Name</span>
          <input
            className="ops-input h-7"
            placeholder="Who is promoting it"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
          <span className="ops-note">Their Nootles account (optional)</span>
          <input
            className="ops-input ops-mono h-7"
            placeholder="user_…"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            spellCheck={false}
          />
          <span className="ops-note block text-ink-3">
            So their own link cannot claim them.
          </span>
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="ops-note">Note (optional)</span>
          <input
            className="ops-input h-7"
            placeholder="Channel, deal, anything worth knowing in a month"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="submit" className="ops-chip" disabled={act.busy || !ready}>
            Make link
          </button>
          {act.failed && (
            <span className="ops-failed" role="status">
              Could not {act.failed}.{act.why ? ` ${act.why}` : ""}
            </span>
          )}
          {/* The slug as the deployment normalized it, read back from the
              list — "Jane!" typed is not what gets printed in a bio. */}
          {fresh && !act.failed && (
            <span className="inline-flex items-center gap-2" role="status">
              <span className="ops-note">
                Made <span className="ops-mono">/r/{fresh.slug}</span>
              </span>
              <CopyLink slug={fresh.slug} />
            </span>
          )}
        </div>
      </form>
    </Panel>
  );
}
