"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Two panes with a divider you can drag.
 *
 * The divider is a real separator: it takes focus, responds to arrow keys, and
 * reports its position to assistive technology. Resizing a workspace is not a
 * mouse-only affordance in any editor worth using, and it should not be here.
 *
 * The position persists per key, so the layout someone settles on survives a
 * reload rather than snapping back every visit.
 */

export type SplitDirection = "horizontal" | "vertical";

export interface SplitProps {
  readonly direction: SplitDirection;
  readonly first: React.ReactNode;
  readonly second: React.ReactNode;
  /** Starting size of the first pane, as a percentage. */
  readonly defaultSize?: number;
  readonly minSize?: number;
  readonly maxSize?: number;
  /** Persists the position under this key. Omit to keep it ephemeral. */
  readonly storageKey?: string;
  /**
   * Hides one pane and the divider, giving the other the whole area. Used by
   * focus mode and by collapsing the console. The hidden pane stays mounted's
   * sibling in the tree only when visible, so a collapsed editor does not keep
   * re-laying out behind the scenes.
   */
  readonly collapse?: "first" | "second";
  readonly className?: string;
  readonly label?: string;
}

const KEYBOARD_STEP = 2;
const KEYBOARD_STEP_LARGE = 10;

export function Split({
  direction,
  first,
  second,
  defaultSize = 50,
  minSize = 20,
  maxSize = 80,
  storageKey,
  collapse,
  className,
  label,
}: SplitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(defaultSize);
  const [dragging, setDragging] = useState(false);
  const separatorId = useId();

  const clamp = useCallback(
    (value: number) => Math.min(Math.max(value, minSize), maxSize),
    [minSize, maxSize],
  );

  // Restore after mount rather than during render. localStorage does not exist
  // on the server, so reading it in an initialiser would make the first client
  // paint disagree with the server's and break hydration. Setting state in an
  // effect is exactly the escape hatch for state that only the client can know,
  // and it runs once per key rather than on every render.
  useEffect(() => {
    if (!storageKey) return;
    const stored = window.localStorage.getItem(`ba.split.${storageKey}`);
    if (stored === null) return;
    const parsed = Number.parseFloat(stored);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above: client-only state, restored once
    if (Number.isFinite(parsed)) setSize(clamp(parsed));
  }, [storageKey, clamp]);

  const persist = useCallback(
    (value: number) => {
      if (!storageKey) return;
      window.localStorage.setItem(`ba.split.${storageKey}`, value.toFixed(2));
    },
    [storageKey],
  );

  const horizontal = direction === "horizontal";

  const positionFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      const extent = horizontal ? rect.width : rect.height;
      if (extent === 0) return null;
      const offset = horizontal ? clientX - rect.left : clientY - rect.top;
      return clamp((offset / extent) * 100);
    },
    [horizontal, clamp],
  );

  // Pointer capture keeps the drag alive when the cursor outruns the divider,
  // which it always does, and releases it even if the pointer is lifted
  // outside the window.
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const next = positionFromPointer(event.clientX, event.clientY);
    if (next !== null) setSize(next);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
    persist(size);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const decrease = horizontal ? "ArrowLeft" : "ArrowUp";
    const increase = horizontal ? "ArrowRight" : "ArrowDown";

    let next: number | null = null;
    if (event.key === decrease) next = size - (event.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP);
    else if (event.key === increase) next = size + (event.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP);
    else if (event.key === "Home") next = minSize;
    else if (event.key === "End") next = maxSize;
    else if (event.key === "Enter") next = defaultSize;

    if (next === null) return;
    event.preventDefault();
    const clamped = clamp(next);
    setSize(clamped);
    persist(clamped);
  };

  if (collapse) {
    return (
      <div className={cn("flex min-h-0 min-w-0 flex-col", className)}>
        {collapse === "second" ? first : second}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("flex min-h-0 min-w-0", horizontal ? "flex-row" : "flex-col", className)}
    >
      <div className="min-h-0 min-w-0 overflow-hidden" style={{ flexBasis: `${size}%` }}>
        {first}
      </div>

      <div
        role="separator"
        id={separatorId}
        tabIndex={0}
        aria-orientation={horizontal ? "vertical" : "horizontal"}
        aria-valuenow={Math.round(size)}
        aria-valuemin={minSize}
        aria-valuemax={maxSize}
        aria-label={label ?? "Resize panes"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        onDoubleClick={() => {
          setSize(defaultSize);
          persist(defaultSize);
        }}
        className={cn(
          "group relative shrink-0 touch-none outline-none",
          // The hit area is deliberately wider than the visible line: a 1px
          // target is a usability bug even when it looks right. 24px is the
          // WCAG 2.5.8 minimum, and the right bar for a divider — the 44px
          // rule is for things you tap, not things you drag.
          horizontal ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize",
          "before:absolute before:z-10 before:content-['']",
          horizontal
            ? "before:-left-2.5 before:-right-2.5 before:inset-y-0"
            : "before:-top-2.5 before:-bottom-2.5 before:inset-x-0",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 bg-edge transition-colors",
            "group-hover:bg-accent/50 group-focus-visible:bg-accent",
            dragging && "bg-accent",
          )}
        />
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{second}</div>
    </div>
  );
}
