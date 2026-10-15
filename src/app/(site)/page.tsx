import Link from "next/link";
import { ArrowRight, Braces, ChartNoAxesCombined, Cpu, MousePointer2, Play } from "lucide-react";

import { ChallengeArtwork } from "@/components/challenge-artwork";
import { CachePlayground } from "@/components/cache-playground";
import { HalfAdderPlayground } from "@/components/half-adder-playground";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/scroll-reveal";

const TOPICS = [
  {
    number: "01",
    label: "Memory & caching",
    title: "Make every byte count.",
    description: "Decide what stays close, what leaves, and how a tiny accounting mistake changes the whole cache.",
    slug: "cache-pressure-easy",
    color: "bg-[#baf2d5]",
  },
  {
    number: "02",
    label: "Storage & recovery",
    title: "Survive the interrupted write.",
    description: "Build logs and storage policies that still make sense when the happy path disappears.",
    slug: "journal-recovery-easy",
    color: "bg-[#ffd3c5]",
  },
  {
    number: "03",
    label: "Scheduling & flow",
    title: "Keep work moving fairly.",
    description: "Explore deadlines, queues, and rate limits by watching your decisions play out.",
    slug: "deadline-scheduler-easy",
    color: "bg-[#ffe3a4]",
  },
];

const STEPS = [
  {
    icon: MousePointer2,
    number: "01 / EXPLORE",
    title: "See the system",
    description: "Start with a visual model and a small concrete example. Know what can change before you write code.",
    tone: "bg-voltage",
  },
  {
    icon: Braces,
    number: "02 / IMPLEMENT",
    title: "Make the decision",
    description: "Fill in the interface in the browser. The editor and the problem stay together as you work.",
    tone: "bg-ice",
  },
  {
    icon: ChartNoAxesCombined,
    number: "03 / LEARN",
    title: "Read the outcome",
    description: "Run your solution and inspect the verdict and measurements. Iterate on the behavior, not a guess.",
    tone: "bg-[#ffd3c5]",
  },
];

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-[#d4dcf4] bg-[#f1f5ff]">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-2 bg-[linear-gradient(90deg,#3154f4_0%,#3154f4_38%,#c7ff65_38%,#c7ff65_67%,#ff785d_67%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-16 size-[420px] rounded-full bg-[#b9c8ff]/50 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-28 size-[400px] rounded-full bg-[#d9ff96]/50 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-6 sm:py-22 lg:grid-cols-[.87fr_1.13fr] lg:gap-14 lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#a9bdfa] bg-panel px-3 py-1.5 font-mono text-micro font-bold tracking-[.08em] text-link uppercase">
              <Cpu className="size-3.5" aria-hidden="true" />
              Computer science, from the inside
            </p>
            <h1 className="mt-6 max-w-[11ch] font-display text-[clamp(3.35rem,6.7vw,6.4rem)] leading-[.96] font-bold tracking-[-0.07em] text-[#111b36]">
              Go <span className="font-mono font-medium tracking-[-.095em] text-[#3154f4]">inside</span> the machine<span className="text-[#b83d2b]">.</span>
            </h1>
            <p className="mt-6 max-w-xl text-large text-body">
              Flip a bit. Watch the logic change. Then write the caches, schedulers, and storage systems that make software work.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-[#3154f4] hover:bg-[#213ecc]"><Link href="/challenges">Explore challenges <ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
              <Button asChild size="lg" variant="secondary"><Link href="#from-bit-to-system">Follow the signal</Link></Button>
            </div>
            <p className="mt-7 flex items-center gap-2 font-mono text-micro font-semibold tracking-[.05em] text-link uppercase">
              <Play className="size-4" aria-hidden="true" />
              Try the two switches first →
            </p>
          </div>
          <HalfAdderPlayground />
        </div>
      </section>

      <section id="from-bit-to-system" className="scroll-mt-20 border-b border-[#d4dcf4] bg-[#c7ff65]">
        <div className="mx-auto grid max-w-6xl gap-5 px-5 py-7 sm:px-6 md:grid-cols-[.65fr_1.35fr] md:items-center">
          <p className="font-mono text-xs font-black tracking-[.12em] text-[#172715] uppercase">A bit is just the beginning / 001 → ∞</p>
          <p className="text-lg font-semibold leading-snug text-[#172715]">The same habit of mind scales: change an input, predict the system, and test what actually happens.</p>
        </div>
      </section>

      <section className="border-b border-edge bg-canvas">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-25">
          <ScrollReveal>
            <p className="font-mono text-micro font-semibold tracking-[.15em] text-link uppercase">Choose a subsystem</p>
            <h2 className="mt-3 max-w-[16ch] font-display text-title-5 leading-tight sm:text-title-7">What happens after the bit?</h2>
            <p className="mt-4 max-w-2xl text-regular text-muted">A circuit is a start, not a promise of a gate-building challenge yet. These are the systems you can actually implement today.</p>
          </ScrollReveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {TOPICS.map((topic, index) => (
              <ScrollReveal key={topic.slug} delay={index * 0.06}>
                <Link href={`/challenges/${topic.slug}`} className="group block h-full overflow-hidden rounded-20 border border-edge bg-panel transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_18px_45px_-32px_rgba(24,68,70,0.35)]">
                  <div className={topic.color}>
                    <ChallengeArtwork slug={topic.slug} className="aspect-[240/136]" />
                  </div>
                  <div className="p-5">
                    <p className="font-mono text-tiny font-semibold tracking-wider text-link uppercase">{topic.number} / {topic.label}</p>
                    <h3 className="mt-2 font-display text-title-2">{topic.title}</h3>
                    <p className="mt-2 text-mini text-muted">{topic.description}</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-mini font-semibold text-link">Open the challenge <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-edge bg-[#e4edff]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="font-mono text-micro font-bold tracking-[.15em] text-link uppercase">Next experiment / memory</p>
            <h2 className="mt-3 max-w-[13ch] font-display text-title-5 leading-tight sm:text-title-7">A cache is a set of choices.</h2>
            <p className="mt-4 max-w-lg text-regular text-body">The circuit shows a rule. A cache adds history. Try a few accesses here, then implement a real policy in the challenge.</p>
            <Link href="/challenges/cache-pressure-easy" className="mt-6 inline-flex items-center gap-2 font-semibold text-link underline-offset-4 hover:underline">Build the cache policy <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div>
          <CachePlayground />
        </div>
      </section>

      <section className="overflow-hidden bg-[#101a37] text-white">
        <div className="mx-auto max-w-6xl px-5 py-18 sm:px-6 sm:py-22">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-micro font-bold tracking-[.15em] text-[#c7ff65] uppercase">The long curiosity</p>
              <h2 className="mt-3 max-w-[15ch] font-display text-title-5 leading-tight text-white sm:text-title-7">From a bit to a brain.</h2>
            </div>
            <p className="max-w-sm text-mini text-[#c9d9fb]">Computer science is one continuous story. These are the layers we want to make tangible, including the ones still ahead.</p>
          </div>
          <ol className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <li className="rounded-20 border border-[#526b9e] bg-[#20345f] p-5">
              <span className="font-mono text-xs font-bold text-[#c7ff65]">01 / LOGIC</span>
              <div aria-hidden="true" className="mt-5 font-mono text-3xl font-black tracking-tight text-white">1 ⊕ 1 = 0</div>
              <h3 className="mt-5 font-display text-title-1 text-white">Make a decision</h3>
              <p className="mt-2 text-sm text-[#c9d9fb]">A gate turns input bits into an output. Try the live circuit above.</p>
            </li>
            <li className="rounded-20 border border-[#526b9e] bg-[#20345f] p-5">
              <span className="font-mono text-xs font-bold text-[#69dafa]">02 / MEMORY</span>
              <div aria-hidden="true" className="mt-5 font-mono text-3xl font-black tracking-tight text-white">*p = 0x0A</div>
              <h3 className="mt-5 font-display text-title-1 text-white">Move the bytes</h3>
              <p className="mt-2 text-sm text-[#c9d9fb]">Work close to data with compaction in C, C++, Rust, or another supported language.</p>
              <Link href="/challenges/compaction" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#69dafa] hover:underline">Open compaction <ArrowRight className="size-4" aria-hidden="true" /></Link>
            </li>
            <li className="rounded-20 border border-[#526b9e] bg-[#20345f] p-5">
              <span className="font-mono text-xs font-bold text-[#ffaf96]">03 / NETWORKS</span>
              <div aria-hidden="true" className="mt-5 font-mono text-3xl font-black tracking-tight text-white">SEQ 04 → ACK 05</div>
              <h3 className="mt-5 font-display text-title-1 text-white">Survive the noise</h3>
              <p className="mt-2 text-sm text-[#c9d9fb]">Make a byte stream reliable across lost and corrupted packets.</p>
              <Link href="/challenges/lossy-link-easy" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#ffaf96] hover:underline">Open Lossy Link <ArrowRight className="size-4" aria-hidden="true" /></Link>
            </li>
            <li className="rounded-20 border border-[#c7ff65] bg-[#c7ff65] p-5 text-[#14251a]">
              <span className="font-mono text-xs font-bold">04 / THE FRONTIER</span>
              <div aria-hidden="true" className="mt-5 font-mono text-3xl font-black tracking-tight">Σ(w·x) → ?</div>
              <h3 className="mt-5 font-display text-title-1 text-[#14251a]">Teach a system</h3>
              <p className="mt-2 text-sm text-[#263b26]">Neural networks and more are part of the journey we want to build. Not a published challenge yet.</p>
            </li>
          </ol>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 border-b border-edge bg-[#edf4ff]">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-25">
          <ScrollReveal>
            <p className="font-mono text-micro font-semibold tracking-[.15em] text-link uppercase">The learning loop</p>
            <h2 className="mt-3 font-display text-title-5 sm:text-title-7">See it. Build it. Understand it.</h2>
          </ScrollReveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, number, title, description, tone }, index) => (
              <ScrollReveal key={number} delay={index * 0.07}>
                <div className="h-full rounded-20 border border-[#cfdef2] bg-panel p-6">
                  <div className="flex items-center justify-between">
                    <span className={`grid size-11 place-items-center rounded-12 text-ink ${tone}`}><Icon className="size-5" aria-hidden="true" /></span>
                    <span className="font-mono text-tiny font-semibold text-link">{number}</span>
                  </div>
                  <h3 className="mt-5 font-display text-title-2">{title}</h3>
                  <p className="mt-2 text-mini text-muted">{description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-canvas px-5 py-20 sm:px-6 sm:py-25">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 rounded-24 bg-accent px-7 py-10 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div>
            <p className="font-mono text-micro font-semibold tracking-[.15em] text-white/80 uppercase">Your next experiment</p>
            <h2 className="mt-2 max-w-xl font-display text-title-4 font-bold text-white sm:text-title-5">Make a system do something surprising.</h2>
            <p className="mt-2 max-w-lg text-mini text-white/85">Start with a challenge. The problem, code, and results are all in one place.</p>
          </div>
          <Button asChild size="lg" variant="secondary" className="shrink-0 border-white bg-white text-link hover:border-white hover:bg-[#eef2ff]"><Link href="/challenges">Find a challenge <ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
        </div>
      </section>
    </>
  );
}
