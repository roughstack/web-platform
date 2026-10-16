# Challenge explainer direction

The 13 current challenges already have diagrams. A signature explainer should
make one consequential transition legible, not add a decorative second figure.
Public statements and harness contracts remain the source of truth. These
artworks are conceptual examples, never a claim about an official run or score.

## Visual grammar

- Ink `#282334` grounds mechanisms; paper `#f2f0ed` carries reading text.
- Orange `#ff784f` means an incoming operation or interruption. Lilac
  `#b9a1ff` marks resident state, mint `#a9e8cb` preserved state, cyan
  `#53d9ff` transit, and lime `#b7ff45` a confirmed outcome. These meanings
  are reinforced with words and shape, not color alone.
- Bricolage Grotesque is for the one-line concept headline, Inter for the
  explanation, and JetBrains Mono for keys, sequence numbers, bytes, and ticks.
- One large mechanism occupies the figure. No graph-paper wallpaper, generic
  three-card sequence, looping sparkle, fake terminal output, or fictitious
  performance result.

```text
concept headline               operation / current state

             [ one large mechanism ]

one sentence explaining the current consequence     Replay
```

Keep the artwork left-aligned with the statement. Start its finite sequence
when it enters view, settle on a meaningful frame, and allow replay. A reduced-
motion preference shows the final explanatory state without motion. The full
sequence must be understandable through a static accessible description. If a
later explainer needs ongoing motion, add pause/stop controls rather than an
uncontrolled loop. A pre-rendered SVG/video is welcome when it conveys the
concept more clearly; it must still have a lightweight poster and transcript.

## One visual question per challenge

| Challenge | Moment to explain |
| --- | --- |
| Cache Pressure, easy | One read changes recency, so a different key is evicted. |
| Cache Pressure, medium | A cold scan displaces a hot set under pure LRU; admission protects reuse. |
| Chunk Store | A short read touches one independently framed block. |
| Deadline Scheduler | A running non-preemptive job delays a newly arrived urgent job. |
| Durable Work Queue | A lease expires and the same job becomes available again. |
| Fair Gate | Tokens refill; an expensive request waits for the exact retry tick. |
| Journal Recovery | A crash leaves a durable prefix and an incomplete tail. |
| Lossy Link | A lost ACK triggers retry; duplicate data is acknowledged, not delivered twice. |
| LSM Compactor | An L0 choice closes over L1 overlaps before tombstone-aware merging. |
| Stream Windows | A watermark finalizes one window while the next remains open. |
| Compaction | Moving one live cell extends the contiguous free suffix. |
| Victim Selection | Choosing a block trades reclaimed space for live-page migration. |
| Wear Levelling | Spreading erases trades extra migration for lower wear concentration. |

## Review gate

For each artwork, compare every shown state with the public contract/example;
check the before/after story at phone width and desktop width; inspect a real
screenshot rather than relying on a build; test keyboard replay and reduced
motion; and keep the surrounding editorial to one observation, one invariant,
and one learner decision. The first pilots are Cache Pressure and Lossy Link.

## Recovery and time batch

These mechanisms should not inherit the cache tile composition. Bricolage
states the consequence, Inter explains it in one sentence, and mono marks only
literal keys, LSNs, ticks, and results. Layout stays left-aligned in the narrow
problem pane.

| Story | Surface and accent | Singular visual action |
| --- | --- | --- |
| Journal Recovery | Pale butter `#fff2c8`, ink `#282334`, verified mint `#a9e8cb`, torn orange `#ff784f` | A scan cursor reaches an incomplete third frame and stops; only the first two form the recovered prefix. |
| LSM Compactor | Lilac `#d9cbff`, ink `#282334`, selected violet `#7954ef`, intersecting orange `#ff784f` | Two selected Level-0 ranges cast one union over Level 1, pulling in both overlapping runs. |
| Stream Windows | Deep blue `#2141b4`, cyan `#53d9ff`, event orange `#ffad83`, final lime `#b7ff45` | A watermark reaches tick 10, emits and removes the left half-open window while the right remains live. |

```text
journal: [verified 1][verified 2][torn 3]     scan stops before 3
LSM:          A [10------30] B [25-------------50]
         X [0----20]                  Y [40------60]
windows: [0,10)  | [10,20)              watermark = 10
```

The axes are conceptual but use the exact published numbers. Do not interpolate
a fake performance result. In an editor split, keep critical labels legible
without relying on viewport breakpoints.
