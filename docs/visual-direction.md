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

### Interaction grammar

The workspace is an instrument, not a decorative dashboard. Controls rise a
little on hover and settle when pressed; they never move without an action.
Submission has a readable sequence: send, queue, execute, then verdict. The
console gives each stage a distinct text label and color without implying that
queued work is already running. A passed run is green, a failed check is red,
and neither verdict relies on color alone. A scaffold that fails build checks
before the workload starts has no measurements; its panel says so rather than
presenting an invented score.

The first learning demo illustrates the same rule. Selecting a cache operation
changes its entries and advances a short progress rail. The transition is brief
and stops entirely for reduced-motion preferences. We do not use looping
animations on lesson art, editor chrome, or reading text. Monospace is reserved
for commands, pipeline steps, status, and measurements; the explanations keep
their easier-to-read sans-serif voice.

## Bold direction: computation you can touch

The previous light-circuit pass is preserved by the annotated Git tag
`visual-baseline-before-bold-cs-2026-10-16`. This chapter is deliberately a
larger step. A grid or chip silhouette says “software,” but it does not let a
curious visitor feel a computer *doing* something. Our visual DNA is a visible
cause and effect: choose an input, watch a transformation, predict an output,
then build the mechanism yourself.

Brilliant's strength is the small decision that makes an idea click. Our
subject and implementation are different. We start with a real half-adder:
two switches, XOR for sum, AND for carry, and an immediate truth table. A
learner can touch the primitive before they read about caches, storage,
scheduling, and networks. The interface should never turn these into a false
claim that logic-gate or neural-network challenges are already published.

### Visual system

- A light overall canvas remains. High-energy cobalt, electric lime, coral,
  and ice blue gather around *active computation* and focal actions. Dark ink
  makes the interactive circuit feel like an instrument, not a site-wide dark
  mode. Quiet reading surfaces remain quiet.
- Lines are signals, not wallpaper. In the circuit, route color indicates 0 or
  1 and output nodes change immediately. A short pulse follows input changes;
  nothing loops without a learner action. Reduced motion removes the pulse.
- Type has two jobs: generous sans-serif invites exploration and carries
  explanations; compact monospace labels inputs, gates, truth values, code,
  and measurements. Avoid forcing long copy into a terminal aesthetic.
- The reading site now gives editorial headlines their own geometric display
  face, Space Grotesk. Inter remains the quiet reading voice and JetBrains Mono
  the instrument voice. This three-role system creates contrast without turning
  an entire lesson into code or a magazine cover.
- IBM's THINK history suggests the power of a single confident idea; Tamiko
  Thiel's account of the Connection Machine suggests an even stronger test:
  form should reveal what the machine is doing, not merely expose generic
  circuit ornament. Our original circuit, domain map, and typographic rhythm
  follow that principle, not either source's visual assets or layout. See
  https://www.ibm.com/history/think and
  https://www.tamikothiel.com/theory/cm_txts/index.html.
- The path from bit to system is an editorial map, not an invented course
  catalogue. The public library distinguishes runnable challenges from future
  frontiers. Cards answer “what do I control?” and “what will I observe?” in
  short human-edited copy, while the full statement remains authoritative.

### Work sequence and acceptance

1. Build and test the half-adder with real binary behavior, keyboard controls,
   text equivalents, and no mandatory motion.
2. Recompose the home page around that instrument and a clear route into the
   challenge library. The first viewport should say “computer science from
   the inside” in both copy and interaction.
3. Make the library scannable by domain and editorial question, preserving
   every existing challenge URL, language, difficulty, and practice/ranked
   status. Do not imply unpublished topics can be run.
4. Verify phone, tablet, desktop, keyboard, reduced-motion, contrast, and real
   challenge navigation. Keep changes in independent commits so the tagged
   state and each iteration remain easy to compare.
