import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

/**
 * Chrome for the reading half of the site: landing, challenge index,
 * dashboard and leaderboard.
 *
 * These are documents. They scroll, they end, and they need a way to get
 * somewhere else — so they get a nav at the top and a footer at the bottom.
 * The arena deliberately gets neither.
 */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 focus:rounded-8 focus:bg-inverse focus:px-4 focus:py-2 focus:text-mini focus:text-canvas"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
