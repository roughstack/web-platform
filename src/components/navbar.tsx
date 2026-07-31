import Link from "next/link";
import { Button } from "@/components/ui/button";

function Wordmark() {
  return (
    <Link
      href="/"
      // min-h-11 keeps the logo a 44px touch target without changing how it looks.
      className="group flex min-h-11 items-center gap-2 rounded-md"
      aria-label="ByteArena home"
    >
      <span
        aria-hidden="true"
        className="grid size-7 shrink-0 place-items-center rounded border border-signal/40 bg-signal/10 font-mono text-[13px] font-bold text-signal"
      >
        B
      </span>
      <span className="font-mono text-[15px] font-semibold tracking-tight text-ink">
        Byte<span className="text-signal">Arena</span>
      </span>
    </Link>
  );
}

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-edge bg-canvas/85 backdrop-blur-md">
      <nav
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6"
        aria-label="Main"
      >
        <Wordmark />

        {/*
          size="md" rather than "sm" so both controls clear the 44px touch minimum.
          Horizontal padding is tightened below the sm breakpoint because at 320px
          the full-width buttons plus the wordmark overflow the viewport by 14px.
          Narrowing the padding keeps both links reachable rather than hiding one.
        */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="md" className="px-2.5 sm:px-4">
            <Link href="/challenges">Challenges</Link>
          </Button>
          {/* Dashboard is hidden on the smallest screens to keep the navbar
              within 320px. It reappears at the sm breakpoint where there is
              room for all three links. */}
          <Button
            asChild
            variant="ghost"
            size="md"
            className="hidden px-2.5 sm:inline-flex sm:px-4"
          >
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button asChild variant="secondary" size="md" className="px-2.5 sm:px-4">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
