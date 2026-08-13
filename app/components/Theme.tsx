"use client";

import { useEffect, useState } from "react";

const KEY = "nootles-ops:theme";

/**
 * Light and dark are the same nine values remapped — in the dark the
 * machine's paper becomes the raised slab rather than the sunken one, which
 * is the proof that authorship here is a material and not a mood.
 *
 * The mark is those two papers, one over the other. A sun and a moon would
 * say nothing this dashboard means.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  // The inline script in the document head has already set the attribute, so
  // this only reads back what is on screen; the first render must not guess.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const set = document.documentElement.dataset.theme;
    setDark(
      set
        ? set === "dark"
        : window.matchMedia("(prefers-color-scheme: dark)").matches,
    );
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const flip = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {
      // A browser that refuses storage still gets the theme for this visit.
    }
  };

  return (
    <button
      onClick={flip}
      className="ops-nav-link px-2"
      title={dark ? "Switch to the light theme" : "Switch to the dark theme"}
      aria-label={dark ? "Switch to the light theme" : "Switch to the dark theme"}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
        <rect
          x="1.5"
          y="1.5"
          width="8"
          height="8"
          rx="1.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <rect
          x="4.5"
          y="4.5"
          width="8"
          height="8"
          rx="1.5"
          fill="currentColor"
          opacity={dark ? 1 : 0.28}
          stroke="currentColor"
          strokeWidth="1.3"
        />
      </svg>
    </button>
  );
}

/**
 * Applied before first paint so the page never flashes the other theme.
 * Kept as a string because it has to run ahead of React.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;
