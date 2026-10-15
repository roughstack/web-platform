import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ChallengeArtwork } from "@/components/challenge-artwork";
import { CachePlayground } from "@/components/cache-playground";
import { MemorySculpture } from "@/components/memory-sculpture";
import { Button } from "@/components/ui/button";

const TOPICS = [
  { label: "Memory & caching", title: "What deserves to stay?", description: "A cache is small. Your decisions make it useful. Build a policy that knows what to keep.", slug: "cache-pressure-easy" },
  { label: "Storage & recovery", title: "What survives a crash?", description: "The write stopped halfway. Reconstruct what happened and bring the system back.", slug: "journal-recovery-easy" },
  { label: "Scheduling & flow", title: "What should happen next?", description: "Deadlines compete for the same machine. Give each task its moment.", slug: "deadline-scheduler-easy" },
];

export default function Home() {
  return (
    <div className="bg-[#f8fafc]">
      <section className="mx-auto grid max-w-6xl items-center gap-4 px-5 pt-12 pb-16 sm:px-8 sm:pt-20 lg:grid-cols-[.9fr_1.1fr] lg:gap-0 lg:pb-24">
        <div className="relative z-10">
          <h1 className="max-w-[10ch] font-display text-[clamp(2.65rem,6.6vw,6.2rem)] leading-[.98] font-bold tracking-[-.055em] text-[#172730]">Small ideas.<br />Extraordinary machines.</h1>
          <p className="mt-7 max-w-[35ch] text-lg leading-relaxed text-body">Computer science comes alive when you build it. Open a system, write its missing piece, and see what happens.</p>
          <Button asChild size="lg" className="mt-8 rounded-full"><Link href="/challenges">Explore challenges <ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
          <p className="mt-4 text-sm text-muted">Real code. Small experiments. Deeper understanding.</p>
        </div>
        <MemorySculpture />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 lg:pb-24">
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-edge pt-9">
          <h2 className="max-w-[19ch] font-display text-4xl leading-[1.08] tracking-[-.035em] sm:text-5xl">There’s a good question inside every system.</h2>
          <Link href="/challenges" className="inline-flex min-h-11 items-center gap-2 font-semibold text-link hover:underline">All challenges <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
        <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-7">
          {TOPICS.map((topic) => (
            <Link key={topic.slug} href={`/challenges/${topic.slug}`} className="group block">
              <div className="overflow-hidden rounded-[20px]"><ChallengeArtwork slug={topic.slug} className="aspect-[240/136]" /></div>
              <p className="mt-5 text-sm text-muted">{topic.label}</p>
              <h3 className="mt-2 font-display text-2xl leading-tight tracking-tight group-hover:text-link">{topic.title}</h3>
              <p className="mt-3 max-w-[35ch] text-base leading-relaxed text-muted">{topic.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 bg-[#e4eafb]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:py-24">
          <div>
            <h2 className="max-w-[13ch] font-display text-5xl leading-[1.02] tracking-[-.04em] sm:text-6xl">Try a little.<br />Learn a lot.</h2>
            <p className="mt-6 max-w-[36ch] text-lg leading-relaxed text-body">This cache has room for two items. Each access changes what it remembers. Predict what leaves, then try it.</p>
            <p className="mt-4 max-w-[40ch] text-base leading-relaxed text-muted">In a challenge, you write the rule yourself. The problem, editor, tests, and results stay together while you work.</p>
            <Link href="/challenges/cache-pressure-easy" className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-link hover:underline">Build the cache policy <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div>
          <CachePlayground />
        </div>
      </section>
    </div>
  );
}
