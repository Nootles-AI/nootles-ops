import type { Metadata } from "next";
import { Inter } from "next/font/google";
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
import { Wordmark } from "./components/Wordmark";
import { WatchReadout } from "./components/Watch";

/**
 * One family, for everything, headings included — which is what Linear does:
 * its theme literally sets `--font-display: var(--font-regular)` and the app
 * preloads a single font file. `ss03` is the stylistic set Linear turns on
 * globally; it is what makes Inter's punctuation and figures sit right at
 * 13px. Code keeps a system monospace, declared in globals.css.
 */
const inter = Inter({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Nootles Ops",
  description: "The operator's window into Nootles.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      {/* The frame is the darker surface and the content is a rounded pane
          floating on it. That one relationship — inset gutter, 12px radius,
          hairline border, frame colour showing around all four edges — does
          more for the resemblance than any single value in the palette. */}
      <body className="min-h-screen bg-deck">
        <ConvexClientProvider>
          <SessionProvider>
            <OpsProvider>
              <div className="min-h-screen p-2 sm:p-3">
                <div className="ops-pane">
                  <header className="ops-head">
                    <div className="ops-shell flex h-full items-center gap-3">
                      <nav className="ops-nav" aria-label="Sections">
                        <NavLink href="/">Overview</NavLink>
                        <FeedbackLink />
                        <NavLink href="/users">Users</NavLink>
                        <NavLink href="/suggestions">Suggestions</NavLink>
                        <NavLink href="/calls">AI calls</NavLink>
                        <NavLink href="/agent">Agent</NavLink>
                      </nav>
                      <div className="ml-auto flex shrink-0 items-center gap-2">
                        <WatchReadout />
                        <ThemeToggle />
                        <SignOut />
                        <span
                          className="mx-1 h-4 w-px bg-rule sm:mx-2"
                          aria-hidden
                        />
                        <Wordmark />
                      </div>
                    </div>
                  </header>
                  <main className="ops-shell py-6">
                    <Guard>
                      <DirectoryProvider>{children}</DirectoryProvider>
                    </Guard>
                  </main>
                </div>
              </div>
            </OpsProvider>
          </SessionProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
