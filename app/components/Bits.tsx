/**
 * The small shapes every page is built from. They exist so eight pages spell
 * a panel, a figure and an empty screen the same way.
 */

/**
 * A section. `machine` puts it on the agent's paper — use it only for the
 * coding agent's own work, never for AI features in general, or the tint
 * stops meaning anything.
 */
export function Panel({
  title,
  aside,
  machine,
  bare,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  machine?: boolean;
  /** No header rule — for panels whose content starts immediately. */
  bare?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={machine ? "ops-watch" : "ops-sheet"}>
      <header className={bare ? "flex items-center gap-3 px-4 pt-3" : "ops-panel-head"}>
        <h2 className="ops-eyebrow shrink-0">{title}</h2>
        {aside && (
          <div className="ml-auto flex min-w-0 items-center gap-3">{aside}</div>
        )}
      </header>
      {children}
    </section>
  );
}

/**
 * One figure on the instrument row. A value that has not arrived is an
 * em-dash, never a zero — a real-looking number that turns out to be "still
 * loading" is a lie about what you are looking at.
 */
export function Instrument({
  label,
  value,
  note,
}: {
  label: string;
  value: string | undefined;
  note?: string;
}) {
  return (
    <div className="ops-instrument">
      <p className="ops-eyebrow truncate">{label}</p>
      <p className="ops-figure mt-0.5" aria-busy={value === undefined}>
        {value ?? "—"}
      </p>
      {note && <p className="ops-note mt-0.5 truncate">{note}</p>}
    </div>
  );
}

/** Nothing here yet. An empty screen is an invitation, not an apology. */
export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="p-4 text-[length:var(--text-ui)] text-ink-2">{children}</p>;
}

/**
 * Still arriving. Ink 2, not 3 — the tertiary tone is banned on the machine's
 * paper, and this appears on both.
 */
export function Loading() {
  return (
    <p className="p-4 text-ink-2" aria-busy>
      —
    </p>
  );
}
