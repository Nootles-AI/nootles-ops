"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * The row menu — the same six mutations whether you reach it by right-click
 * or by keyboard. It used to be right-click only, which meant a third of what
 * this dashboard can do was unreachable without a mouse.
 *
 * Arrow keys and Home/End move, Enter and Space choose, Escape closes and
 * hands focus back to whatever opened it.
 */

export type MenuEntry =
  | {
      kind: "item";
      id: string;
      label: string;
      icon?: React.ReactNode;
      onSelect: () => void;
    }
  | { kind: "sep"; id: string };

export function Menu({
  x,
  y,
  entries,
  onClose,
  label,
}: {
  x: number;
  y: number;
  entries: MenuEntry[];
  onClose: () => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const [at, setAt] = useState({ x, y });

  const items = entries.filter((e) => e.kind === "item");

  useEffect(() => {
    opener.current = document.activeElement;
    return () => {
      // Focus goes back where it came from, unless the click that closed the
      // menu has already put it somewhere deliberate.
      const back = opener.current;
      if (back instanceof HTMLElement && document.activeElement === document.body) {
        back.focus();
      }
    };
  }, []);

  // Measure, then keep the whole menu on screen — a right-click near the
  // bottom of a 200-row inbox is the normal case, not the edge case.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setAt({
      x: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
    });
    el.querySelector<HTMLButtonElement>("[data-menu-item]")?.focus();
  }, [x, y]);

  useEffect(() => {
    // Containment, not stopPropagation: React's delegated handlers live on
    // `document` too, so a sibling listener there still fires whatever
    // propagation was stopped.
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onScroll = () => onClose();
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [onClose]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const buttons = Array.from(
      ref.current?.querySelectorAll<HTMLButtonElement>("[data-menu-item]") ?? [],
    );
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      if (opener.current instanceof HTMLElement) opener.current.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      buttons[(i + 1) % buttons.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      buttons[(i - 1 + buttons.length) % buttons.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      buttons[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      buttons[buttons.length - 1]?.focus();
    } else if (e.key === "Tab") {
      e.preventDefault();
      onClose();
    }
  };

  if (items.length === 0) return null;

  return (
    <div
      ref={ref}
      className="ops-menu"
      role="menu"
      aria-label={label}
      style={{ left: at.x, top: at.y }}
      onKeyDown={onKeyDown}
    >
      {entries.map((e) =>
        e.kind === "sep" ? (
          <div key={e.id} className="ops-menu-sep" aria-hidden />
        ) : (
          <button
            key={e.id}
            data-menu-item
            className="ops-menu-item"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              e.onSelect();
              onClose();
            }}
          >
            {/* A 14px glyph slot. Anything wider is clipped rather than
                allowed to run under the label. */}
            {e.icon && (
              <span className="flex w-3.5 shrink-0 justify-center overflow-hidden">
                {e.icon}
              </span>
            )}
            {e.label}
          </button>
        ),
      )}
    </div>
  );
}

/** The trailing handle that opens the same menu from the keyboard. */
export function Kebab({
  open,
  onOpen,
  label,
}: {
  open: boolean;
  onOpen: (at: { x: number; y: number }) => void;
  label: string;
}) {
  // Pressing the handle of an open menu should shut it. The menu's own
  // outside-pointerdown listener has already closed it by the time the click
  // lands, so without this the click would reopen it and the handle would
  // look broken.
  const justClosed = useRef(false);

  return (
    <button
      className="ops-kebab ops-over"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={label}
      onPointerDown={() => {
        justClosed.current = open;
      }}
      onKeyDown={() => {
        // Keyboard activation never sees a pointerdown, so it must not be
        // suppressed by a stale flag left by an earlier mouse press.
        justClosed.current = false;
      }}
      onClick={(e) => {
        if (justClosed.current) {
          justClosed.current = false;
          return;
        }
        const r = e.currentTarget.getBoundingClientRect();
        onOpen({ x: r.right - 4, y: r.bottom + 4 });
      }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
        <circle cx="7" cy="3" r="1.15" fill="currentColor" />
        <circle cx="7" cy="7" r="1.15" fill="currentColor" />
        <circle cx="7" cy="11" r="1.15" fill="currentColor" />
      </svg>
    </button>
  );
}
