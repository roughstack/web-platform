import Link from "next/link";
import { Cpu, HardDrive, Zap, Database, Layers, ShieldHalf } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal } from "@/components/scroll-reveal";

const DIFFERENTIATORS = [
  {
    icon: Zap,
    title: "Ephemeral execution",
    body: "Each run boots a throwaway Firecracker microVM in a few hundred milliseconds, executes your code, and is destroyed. No shared runners, no leftover state.",
  },
  {
    icon: HardDrive,
    title: "Real hardware constraints",
    body: "Blocks must be erased before they are rewritten. Pages wear out. The simulator enforces the physics, so the shortcuts that work on a whiteboard fail here.",
  },
  {
    icon: Cpu,
    title: "An adversarial grader",
    body: "Passing the workload is the easy half. The harness then cuts power mid-migration and fills the device to capacity to find out whether your logic actually holds.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Pick a challenge",
    body: "Start with the flash translation layer: decide which block to erase and which pages to move.",
  },
  {
    n: "02",
    title: "Write the policy",
    body: "Implement the interface in Go against a simulated device with real erase and wear semantics.",
  },
  {
    n: "03",
    title: "Read the damage",
    body: "Get write amplification, erase counts and wear spread — not a green checkmark.",
  },
];

const CONCEPTS = [
  {
    icon: HardDrive,
    title: "Flash translation layers",
    body: "Out-of-place writes, garbage collection, wear levelling, and the cost-benefit tradeoffs that decide which block to reclaim.",
  },
  {
    icon: Database,
    title: "Log-structured storage",
    body: "Why LFS turns a sequential write workload into a win, and the cleaning-segment problem that comes with it.",
  },
  {
    icon: Layers,
    title: "Page replacement & caching",
    body: "Eviction policies, recency vs. frequency, and the adversarial traces that separate LRU from LFU and ARC.",
  },
  {
    icon: ShieldHalf,
    title: "Crash consistency",
    body: "Write-ahead logging, atomicity units, and what it takes to recover a data structure after a power loss mid-operation.",
  },
];

const SAMPLE_METRICS = [
  { label: "write_amplification", value: "1.34", good: true },
  { label: "block_erases", value: "412", good: true },
  { label: "valid_page_copies", value: "8,206", good: false },
  { label: "wear_stddev", value: "2.71", good: true },
];

function MetricsPreview() {
  return (
    <div className="overflow-hidden rounded-panel border border-edge bg-surface">
      <div className="flex items-center gap-2 border-b border-edge px-4 py-2.5">
        <span aria-hidden="true" className="size-2 rounded-full bg-danger/70" />
        <span aria-hidden="true" className="size-2 rounded-full bg-warning/70" />
        <span aria-hidden="true" className="size-2 rounded-full bg-signal/70" />
        <span className="ml-1 font-mono text-xs text-ink-muted">
          sprite · ftl-gc
        </span>
      </div>

      <dl className="divide-y divide-edge">
        {SAMPLE_METRICS.map((metric) => (
          <div
            key={metric.label}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <dt className="truncate font-mono text-xs text-ink-secondary">
              {metric.label}
            </dt>
            <dd
              className={`shrink-0 font-mono text-sm tabular-nums ${
                metric.good ? "text-signal" : "text-warning"
              }`}
            >
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-edge px-4 py-3">
        <p className="font-mono text-xs text-ink-muted">
          <span className="text-warning">warning</span> 8,206 page copies to
          reclaim 412 blocks
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-edge">
          <div
            aria-hidden="true"
            className="grid-backdrop pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
          />

          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div>
                <Badge variant="signal">Ephemeral execution on Fly.io</Badge>

                <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                  Systems problems that
                  <span className="text-signal"> actually run</span>.
                </h1>

                <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-secondary sm:text-lg">
                  Everywhere else you rehearse algorithms. Here you implement the
                  internals — flash translation layers, write-ahead logs,
                  garbage collectors — and they are graded on write
                  amplification and resilience, not on passing a unit test.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg">
                    <Link href="/challenges">Start a challenge</Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary">
                    <Link href="#how-it-works">How it works</Link>
                  </Button>
                </div>
              </div>

              <div className="lg:pl-4">
                <MetricsPreview />
              </div>
            </div>
          </div>
        </section>

        {/* Differentiators */}
        <section className="border-b border-edge">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <ScrollReveal>
              <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                Why this is different
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-secondary sm:text-base">
                LeetCode rehearses the interview. ByteArena rehearses the
                systems. The constraints are physical, the metrics are
                unforgiving, and the grader is actively hostile.
              </p>
            </ScrollReveal>

            <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
              {DIFFERENTIATORS.map(({ icon: Icon, title, body }, i) => (
                <ScrollReveal key={title} delay={i * 0.08}>
                  <span
                    aria-hidden="true"
                    className="grid size-10 place-items-center rounded-lg border border-edge bg-surface text-signal"
                  >
                    <Icon className="size-[18px]" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-ink">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                    {body}
                  </p>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* What you'll learn */}
        <section className="border-b border-edge bg-elevated/20">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <ScrollReveal>
              <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                What you'll actually learn
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-secondary sm:text-base">
                These are the internals that every database, filesystem, and
                storage controller has to solve. You'll solve them too — and
                the simulator will tell you exactly how badly.
              </p>
            </ScrollReveal>

            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:gap-12">
              {CONCEPTS.map(({ icon: Icon, title, body }, i) => (
                <ScrollReveal key={title} delay={i * 0.06}>
                  <div className="flex gap-4">
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-lg border border-edge bg-surface text-signal"
                    >
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-ink">
                        {title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                        {body}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <ScrollReveal>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                How a run works
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-secondary sm:text-base">
                Your code never touches a shared machine. It is injected into a
                fresh microVM, driven through a deterministic workload, and the
                VM is destroyed before the results reach your screen.
              </p>
            </ScrollReveal>

            <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
              {STEPS.map((step, i) => (
                <ScrollReveal key={step.n} delay={i * 0.1}>
                  <li
                    className="border-t border-edge pt-5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5"
                  >
                    <span className="font-mono text-xs text-signal">{step.n}</span>
                    <h3 className="mt-2 text-base font-semibold text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                      {step.body}
                    </p>
                  </li>
                </ScrollReveal>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
