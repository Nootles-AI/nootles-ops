import type { Metadata } from "next";
import { Big_Shoulders, Public_Sans, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import { OpsProvider } from "@/lib/ops";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { FeedbackLink } from "./components/FeedbackLink";
import { DirectoryProvider } from "./components/Who";
import { Guard } from "./components/Guard";
import { NavLink } from "./components/NavLink";
import { SignOut } from "./components/SignOut";
import { THEME_SCRIPT, ThemeToggle } from "./components/Theme";
import { WatchReadout } from "./components/Watch";

/**
 * Three faces, three jobs. Big Shoulders is the equipment label — condensed
 * enough to fit a real word above a 34px column — and it is fenced to
 * eyebrows, table headings, page titles, hour ticks and the strip's numerals
 * (see globals.css). Public Sans is the record-keeping hand: the plainest
 * grotesque available, chosen to disappear under two hundred rows. Spline
 * Sans Mono is here for its italic, which is what lets the agent's prose be
 * unmistakably machine-written without a colour, a badge or a box.
 */
const display = Big_Shoulders({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-big-shoulders",
  // Next has no metric overrides for this family, so it cannot synthesise a
  // matched fallback; a condensed stack keeps the swap from reflowing the
  // eyebrows and table headings it sits in.
  fallback: ["Arial Narrow", "Helvetica Neue Condensed", "ui-sans-serif"],
});

const body = Public_Sans({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-public-sans",
});

const mono = Spline_Sans_Mono({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-spline-mono",
});

export const metadata: Metadata = {
  title: "Nootles Ops",
  description: "The operator's window into Nootles.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        <ConvexClientProvider>
          <SessionProvider>
            <OpsProvider>
              <header className="ops-head">
                <div className="ops-shell flex h-full items-center gap-4">
                  <span className="ops-wordmark shrink-0">
                    Nootles <span className="text-ink-3">Ops</span>
                  </span>
                  <nav className="ops-nav" aria-label="Sections">
                    <NavLink href="/">Overview</NavLink>
                    <FeedbackLink />
                    <NavLink href="/users">Users</NavLink>
                    <NavLink href="/suggestions">Suggestions</NavLink>
                    <NavLink href="/calls">AI calls</NavLink>
                    <NavLink href="/agent">Agent</NavLink>
                  </nav>
                  <div className="ml-auto flex shrink-0 items-center gap-3">
                    <WatchReadout />
                    <ThemeToggle />
                    <SignOut />
                  </div>
                </div>
              </header>
              <main className="ops-shell py-6">
                <Guard>
                  <DirectoryProvider>{children}</DirectoryProvider>
                </Guard>
              </main>
            </OpsProvider>
          </SessionProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
