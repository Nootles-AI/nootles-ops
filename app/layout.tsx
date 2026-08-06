import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { FeedbackLink } from "./components/FeedbackLink";
import { DirectoryProvider } from "./components/Who";
import { Guard } from "./components/Guard";
import { NavLink } from "./components/NavLink";
import { SignOut } from "./components/SignOut";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nootles Ops",
  description: "The operator's window into Nootles.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen">
        <ConvexClientProvider>
          <SessionProvider>
            <header className="sticky top-0 z-10 border-b border-border bg-surface">
              <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
                <span className="text-[15px] font-semibold tracking-tight">
                  Nootles <span className="text-muted font-normal">ops</span>
                </span>
                <nav className="flex items-center gap-1">
                  <NavLink href="/">Overview</NavLink>
                  <FeedbackLink />
                  <NavLink href="/users">Users</NavLink>
                  <NavLink href="/suggestions">Suggestions</NavLink>
                  <NavLink href="/calls">AI calls</NavLink>
                  <NavLink href="/agent">Agent</NavLink>
                </nav>
                <div className="ml-auto">
                  <SignOut />
                </div>
              </div>
            </header>
            <main className="mx-auto max-w-6xl px-6 py-8">
              <Guard>
                <DirectoryProvider>{children}</DirectoryProvider>
              </Guard>
            </main>
          </SessionProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
