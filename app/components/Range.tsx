"use client";

import { useState } from "react";

const RANGES = [
  { id: "24h", label: "24h", ms: 24 * 60 * 60 * 1000 },
  { id: "7d", label: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
  { id: "30d", label: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
] as const;

export type RangeId = (typeof RANGES)[number]["id"];

const msFor = (id: RangeId) => RANGES.find((r) => r.id === id)!.ms;

/** Read once at load — the window's anchor only moves when the user picks. */
const LOADED_AT = Date.now();

export function useRange(initial: RangeId = "7d") {
  const [sel, setSel] = useState({
    range: initial,
    sinceMs: LOADED_AT - msFor(initial),
  });
  const setRange = (range: RangeId) =>
    setSel({ range, sinceMs: Date.now() - msFor(range) });
  return { ...sel, setRange };
}

export function RangeChips({
  range,
  onChange,
}: {
  range: RangeId;
  onChange: (r: RangeId) => void;
}) {
  return (
    <div className="flex gap-1.5" role="group" aria-label="Time range">
      {RANGES.map((r) => (
        <button
          key={r.id}
          className={`ops-chip${range === r.id ? " is-on" : ""}`}
          onClick={() => onChange(r.id)}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
