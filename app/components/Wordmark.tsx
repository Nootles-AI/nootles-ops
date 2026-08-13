/**
 * The Nootles lockup, top right.
 *
 * The brand-colour cut of each logo is the one whose artwork is filled all the
 * way through in the sage; the black and multi-colour cuts leave part of it on
 * the default fill, which would vanish against the dark theme. So brand colour
 * in both themes, and no per-theme swap is needed.
 *
 * Plain `<img>` rather than `next/image`: the optimizer refuses SVG unless the
 * app opts into `dangerouslyAllowSVG`, and these are already the smallest and
 * most cacheable form they could be in.
 */
export function Wordmark() {
  return (
    <span className="flex shrink-0 items-center" title="Nootles Ops">
      {/* The full lockup where there is room for it… */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logos/Logo Line - Brand Color.svg"
        alt="Nootles Ops"
        width={86}
        height={22}
        className="hidden h-[22px] w-auto sm:block"
      />
      {/* …and the brandmark alone where there is not. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logos/Brandmark - Brand Color.svg"
        alt="Nootles Ops"
        width={16}
        height={20}
        className="h-[20px] w-auto sm:hidden"
      />
    </span>
  );
}
