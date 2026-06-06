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
    <header className="sticky top-0 z-10 border-b border-edge bg-white/80 shadow-nav backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center gap-1 px-5 py-3.5">
        {/* Logo */}
        <span className="mr-6 text-lg font-bold tracking-tight text-stone-800">
          Review<span className="text-accent">Lens</span>
        </span>

        {/* Nav links */}
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-accent-light text-amber-800"
                  : "text-stone-500 hover:text-stone-800 hover:bg-stone-100"
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
