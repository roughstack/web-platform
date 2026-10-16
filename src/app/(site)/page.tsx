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
    <div>
      <section className="exhibition-hero">
        <div className="mx-auto grid max-w-7xl items-center gap-6 px-5 pt-8 pb-12 sm:px-8 sm:pt-10 lg:grid-cols-[1fr_1fr] lg:gap-0 lg:py-12">
        <div className="hero-invitation relative z-10">
          <p className="mb-7 text-base text-[#b9a1ff]">For the incurably curious.</p>
          <h1 className="exhibition-headline">Go on.<br />Take it apart.</h1>
          <p className="mt-7 max-w-[34ch] text-lg leading-relaxed text-[#d7cedf]">The best way to understand a system? Get your hands on it. Move the memory. Pull apart the layers. Follow the question.</p>
          <Button asChild size="lg" className="exhibition-action mt-8"><Link href="/challenges">Explore challenges <ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
        </div>
        <MemorySculpture />
        </div>
        <div className="exhibition-index"><Link href="/challenges#pathway-memory">Memory</Link><Link href="/challenges#pathway-storage">Storage</Link><Link href="/challenges#pathway-coordination">Concurrency</Link><Link href="/challenges#pathway-data-in-motion">Networks</Link></div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-[19ch] font-display text-4xl leading-[1.08] tracking-[-.035em] sm:text-5xl">There’s a good question inside every system.</h2>
          <Link href="/challenges" className="inline-flex min-h-11 items-center gap-2 font-semibold text-link hover:underline">All challenges <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
        <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-7">
          {TOPICS.map((topic) => (
            <Link key={topic.slug} href={`/challenges/${topic.slug}`} className="curiosity-card group block">
              <div className="curiosity-art overflow-hidden rounded-[20px]"><ChallengeArtwork slug={topic.slug} className="aspect-[240/136]" /><span className="curiosity-open" aria-hidden="true"><ArrowRight className="size-5" /></span></div>
              <p className="mt-5 text-sm text-muted">{topic.label}</p>
              <h3 className="mt-2 font-display text-2xl leading-tight tracking-tight group-hover:text-link">{topic.title}</h3>
              <p className="mt-3 max-w-[35ch] text-base leading-relaxed text-muted">{topic.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 bg-[#b9a1ff]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:py-24">
          <div>
            <h2 className="max-w-[13ch] font-display text-5xl leading-[1.02] tracking-[-.04em] sm:text-6xl">Try a little.<br />Learn a lot.</h2>
            <p className="mt-6 max-w-[36ch] text-lg leading-relaxed text-[#282334]">This cache has room for two items. Each access changes what it remembers. Predict what leaves, then try it.</p>
            <p className="mt-4 max-w-[40ch] text-base leading-relaxed text-[#282334]">In a challenge, you write the rule yourself. The problem, editor, tests, and results stay together while you work.</p>
            <Link href="/challenges/cache-pressure-easy" className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-[#282334] underline underline-offset-4">Build the cache policy <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div>
          <CachePlayground />
        </div>
      </section>
    </div>
  );
}
