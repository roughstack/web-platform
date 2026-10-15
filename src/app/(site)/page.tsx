import Link from "next/link";
import { ArrowRight, Braces, ChartNoAxesCombined, Cpu, MousePointer2, Play } from "lucide-react";

import { ChallengeArtwork } from "@/components/challenge-artwork";
import { CachePlayground } from "@/components/cache-playground";
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
      <section className="relative overflow-hidden border-b border-edge bg-[#eaf0ff]">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#2447e7_0%,#2447e7_38%,#ff784f_38%,#ff784f_66%,#0b977e_66%)]" />
        <div aria-hidden="true" className="grid-backdrop pointer-events-none absolute inset-0 opacity-35" />
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 -right-28 size-[440px] rounded-full bg-[#b1ddff]/70 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 -left-20 size-72 rounded-full bg-voltage/60 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-18 sm:px-6 sm:py-24 lg:grid-cols-[1.02fr_.98fr] lg:gap-12 lg:py-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#a9bdfa] bg-panel px-3 py-1.5 font-mono text-micro font-bold tracking-[.08em] text-link uppercase">
              <Cpu className="size-3.5" aria-hidden="true" />
              Systems lab / open for experiments
            </p>
            <h1 className="mt-6 max-w-[11ch] text-[clamp(3.15rem,6vw,5.7rem)] leading-[1.02] font-bold tracking-[-0.055em] text-ink">
              The fun is <span className="relative text-link">inside<span aria-hidden="true" className="absolute right-0 bottom-[.02em] left-0 -z-10 h-[.16em] -rotate-1 bg-voltage" /></span> the system.
            </h1>
            <p className="mt-6 max-w-xl text-large text-body">
              Build the cache, scheduler, log, or storage policy yourself. See the mechanism, run your code, and discover why a small decision matters.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/challenges">Explore challenges <ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
              <Button asChild size="lg" variant="secondary"><Link href="#how-it-works">How it works</Link></Button>
            </div>
            <p className="mt-7 flex items-center gap-2 font-mono text-micro font-semibold tracking-[.05em] text-muted uppercase">
              <Play className="size-4 text-circuit" aria-hidden="true" />
              Input → state → output → understanding
            </p>
          </div>
          <CachePlayground />
        </div>
      </section>

      <section className="border-b border-edge bg-panel">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-5 py-5 sm:px-6">
          <p className="text-small font-semibold text-ink">What you will find here</p>
          <div className="flex flex-wrap gap-x-7 gap-y-2 text-small text-muted">
            <span>Visual explanations</span><span>Runnable code</span><span>Concrete feedback</span>
          </div>
        </div>
      </section>

      <section className="border-b border-edge bg-canvas">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-25">
          <ScrollReveal>
            <p className="font-mono text-micro font-semibold tracking-[.15em] text-link uppercase">Choose a rabbit hole</p>
            <h2 className="mt-3 max-w-[16ch] text-title-5 leading-tight sm:text-title-7">Every system has a story worth opening.</h2>
            <p className="mt-4 max-w-2xl text-regular text-muted">Pick a concept that makes you curious. Each challenge moves from a small visual idea to a real implementation and an observable result.</p>
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
                    <h3 className="mt-2 text-title-2">{topic.title}</h3>
                    <p className="mt-2 text-mini text-muted">{topic.description}</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-mini font-semibold text-link">Open the challenge <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 border-b border-edge bg-[#edf4ff]">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-25">
          <ScrollReveal>
            <p className="font-mono text-micro font-semibold tracking-[.15em] text-link uppercase">The learning loop</p>
            <h2 className="mt-3 text-title-5 sm:text-title-7">See it. Build it. Understand it.</h2>
          </ScrollReveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, number, title, description, tone }, index) => (
              <ScrollReveal key={number} delay={index * 0.07}>
                <div className="h-full rounded-20 border border-[#cfdef2] bg-panel p-6">
                  <div className="flex items-center justify-between">
                    <span className={`grid size-11 place-items-center rounded-12 text-ink ${tone}`}><Icon className="size-5" aria-hidden="true" /></span>
                    <span className="font-mono text-tiny font-semibold text-link">{number}</span>
                  </div>
                  <h3 className="mt-5 text-title-2">{title}</h3>
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
            <h2 className="mt-2 max-w-xl text-title-4 font-bold text-white sm:text-title-5">Make a system do something surprising.</h2>
            <p className="mt-2 max-w-lg text-mini text-white/85">Start with a challenge. The problem, code, and results are all in one place.</p>
          </div>
          <Button asChild size="lg" variant="secondary" className="shrink-0 border-white bg-white text-link hover:border-white hover:bg-[#eef2ff]"><Link href="/challenges">Find a challenge <ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
        </div>
      </section>
    </>
  );
}
