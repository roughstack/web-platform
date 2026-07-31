import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-edge">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-mono text-xs text-ink-muted">
          ByteArena — systems engineering, executed.
        </p>
        {/*
          Links are inline-flex with a 44px minimum height so they remain a
          comfortable touch target; the negative margin keeps the taller hit area
          from visually inflating the footer.
        */}
        <nav aria-label="Footer" className="-my-2 flex items-center gap-5">
          <Link
            href="/challenges"
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-xs text-ink-muted transition-colors hover:text-ink"
          >
            Challenges
          </Link>
          <Link
            href="/blog/tricking-ai"
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-xs text-ink-muted transition-colors hover:text-ink"
          >
            Anti-AI
          </Link>
          <a
            href="https://fly.io/docs/machines/"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-xs text-ink-muted transition-colors hover:text-ink"
          >
            Runtime
          </a>
        </nav>
      </div>
    </footer>
  );
}
