"use client";

import { useEffect, useRef, useState } from "react";

/** A finite, viewport-triggered story with an accessible reduced-motion end state. */
export function useVisibleStory(lastStage: number, intervalMs: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { threshold: 0.35 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || reducedMotion || stage >= lastStage) return;
    const timer = window.setTimeout(() => setStage((current) => current + 1), intervalMs);
    return () => window.clearTimeout(timer);
  }, [visible, reducedMotion, stage, lastStage, intervalMs]);

  return {
    ref,
    stage: reducedMotion ? lastStage : stage,
    reducedMotion,
    replay: () => setStage(0),
  };
}

export function Replay({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full border border-current px-3 py-1 font-mono text-[11px] font-semibold transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      Replay
    </button>
  );
}
