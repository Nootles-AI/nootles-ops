import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { Guard } from "./components/Guard";
import { NavLink } from "./components/NavLink";

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
        <ClerkProvider>
          <ConvexClientProvider>
            <header className="sticky top-0 z-10 border-b border-border bg-surface">
              <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
                <span className="text-[15px] font-semibold tracking-tight">
                  Nootles <span className="text-muted font-normal">ops</span>
                </span>
                <nav className="flex items-center gap-1">
                  <NavLink href="/">Overview</NavLink>
                  <NavLink href="/feedback">Feedback</NavLink>
                  <NavLink href="/suggestions">Suggestions</NavLink>
                  <NavLink href="/calls">AI calls</NavLink>
                </nav>
                <div className="ml-auto">
                  <UserButton />
                </div>
              </div>
            </header>
            <main className="mx-auto max-w-6xl px-6 py-8">
              <Guard>{children}</Guard>
            </main>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
