# Visual direction: a systems field guide with a working lab

Rough Stack teaches by making invisible systems visible. The interface should
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
