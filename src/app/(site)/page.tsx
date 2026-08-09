import Link from "next/link";
import {
  Cpu,
  HardDrive,
  Zap,
  Database,
  Layers,
  ShieldHalf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Frame } from "@/components/ui/card";
import { Eyebrow, FigureLabel } from "@/components/ui/label";
import { ScrollReveal } from "@/components/scroll-reveal";

const DIFFERENTIATORS = [
  {
    icon: Zap,
    title: "Ephemeral execution",
    body: "Each run boots a throwaway microVM in a few hundred milliseconds, executes your code, and is destroyed. No shared runners, no leftover state.",
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
    <Frame>
      <div className="flex items-center gap-2 border-b border-edge px-4 py-2.5">
        <span aria-hidden="true" className="size-2 rounded-full bg-danger/70" />
        <span
          aria-hidden="true"
          className="size-2 rounded-full bg-warning/70"
        />
        <span aria-hidden="true" className="size-2 rounded-full bg-signal/70" />
        <span className="ml-1 font-mono text-micro text-quiet">
          sprite · ftl-gc
        </span>
      </div>

      <dl className="divide-y divide-edge">
        {SAMPLE_METRICS.map((metric) => (
          <div
            key={metric.label}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <dt className="truncate font-mono text-micro text-muted">
              {metric.label}
            </dt>
            <dd
              className={`shrink-0 font-mono text-mini tabular-nums ${
                metric.good ? "text-signal" : "text-warning"
              }`}
            >
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-edge px-4 py-3">
        <p className="font-mono text-micro text-muted">
          <span className="text-warning">warning</span> 8,206 page copies to
          reclaim 412 blocks
        </p>
      </div>
    </Frame>
  );
}

/** Small numbered eyebrow that opens each band, in Linear's `1.0 Label` form. */
function SectionMark({ n, label }: { n: string; label: string }) {
  return (
    <p className="text-micro font-medium text-muted">
      <span className="text-quiet">{n}</span> {label}
    </p>
  );
}

export default function Home() {
  return (
    <>
      {/* ---------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden border-b border-edge bg-canvas-deep">
        <div
          aria-hidden="true"
          className="grid-backdrop pointer-events-none absolute inset-0 opacity-25 [mask-image:radial-gradient(ellipse_at_top,black,transparent_65%)]"
        />
        {/* The glow is fog, not a spotlight: wide, and under 8% opacity. */}
        <div
          aria-hidden="true"
          className="glow-fog pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 opacity-60"
        />

        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div>
              <Eyebrow>Ephemeral execution · isolated microVMs</Eyebrow>

              <h1 className="headline-fade mt-5 text-title-5 text-balance sm:text-title-7 lg:text-title-8">
                Systems problems that actually run.
              </h1>

              <p className="mt-6 max-w-xl text-regular text-body sm:text-large">
                Everywhere else you rehearse algorithms. Here you implement the
                internals — flash translation layers, write-ahead logs, garbage
                collectors — and they are graded on write amplification and
                resilience, not on passing a unit test.
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
              <FigureLabel className="mt-3 block">
                Fig 0.1 — run output
              </FigureLabel>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Differentiators */}
      <section className="border-b border-edge">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <ScrollReveal>
            <SectionMark n="1.0" label="Premise" />
            <h2 className="mt-3 max-w-2xl text-title-4 text-balance sm:text-title-5">
              Why this is different
            </h2>
            <p className="mt-4 max-w-2xl text-regular text-muted">
              LeetCode rehearses the interview. ByteArena rehearses the systems.
              The constraints are physical, the metrics are unforgiving, and the
              grader is actively hostile.
            </p>
          </ScrollReveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DIFFERENTIATORS.map(({ icon: Icon, title, body }, i) => (
              <ScrollReveal key={title} delay={i * 0.08}>
                <Card className="h-full p-6">
                  <span
                    aria-hidden="true"
                    className="grid size-9 place-items-center rounded-8 border border-edge bg-raised text-accent-hover"
                  >
                    <Icon className="size-4" />
                  </span>
                  <h3 className="mt-4 text-title-1">{title}</h3>
                  <p className="mt-2 text-mini text-muted">{body}</p>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------- What you'll learn */}
      <section className="border-b border-edge">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <ScrollReveal>
            <SectionMark n="2.0" label="Curriculum" />
            <h2 className="mt-3 max-w-2xl text-title-4 text-balance sm:text-title-5">
              What you&apos;ll actually learn
            </h2>
            <p className="mt-4 max-w-2xl text-regular text-muted">
              These are the internals that every database, filesystem, and
              storage controller has to solve. You&apos;ll solve them too — and
              the simulator will tell you exactly how badly.
            </p>
          </ScrollReveal>

          <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
            {CONCEPTS.map(({ icon: Icon, title, body }, i) => (
              <ScrollReveal key={title} delay={i * 0.06}>
                <div className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-8 border border-edge bg-raised text-accent-hover"
                  >
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-title-1">{title}</h3>
                    <p className="mt-2 text-mini text-muted">{body}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- How it works */}
      <section id="how-it-works" className="scroll-mt-20 border-b border-edge">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <ScrollReveal>
            <SectionMark n="3.0" label="Execution" />
            <h2 className="mt-3 max-w-2xl text-title-4 text-balance sm:text-title-5">
              How a run works
            </h2>
            <p className="mt-4 max-w-2xl text-regular text-muted">
              Your code never touches a shared machine. It is injected into a
              fresh microVM, driven through a deterministic workload, and the VM
              is destroyed before the results reach your screen.
            </p>
          </ScrollReveal>

          <ol className="mt-12 grid gap-8 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((step, i) => (
              <ScrollReveal key={step.n} delay={i * 0.1}>
                <li className="border-t border-edge pt-5 sm:h-full sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
                  <FigureLabel>{step.n}</FigureLabel>
                  <h3 className="mt-2 text-title-1">{step.title}</h3>
                  <p className="mt-2 text-mini text-muted">{step.body}</p>
                </li>
              </ScrollReveal>
            ))}
          </ol>
        </div>
      </section>

      {/* --------------------------------------------------- Closing CTA */}
      <section className="relative overflow-hidden bg-canvas-deep">
        <div
          aria-hidden="true"
          className="glow-fog pointer-events-none absolute -bottom-52 left-1/2 h-[460px] w-[760px] -translate-x-1/2 opacity-50"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <ScrollReveal>
            <h2 className="mx-auto max-w-2xl text-title-4 text-balance sm:text-title-5">
              Find out whether your policy survives the hardware.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-regular text-muted">
              One challenge is live now. No account required to run it.
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg">
                <Link href="/challenges">Open the arena</Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
