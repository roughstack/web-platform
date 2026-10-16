# Rivets: computing exhibition

Active visual direction, 16 October 2026. This supersedes the palette and page compositions in `design-system.md`; its accessibility and interaction requirements still apply.

## Intent

Computer science presented with the visual confidence of an exhibition identity. The audience is curious, technical, and comfortable with complexity. Avoid school-workbook styling: no graph paper, decorative schematic corners, dotted backdrops, or ubiquitous pastel cards. Actual axes, memory slots, and data relationships remain where they explain a concept.

## Tokens

| Role | Value |
| --- | --- |
| Exhibition dark | `#282334` |
| Reading paper | `#f2f0ed` |
| Signal orange | `#ff784f` |
| Electric lilac | `#b9a1ff` |
| Mint | `#a9e8cb` |
| Dark text | `#252231` |

Bricolage Grotesque carries the large, compact headlines. Inter carries explanations. JetBrains Mono is reserved for scores, counts, addresses and code. White text sits on aubergine; aubergine text sits on the bright colors. Do not use white body text on orange or lilac.

## Composition

```text
HOME       dark navigation / monumental headline + floating memory assembly
           orange action / small interactive caption
           paper reading surface / large subject illustrations

DASHBOARD  lilac workbench header / oversize completion counter
           dark next-experiment panel / colored progress segments
           illustrated challenge collection / light submission history

RANKINGS   dark score-board header / orange focal type
           three leading results as large typographic panels
           light table / clear numeric hierarchy
```

Color blocks, scale contrasts, asymmetry and custom geometry provide character. Borders and rounded cards should not be the primary source of hierarchy. Keep text left-aligned and preserve open space around the single focal element in each section.

## Mark and illustration

The identity is a modular R: a vertical spine, an open bowl, and a detached diagonal leg. It suggests construction and decomposition, remains recognizable at favicon size, and is independent of the configurable platform name. Navbar and favicon share the same SVG source.

Challenge art uses saturated flat grounds without wallpaper. Difficulty variants differ in shape as well as color. The interactive memory assembly uses filled recesses, not a wire grid. Its movement preserves block identity and order; it is a conceptual model rather than a scored run.

## Motion and review

### Landing: an object to investigate

The palette and modular R at `design-exhibition-baseline-2026-10-16` are the approved checkpoint. The subsequent landing experiment adds personality through agency, not another theme change. Preserve the icon, challenge library, dashboard and leaderboard.

The hero invites visitors to take apart a small memory model. A single entrance assembles the layers in under two seconds. Pointer movement changes the viewing angle slightly; inspecting a block raises it and shows its address. A labeled range control separates data from the address layer. Compaction moves the same objects while preserving their identity and order. The address inspector follows the selected object. These are conceptual visual controls, not code execution.

All interactions have keyboard equivalents. Focus reveals the same information as a pointer. Touch users can tap blocks and use the slider without depending on hover. Reduced motion removes entrance, tilt, and spatial transitions without removing any state or information. No perpetual floating, automatic state changes, scroll hijacking, or animated wallpaper.

The subject strip links to actual challenge pathways. Subject cards respond to hover/focus with a small illustration movement and directional affordance. Keep these quieter than the hero. Visual review must include the initial state, exploded state, selected block, compaction, small-screen touch layout and reduced-motion mode.

Motion follows an action, not an endless ambient loop. Reduced motion removes spatial transitions. Keep focus indicators, touch targets and readable body text.

Review the actual homepage, dashboard, leaderboard and two difficulty cards at desktop and phone sizes. Ask whether the page has a recognizable silhouette before reading any copy. Do not equate a passing build with aesthetic success. Keep data queries and execution logic outside this design iteration.

### Revision: motion without a manual

The manual memory sculpture was rejected. Landing artwork must feel alive before visitors touch it: no block inspectors, sliders, demonstration buttons, or subject-name strip. Preserve the modular logo. Keep the existing Bricolage headline, readable body typography, left-aligned copy, and open artwork composition.

Use a conceptual storage cutaway, not a literal SSD schematic: violet layers (#7954ef), hot-pink writes (#ff4ba0), cyan routes (#53d9ff), lime cells (#b7ff45), against plum (#282334). Keep motion inside the illustration. Pause it offscreen and render a static reduced-motion alternative.

Replace the elementary cache exercise with a distinct crash-recovery vignette: a durable journal, an interruption, a recovered file. Acid-lime section, violet illustration field. Introduce a question, explain the idea briefly, then link to the real challenge. Do not present conceptual artwork as an executable simulation.
