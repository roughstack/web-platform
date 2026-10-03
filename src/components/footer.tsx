import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PRODUCT_NAME } from "@/lib/brand";

const COLUMNS = [
  {
    heading: "Arena",
    links: [
      { href: "/challenges", label: "Challenges" },
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    heading: "Reading",
    links: [
      {
        href: "https://en.wikipedia.org/wiki/Flash_translation_layer",
        label: "Flash translation layers",
        external: true,
      },
      {
        href: "https://www.usenix.org/conference/fast20",
        label: "Storage research",
        external: true,
      },
    ],
  },
  {
    heading: "Runtime",
    links: [
      {
        href: "https://fly.io/docs/machines/",
        label: "Fly Machines",
        external: true,
      },
      { href: "https://go.dev/", label: "Go", external: true },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t border-edge bg-canvas-deep">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <BrandMark className="text-accent" />
              <span className="text-regular font-semibold text-ink">
                {PRODUCT_NAME}
              </span>
            </div>
            <p className="mt-3 text-mini text-muted">
              Systems engineering challenges, executed against real workloads
              and graded on the metrics engineers actually argue about.
            </p>
          </div>

          {/* The -my-2 keeps the 44px hit areas from visually inflating the
              column rhythm, which would otherwise read as loose spacing. */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3 sm:gap-x-12">
            {COLUMNS.map((column) => (
              <nav key={column.heading} aria-label={column.heading}>
                <h2 className="text-micro font-medium text-quiet uppercase tracking-wider">
                  {column.heading}
                </h2>
                <ul className="mt-3 -my-1 flex flex-col">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      {"external" in link && link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex min-h-11 items-center text-mini text-muted transition-colors duration-100 hover:text-ink"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="inline-flex min-h-11 items-center text-mini text-muted transition-colors duration-100 hover:text-ink"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-edge pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-micro text-quiet">
            Every submission runs in an isolated microVM.
          </p>
          <p className="flex items-center gap-2 text-micro text-quiet">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-signal"
            />
            Runtime operational
          </p>
        </div>
      </div>
    </footer>
  );
}
