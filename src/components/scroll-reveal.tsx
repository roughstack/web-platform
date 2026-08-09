"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  /** Delay in seconds before the animation starts after entering view. */
  delay?: number;
  /** Vertical offset to animate from, in pixels. Default 16. */
  y?: number;
  className?: string;
}

/**
 * ScrollReveal fades and slides its children in when they scroll into view.
 * Respects prefers-reduced-motion: if the user has reduced motion enabled,
 * the content is shown immediately with no animation.
 */
export function ScrollReveal({
  children,
  delay = 0,
  y = 16,
  className,
}: ScrollRevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
