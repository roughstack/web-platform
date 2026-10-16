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

Motion follows an action, not an endless ambient loop. Reduced motion removes spatial transitions. Keep focus indicators, touch targets and readable body text.

Review the actual homepage, dashboard, leaderboard and two difficulty cards at desktop and phone sizes. Ask whether the page has a recognizable silhouette before reading any copy. Do not equate a passing build with aesthetic success. Keep data queries and execution logic outside this design iteration.
