"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/reviews", label: "Reviews" },
  { href: "/search", label: "Search" },
  { href: "/agent", label: "Agent Report" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-edge bg-panel/70 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-1 px-5 py-3.5">
        <span className="mr-5 text-lg font-semibold text-white">
          VoC-<span className="text-accent">Insight Engine</span>
        </span>
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                active
                  ? "bg-accent/15 text-accent"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
