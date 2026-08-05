"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const on = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link href={href} className={`ops-nav-link${on ? " is-on" : ""}`}>
      {children}
    </Link>
  );
}
