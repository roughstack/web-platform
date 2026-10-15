# Visual direction: a systems field guide with a working lab

Roughstack teaches by making invisible systems visible. The interface should
feel curious, lucid, and alive, while the code editor and measurements remain
trustworthy instruments. This is a light-first product, not a dark developer
dashboard with pastel accents.

## Principles

1. **Show the mechanism.** Every challenge family needs a recognizable diagram
   that explains a transition, boundary, or tradeoff. Decorative art never
   substitutes for the concept diagram or its text alternative.
2. **Reading first, doing next.** A short invitation leads to a concrete model,
   then the contract, example, editor, and feedback. Each view should help the
   learner know what to do next without burying the task in chrome.
3. **One visual grammar.** Warm paper, dark ink, generous whitespace, strong
   headings, rounded but precise geometry, and consistent states connect the
   marketing pages to the challenge workspace.
4. **Color has a job.** Blue identifies action and links; green is success;
   amber warns; coral marks failure. Topic colors differentiate families but
   never carry correctness alone. Diagrams also use labels, position, and shape.
5. **Honesty is part of polish.** Practice-only challenges are not presented as
   ranked, and the site describes the execution path it actually provides.

## Palette and material

The default floor is warm off-white, panels are white, and soft sage-tinted
surfaces group supporting material. Main text is deep blue-black. The primary
action is saturated cobalt, with mint, marigold, and coral used sparingly for
topic artwork and states. Diagrams should resemble a well-edited technical
notebook: light fills, crisp borders, explicit labels, and enough room to see
state change. Code uses a quiet light instrument panel, not a disconnected
dark rectangle. All meaningful text and controls must meet WCAG AA contrast.

## Journey and implementation order

1. Correct execution and scoring language across home, footer, library,
   leaderboard, dashboard, and arena. Generated arena packages are practice
   until calibrated ranking exists.
2. Replace global design tokens and shared components. Verify focus, active,
   disabled, error, and reduced-motion states before decorating pages.
3. Recompose the home page around a concrete concept demonstration and a clear
   path into the library. The first viewport should feel like learning systems,
   not reading hosting claims.
4. Make the challenge library scannable by topic and depth. Give each family a
   distinct small mechanism illustration using code-native SVG/CSS; use the same
   visual vocabulary in its lesson.
5. Bring the light system through statement blocks, diagrams, editor, console,
   discussion, and submissions, preserving working interactions on phones.
6. Run unit, build, and viewport/interaction checks; inspect real pages and
   actual challenge submissions. Fix regressions before considering a phase
   complete.

The public challenge audit remains the source of truth for oracle/property-test
gaps. This visual work must not claim those gaps are closed by a new coat of
paint.

## Next chapter: live circuitry

The first light pass made reading comfortable but treated too much of the
subject as a static notebook. The next pass should make a system's **state
change** the visual signature. The page is a workbench: inputs arrive, a
decision passes through a component, and the output can be inspected. Small
grid marks, ports, routed traces, and measured labels are useful when they
clarify this story; they are not wallpaper.

The identity has two independent parts. The symbol is a compact route through
three connected modules, with a bright active endpoint. It must read at favicon
size without relying on letters. The temporary six-letter app name is
**Rivets**; the organization and repository identity remain **Roughstack**.
All visitor-facing app naming comes from one configuration value so a later
rename does not require rewriting navigation, metadata, or artwork. Do not
rename package imports, URLs, or repository slugs as part of a visual prototype.

### Palette and behavior

Keep paper-white reading surfaces and deep ink. Raise the energy with electric
blue for action, vivid tangerine for events, teal for resolved state, and acid
yellow for the active signal. Colors label states consistently but never alone:
every diagram also uses text, position, and form. Saturated color should be
concentrated around a decision or transition, leaving long explanations and
the code editor calm.

Typography uses two voices. The sans serif carries headlines, explanations,
and navigation. Monospace marks commands, measurements, trace steps, figure
captions, and compact technical labels. It is an instrument, not the default
reading face; a problem statement must remain comfortable at paragraph length.

The homepage's first visual should answer a learner action. A three-step cache
demonstrator is the first test: choose a trace step and see which entry becomes
newest or leaves the cache. Use real controls, visible output, keyboard focus,
and reduced-motion handling. In the library, each family keeps its specific
mechanism illustration, but stronger topic color and circuit-like registration
marks tie the cards to the homepage. No infinite ornamental motion.

This takes cues from [Brilliant's interactive learning](https://brilliant.org/faq/)
and [Teenage Engineering's color-coded controls](https://teenage.engineering/products/op-1/original/overview),
while [IBM's data-visualization guidance](https://www.ibm.com/design/language/data-visualization/design/basics/)
reinforces that color should help recognition and decisions. The result should
not resemble any of those products directly.

### Order and checks

1. Separate product label, organization identity, and icon. Replace the old
   stack-of-lines mark in the header and favicon as one atomic identity change.
2. Refresh semantic colors, focus and hover states, and the challenge family
   artwork. Check text contrast before pushing saturation further.
3. Make the hero demonstrate a real transition; carry its visual grammar into
   the challenge library and arena entry point.
4. Build and test desktop, phone, reduced motion, navigation, and all challenge
   diagrams. Inspect the running preview before treating the pass as complete.
