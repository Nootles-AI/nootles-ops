"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  adminApi,
  PLAN_SOURCE_LABELS,
  type AccessCodeRow,
  type DiscountRow,
  type FunnelReport,
  type RevenueReport,
} from "@/lib/api";
import { useAct } from "@/lib/act";
import { shortUser, when } from "@/lib/format";
import { useAdminToken } from "@/lib/session";
import { Empty, Instrument, Loading, Panel } from "../components/Bits";

/**
 * Money, and the two ways round it.
 *
 * Access codes and the VIP flag are deliberately ours rather than Stripe's:
 * Stripe can discount a price, but it has no idea what to do with "this person
 * pays nothing", which is what a design partner, a reviewer or an apology
 * actually needs. Discounts — the case where money still moves, just less of
 * it — stay Stripe's promotion codes and are typed into its checkout.
 *
 * All Sheet, no machine paper: none of this is the coding agent's work.
 */
export default function Billing() {
  const token = useAdminToken();
  const codes = useQuery(adminApi.codeList, { token });
  const pro = useQuery(adminApi.proAccounts, { token });
  const funnel = useQuery(adminApi.funnel, { token });
  const [open, setOpen] = useState<AccessCodeRow | null>(null);

  const comped =
    pro && pro.filter((r) => r.entitlement.source !== "subscription").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="ops-title">Billing</h1>
        <p className="ops-prose mt-1 text-ink-2">
          Who is paying, who was stopped and didn&rsquo;t, and the codes that
          let people in.
        </p>
      </div>

      <Money token={token} comped={comped} funnel={funnel} />

      <Panel title="Access codes" aside={<Mint token={token} />}>
        {codes === undefined ? (
          <Loading />
        ) : codes.length === 0 ? (
          <Empty>
            No codes yet. Mint one to let somebody in without a card.
          </Empty>
        ) : (
          <div className="ops-scroll">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>What for</th>
                  <th className="num">Used</th>
                  <th>Grants</th>
                  <th>Open until</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {codes.map((row) => (
                  <CodeRow
                    key={row.id}
                    token={token}
                    row={row}
                    onInspect={() =>
                      setOpen((was) => (was?.id === row.id ? null : row))
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {open && <Redemptions token={token} code={open} />}

      <Discounts token={token} />

      {/* Comped only. Paying accounts have their own table above, with the
          money on it — one list holding both would put a customer and a
          favour on the same row and imply they are the same thing. */}
      <Panel title="Let in for free">
        {pro === undefined ? (
          <Loading />
        ) : (
          (() => {
            const rows = pro.filter((r) => r.entitlement.source !== "subscription");
            return rows.length === 0 ? (
              <Empty>Nobody has been comped.</Empty>
            ) : (
              <div className="ops-scroll">
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>How</th>
                      <th>Until</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.ownerId}>
                        <td>
                          <Link
                            className="text-ink hover:underline"
                            href={`/users/${row.ownerId}`}
                          >
                            {row.email ?? row.name ?? shortUser(row.ownerId)}
                          </Link>
                        </td>
                        <td className="text-[length:var(--text-note)]">
                          {PLAN_SOURCE_LABELS[row.entitlement.source]}
                        </td>
                        <td className="text-[length:var(--text-note)] text-ink-2">
                          {row.entitlement.expiresAt
                            ? when(row.entitlement.expiresAt)
                            : "No end date"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()
        )}
      </Panel>

      <Stalled funnel={funnel} />
    </div>
  );
}

/** Cents to money, in whatever currency Stripe charged it in. */
function cash(amount: number, currency: string | null): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency ?? "usd").toUpperCase(),
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100);
}

/**
 * The money, and who it comes from.
 *
 * An action rather than a query, because the amounts are Stripe's — mirroring
 * them into our tables would create a second version of what a customer pays,
 * and the wrong one is always the one being read. So it loads on mount and is
 * as fresh as one round trip.
 *
 * MRR divides annual plans by twelve. That is the usual convention and it is a
 * convention: the cash arrived in one lump. Stripe's dashboard is where revenue
 * is accounted for; this is where "who pays me, and how much" is answered.
 */
function Money({
  token,
  comped,
  funnel,
}: {
  token: string;
  comped: number | undefined;
  funnel: FunnelReport | undefined;
}) {
  const revenue = useAction(adminApi.revenue);
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [broken, setBroken] = useState<string | null>(null);

  useEffect(() => {
    void revenue({ token })
      .then((got) => {
        setReport(got);
        setBroken(null);
      })
      .catch((error: unknown) =>
        setBroken((error as { data?: string })?.data ?? "Stripe did not answer."),
      );
  }, [revenue, token]);

  const stalled = funnel && funnel.walled - funnel.converted;

  return (
    <>
      <div className="ops-instruments sm:grid-cols-4">
        <Instrument
          label="MRR"
          value={report ? cash(report.mrr, report.currency) : undefined}
          note={
            report?.unpriced
              ? `${report.unpriced} without a readable price`
              : "Annual spread over twelve"
          }
        />
        <Instrument
          label="Paying"
          value={report ? String(report.paying.length) : undefined}
        />
        <Instrument
          label="Comped"
          value={comped === undefined ? undefined : String(comped)}
          note="VIP or a code"
        />
        {/* The number worth watching. Not a rate: with a handful of accounts a
            percentage swings twenty points on one person and reads as signal. */}
        <Instrument
          label="Hit the wall, didn't pay"
          value={stalled === undefined ? undefined : String(stalled)}
          note={
            funnel ? `${funnel.reachedCheckout} opened checkout` : undefined
          }
        />
      </div>

      <Panel title="Paying">
        {broken ? (
          <Empty>{broken}</Empty>
        ) : report === null ? (
          <Loading />
        ) : report.paying.length === 0 ? (
          <Empty>Nobody is subscribed yet.</Empty>
        ) : (
          <div className="ops-scroll">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Plan</th>
                  <th className="num">Pays</th>
                  <th className="num">A month</th>
                  <th>Status</th>
                  <th>Renews</th>
                </tr>
              </thead>
              <tbody>
                {report.paying.map((row) => (
                  <tr key={row.ownerId}>
                    <td>
                      <Link
                        className="text-ink hover:underline"
                        href={`/users/${row.ownerId}`}
                      >
                        {row.email ?? row.name ?? shortUser(row.ownerId)}
                      </Link>
                    </td>
                    <td className="text-[length:var(--text-note)]">
                      {row.interval === "year" ? "Annual" : "Monthly"}
                    </td>
                    <td className="num tabular-nums">
                      {row.amount === null ? "—" : cash(row.amount, row.currency)}
                    </td>
                    <td className="num tabular-nums text-ink-2">
                      {row.monthly === null ? "—" : cash(row.monthly, row.currency)}
                    </td>
                    <td className="text-[length:var(--text-note)]">
                      {row.status}
                      {row.cancelAtPeriodEnd && (
                        <span className="ops-note"> · ending</span>
                      )}
                    </td>
                    <td className="text-[length:var(--text-note)] text-ink-2">
                      {row.currentPeriodEnd ? when(row.currentPeriodEnd) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

/**
 * Everyone the paywall stopped who has still not paid — the list that says
 * whether the free run is the right size.
 *
 * Sorted by how hard they hit it. Somebody turned away eleven times and still
 * on free is telling you something a one-timer is not, and `Opened Stripe` is
 * the sharpest column on the page: they saw the price and walked away.
 */
function Stalled({ funnel }: { funnel: FunnelReport | undefined }) {
  return (
    <Panel
      title="Stopped by the paywall"
      aside={
        funnel && (
          <span className="ops-note">
            {funnel.walled} stopped · {funnel.reachedCheckout} opened checkout ·{" "}
            {funnel.converted} paid
          </span>
        )
      }
    >
      {funnel === undefined ? (
        <Loading />
      ) : funnel.stalled.length === 0 ? (
        <Empty>Nobody has been stopped by a wall yet.</Empty>
      ) : (
        <div className="ops-scroll">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Account</th>
                <th className="num">Times</th>
                <th>Which wall</th>
                <th>Opened Stripe</th>
                <th>First</th>
                <th>Last</th>
              </tr>
            </thead>
            <tbody>
              {funnel.stalled.map((row) => (
                <tr key={row.ownerId}>
                  <td>
                    <Link
                      className="text-ink hover:underline"
                      href={`/users/${row.ownerId}`}
                    >
                      {row.email ?? row.name ?? shortUser(row.ownerId)}
                    </Link>
                  </td>
                  <td className="num tabular-nums">{row.hits}</td>
                  {/* Which wall, not how many of each: the useful reading is
                      what they ran out of, and three counts in one cell is a
                      column nobody scans. */}
                  <td className="text-[length:var(--text-note)]">
                    {[
                      row.projects && "projects",
                      row.completions && "completions",
                      row.chats && "chats",
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </td>
                  <td className="text-[length:var(--text-note)]">
                    {row.checkouts === 0 ? (
                      <span className="text-ink-2">Never</span>
                    ) : (
                      `${row.checkouts}× · ${row.checkoutAt ? when(row.checkoutAt) : ""}`
                    )}
                  </td>
                  <td className="text-[length:var(--text-note)] text-ink-2">
                    {when(row.firstAt)}
                  </td>
                  <td className="text-[length:var(--text-note)] text-ink-2">
                    {when(row.lastAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function CodeRow({
  token,
  row,
  onInspect,
}: {
  token: string;
  row: AccessCodeRow;
  onInspect: () => void;
}) {
  const setDisabled = useMutation(adminApi.codeSetDisabled);
  const act = useAct();
  const withdrawn = row.disabledAt !== null;

  return (
    <tr className={withdrawn ? "text-ink-2" : undefined}>
      <td className="ops-mono whitespace-nowrap">{row.code}</td>
      <td>
        <span className="block max-w-xs truncate">{row.label}</span>
        {act.failed && (
          <span className="ops-failed">
            Could not {act.failed}.{act.why ? ` ${act.why}` : ""}
          </span>
        )}
      </td>
      {/* The cap is the denominator when there is one, because "3" alone does
          not say whether the code is spent. */}
      <td className="num tabular-nums">
        <button type="button" className="hover:underline" onClick={onInspect}>
          {row.redemptions}
          {row.maxRedemptions !== null && ` / ${row.maxRedemptions}`}
        </button>
      </td>
      <td className="text-[length:var(--text-note)]">
        {row.durationDays === null ? "Forever" : `${row.durationDays} days`}
      </td>
      {/* One cell for the whole question "could somebody use this now?" — the
          three ways a code stops working (withdrawn, past its date, all taken)
          are one fact to the operator, not three columns. */}
      <td className="text-[length:var(--text-note)] text-ink-2">
        {withdrawn
          ? "Withdrawn"
          : !row.redeemable
            ? "Spent"
            : row.expiresAt === null
              ? "No end date"
              : when(row.expiresAt)}
      </td>
      <td className="text-right">
        <button
          type="button"
          className="ops-chip"
          disabled={act.busy}
          onClick={() =>
            act.run(
              withdrawn ? "restore that code" : "withdraw that code",
              setDisabled({ token, id: row.id, disabled: !withdrawn }),
            )
          }
        >
          {withdrawn ? "Restore" : "Withdraw"}
        </button>
      </td>
    </tr>
  );
}

/**
 * Minting a code. The label is required for the same reason the VIP note is:
 * a code with no stated purpose is unreadable a month later, and these outlive
 * the reason they were made.
 */
function Mint({ token }: { token: string }) {
  const create = useMutation(adminApi.codeCreate);
  const act = useAct();
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [days, setDays] = useState("");
  const [cap, setCap] = useState("");
  const [minted, setMinted] = useState<string | null>(null);

  const number = (text: string) => {
    const n = Number(text.trim());
    return text.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const submit = () => {
    if (!label.trim()) return;
    setMinted(null);
    act.run(
      "mint that code",
      create({
        token,
        label: label.trim(),
        ...(code.trim() ? { code: code.trim() } : {}),
        ...(number(days) ? { durationDays: number(days) } : {}),
        ...(number(cap) ? { maxRedemptions: number(cap) } : {}),
      }).then((made) => {
        setMinted(made);
        setLabel("");
        setCode("");
        setDays("");
        setCap("");
      }),
    );
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {minted && (
        <span className="ops-note" role="status">
          Minted <span className="ops-mono">{minted}</span>
        </span>
      )}
      {act.failed && (
        <span className="ops-failed" role="status">
          Could not {act.failed}.{act.why ? ` ${act.why}` : ""}
        </span>
      )}
      <input
        className="ops-input h-7 w-44"
        placeholder="What for"
        aria-label="What the code is for"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <input
        className="ops-input ops-mono h-7 w-32"
        placeholder="Code (auto)"
        aria-label="Code, left blank to generate one"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <input
        className="ops-input h-7 w-20 tabular-nums"
        placeholder="Days"
        aria-label="How many days the grant lasts, blank for forever"
        inputMode="numeric"
        value={days}
        onChange={(e) => setDays(e.target.value)}
      />
      <input
        className="ops-input h-7 w-20 tabular-nums"
        placeholder="Uses"
        aria-label="How many people may redeem it, blank for unlimited"
        inputMode="numeric"
        value={cap}
        onChange={(e) => setCap(e.target.value)}
      />
      <button
        type="button"
        className="ops-chip"
        disabled={act.busy || !label.trim()}
        onClick={submit}
      >
        Mint
      </button>
    </div>
  );
}

/** Who took one code, and whether what it gave them is still standing. */
function Redemptions({ token, code }: { token: string; code: AccessCodeRow }) {
  const rows = useQuery(adminApi.codeRedemptions, { token, id: code.id });
  return (
    <Panel title={`${code.code} — who used it`}>
      {rows === undefined ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>Nobody has used this code.</Empty>
      ) : (
        <div className="ops-scroll">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Redeemed</th>
                <th>Grant</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.ownerId}>
                  <td>
                    <Link className="text-ink hover:underline" href={`/users/${row.ownerId}`}>
                      {row.email ?? row.name ?? shortUser(row.ownerId)}
                    </Link>
                  </td>
                  <td className="text-[length:var(--text-note)] text-ink-2">
                    {when(row.redeemedAt)}
                  </td>
                  <td className="text-[length:var(--text-note)]">
                    {!row.live
                      ? "Lapsed"
                      : row.expiresAt === null
                        ? "Forever"
                        : `Until ${when(row.expiresAt)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/**
 * Stripe's promotion codes, from here.
 *
 * An action rather than a query, so nothing on this panel is reactive: Stripe
 * is a REST API, not a subscription, and pretending otherwise would mean a
 * table that quietly went stale while looking live. It loads on mount and
 * reloads after every change, which is exactly as fresh as it can honestly be.
 */
function Discounts({ token }: { token: string }) {
  const list = useAction(adminApi.discountList);
  const create = useAction(adminApi.discountCreate);
  const setActive = useAction(adminApi.discountSetActive);
  const act = useAct();

  const [rows, setRows] = useState<DiscountRow[] | null>(null);
  const [broken, setBroken] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("");
  const [forever, setForever] = useState(false);

  const reload = useCallback(() => {
    void list({ token })
      .then((got) => {
        setRows(got);
        setBroken(null);
      })
      .catch((error: unknown) => {
        setRows([]);
        // Almost always "no Stripe key on this deployment", which is a fact
        // about setup rather than a failure — so it is said, not hidden.
        setBroken(
          (error as { data?: string })?.data ?? "Stripe did not answer.",
        );
      });
  }, [list, token]);

  useEffect(reload, [reload]);

  const percentOff = Number(percent.trim());
  const valid =
    label.trim() && code.trim().length >= 4 && percentOff > 0 && percentOff <= 100;

  return (
    <Panel
      title="Discount codes"
      aside={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <input
            className="ops-input h-7 w-40"
            placeholder="What for"
            aria-label="What the discount is for"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <input
            className="ops-input ops-mono h-7 w-32"
            placeholder="CODE"
            aria-label="The code customers type"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <input
            className="ops-input h-7 w-16 tabular-nums"
            placeholder="% off"
            aria-label="Percentage off"
            inputMode="numeric"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
          />
          {/* On a subscription these are two different offers, not two
              spellings of one: a first-month discount, or a permanently
              cheaper price. */}
          <label className="ops-chip cursor-pointer">
            <input
              type="checkbox"
              className="mr-1.5"
              checked={forever}
              onChange={(e) => setForever(e.target.checked)}
            />
            Every renewal
          </label>
          <button
            type="button"
            className="ops-chip"
            disabled={act.busy || !valid}
            onClick={() =>
              act.run(
                "create that discount",
                create({
                  token,
                  label: label.trim(),
                  code: code.trim(),
                  percentOff,
                  forever,
                }).then(() => {
                  setLabel("");
                  setCode("");
                  setPercent("");
                  setForever(false);
                  reload();
                }),
              )
            }
          >
            Create
          </button>
        </div>
      }
    >
      {act.failed && (
        <p className="ops-failed px-4 pt-3" role="status">
          Could not {act.failed}.{act.why ? ` ${act.why}` : ""}
        </p>
      )}
      {rows === null ? (
        <Loading />
      ) : broken ? (
        <Empty>{broken}</Empty>
      ) : rows.length === 0 ? (
        <Empty>
          No discounts. These are Stripe promotion codes — customers type them
          on Stripe&rsquo;s checkout page, not in Nootles.
        </Empty>
      ) : (
        <div className="ops-scroll">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Off</th>
                <th>Applies</th>
                <th className="num">Used</th>
                <th>Expires</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={row.active ? undefined : "text-ink-2"}>
                  <td className="ops-mono whitespace-nowrap">{row.code}</td>
                  <td>
                    {row.percentOff !== null
                      ? `${row.percentOff}%`
                      : row.amountOff !== null
                        ? `${(row.amountOff / 100).toFixed(2)} ${(row.currency ?? "").toUpperCase()}`
                        : "—"}
                  </td>
                  <td className="text-[length:var(--text-note)]">
                    {row.duration === "forever" ? "Every renewal" : "First payment"}
                  </td>
                  <td className="num tabular-nums">
                    {row.redemptions}
                    {row.maxRedemptions !== null && ` / ${row.maxRedemptions}`}
                  </td>
                  {/* Stripe counts expiry in seconds; everything else on this
                      dashboard counts in milliseconds. */}
                  <td className="text-[length:var(--text-note)] text-ink-2">
                    {row.expiresAt === null ? "No end date" : when(row.expiresAt * 1000)}
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="ops-chip"
                      disabled={act.busy}
                      onClick={() =>
                        act.run(
                          row.active ? "turn that discount off" : "turn it back on",
                          setActive({ token, id: row.id, active: !row.active }).then(
                            reload,
                          ),
                        )
                      }
                    >
                      {row.active ? "Turn off" : "Turn on"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
