"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/challenges", label: "Challenges" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/dashboard", label: "Dashboard" },
] as const;

function Wordmark() {
  return (
    <Link
      href="/"
      className="flex min-h-11 items-center gap-2 rounded-6"
      aria-label="ByteArena home"
    >
      <span
        aria-hidden="true"
        // Dark glyph on the accent, not white: white on #7170ff measures
        // 3.84:1, below AA for text this small.
        className="grid size-6 shrink-0 place-items-center rounded-6 bg-accent font-mono text-tiny font-bold text-canvas"
      >
        B
      </span>
      <span className="text-regular font-semibold text-ink">ByteArena</span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // The menu is a viewport-level overlay on mobile only; leaving it mounted
  // across a resize to desktop would trap the page under an invisible layer.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const close = () => setOpen(false);
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0b0b0b]/80 backdrop-blur-[20px]">
      <nav
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6"
        aria-label="Main"
      >
        <Wordmark />

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-8 items-center rounded-6 px-3 text-small font-medium",
                    "transition-colors duration-100 ease-out-quad",
                    active ? "text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="primary"
            size="md"
            className="hidden sm:inline-flex"
          >
            <Link href="/challenges">Start solving</Link>
          </Button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex size-11 items-center justify-center rounded-8 text-muted hover:bg-white/5 hover:text-ink md:hidden"
          >
            {open ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {open && (
        <div
          id="mobile-nav"
          className="border-t border-white/8 bg-canvas px-4 pt-2 pb-4 md:hidden"
        >
          <ul className="flex flex-col">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center rounded-8 px-2 text-regular text-body hover:bg-white/5 hover:text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Button asChild variant="primary" size="md" className="mt-3 w-full">
            <Link href="/challenges" onClick={() => setOpen(false)}>
              Start solving
            </Link>
          </Button>
        </div>
      )}
    </header>
  );
}
