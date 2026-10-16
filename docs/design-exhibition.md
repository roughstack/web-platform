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
HOME       dark navigation / monumental headline + moving storage cutaway
           orange action / journal recovery story on an acid-lime field
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

Challenge art uses saturated flat grounds without wallpaper. Difficulty variants differ in shape as well as color. Within the two-column storage collection, card grounds vary across each row and down adjacent rows. The landing storage machine is a conceptual illustration, not a scored run.

## Motion and review

### Landing: motion without a manual

The palette and modular R at `design-exhibition-baseline-2026-10-16` are the approved checkpoint. The hero is a conceptual storage cutaway: violet layers (#7954ef), hot-pink writes (#ff4ba0), cyan routes (#53d9ff), and lime cells (#b7ff45) against plum (#282334). It runs when visible without controls or explanatory overlays. The green completion tick was removed after visual review. Pause animation offscreen and render static art when reduced motion is requested.

The second vignette asks how a file survives an interrupted write. A journal, power interruption, and recovered file sit on a violet illustration field within an acid-lime section. Brief copy leads to the crash-recovery challenge. It is an illustration, not an executable simulation.

Keep the Bricolage headline, readable body typography, left-aligned copy, open composition, and modular logo. Subject cards can respond to hover or focus with subtle motion. Review the homepage, library, dashboard, leaderboard, and both cache difficulty cards on desktop and phone sizes. Verify keyboard focus, contrast, reduced motion, and responsive layout. A passing build does not establish aesthetic quality.
