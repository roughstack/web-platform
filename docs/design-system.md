---
title: Rivets visual design system
status: active implementation specification
updated: 2026-10-16
scope: public site, challenge discovery, progress, rankings
supersedes: visual-direction.md
---

# Rivets design system

Read this before changing the public UI. The product teaches computer science
through implementation. Its audience is curious enough to open a computer and
ask how it works, but does not necessarily know the vocabulary yet. The first
impression should invite that curiosity; the workspace should sustain it.

## Direction: a science magazine you can operate

A large, original illustration and confident typography establish the first
impression. A short interaction reveals an idea inside the illustration.
Explanations, controls, and results become more detailed as a learner proceeds.
The landing page is an invitation; it does not need to show the entire lesson.

The previous dark half-adder panel is not the visual direction. Its density,
tiny labels, nested rectangles, and truth table made the hero feel like a
diagnostic console. Correct behavior alone is not visual acceptance.

Keep the challenge library's domain grouping. Give difficulty variants visibly
different art while retaining the family's visual identity. Dashboard and
leaderboard should use the same type and color language, with real data taking
the place of decorative statistics.

## Reference observations and decisions

| Reference | Observed principle | Rivets application |
| --- | --- | --- |
| [MIT Technology Review, Pentagram](https://www.pentagram.com/work/mit-technology-review) | Flexible grid; a few large visual ideas; distinct display, reading, and caption roles; bright color balanced by open space. | One dominant hero image; large unbroken headline; quiet descriptions; captions attached to the visual they explain. |
| [Thinking Machines Lab](https://thinkingmachines.ai/) | Narrow readable text measure and unusually generous space around its identity. | Limit supporting copy to about 55–65 characters per line. Leave real space around the hero rather than filling it with status badges. |
| [Muriel Cooper, Pentagram](https://www.pentagram.com/work/muriel) | Typography and motion can express the behavior of information. | Animate a change in memory position; keep the values identifiable during the movement. |
| [Quanta art direction, Olena Shmahalo](https://www.olenashmahalo.com/project/quanta) | Scientific concepts provide subjects for editorial illustration. | Draw a specific mechanism with a clear silhouette. Do not use random circuitry as a substitute for an idea. |

These are principles, not assets to reproduce. The following tokens and recipes
are original project decisions. Taste still requires a rendered review.

## Tokens

```yaml
palette:
  paper: '#f8fafc'       # cool light canvas, dominant surface
  ink: '#172730'         # reading and outlines
  cobalt: '#2447e7'      # primary action, one dominant illustration mass
  coral: '#f27657'       # contrasting illustration mass, not small text
  pollen: '#f4ce57'      # supporting illustration mass
  mist: '#e4eafb'        # quiet structure and secondary surfaces
type:
  display: Bricolage Grotesque
  body: Inter
  technical: JetBrains Mono
  hero: 'clamp(3.2rem, 6.8vw, 6.4rem); 0.98 line-height; -0.055em tracking'
  section: 'clamp(2rem, 3.8vw, 3.6rem); 1.05 line-height'
  body_size: '16–18px; 1.55–1.65 line-height'
  caption: '12–14px; 1.4 line-height'
layout:
  max_width: 1152px
  gutter: '20px phone, 32px desktop'
  section_gap: '64px phone, 96px desktop'
  reading_measure: 65ch
motion:
  response: 180ms
  spatial_transition: 600ms
  reduced_motion: immediate state change
```

Use at least two thirds light or neutral space in a typical viewport. Saturation
belongs primarily to illustration and the main action. Coral and yellow are
surfaces, not body-text colors. Labels must pass contrast checks on their actual
background. Do not put a gradient wash behind every section.

Display type carries the invitation. Body type carries explanation. Monospace
is reserved for code, addresses, counts, and state. Keep full headlines one
color and one family. Do not turn every caption into tracked uppercase text.

## Page composition

### Landing page

```text
brand                                      navigation / start

Large, short headline       One oversized sculptural memory illustration
Two lines of explanation    Values and spaces are immediately distinguishable
One clear primary action    One action; one sentence explains the result

Featured challenges: three distinct subjects with short descriptions

One small experiment + explanation of how to learn here
```

The hero illustration is an isometric memory ribbon with visible gaps and
colored blocks. Its shape must be interesting before interaction. Compaction
moves the same values into the first available positions, preserving their
order; a reset restores the scattered state. This is a conceptual illustration,
not an execution result. Do not add a fake terminal, fake live statistics, or
another table inside it.

Remove sections that restate the same promise. A visitor should reach the
challenge choices within roughly two desktop viewports. The entire front page
does not need to list every future topic. Neural-network content remains a
future direction until a real exercise exists.

### Challenge variants

Family determines silhouette; difficulty changes palette and an actual detail.
For Cache Pressure, Easy uses green with two equal blocks. Medium uses violet
with unequal blocks and a small clock motif, reflecting variable sizes and
expiry. Difficulty remains a text badge. Color alone must not identify a tier.
Unknown slugs continue to receive usable artwork and a normal challenge link.

### Dashboard

Treat the page as a personal workbench: a compact editorial heading, a useful
next action, followed by genuine progress and history. Empty state uses a small
memory composition and a direct link to a first challenge. Never invent streaks,
completion percentages, scores, or sign-in capabilities.

### Leaderboard

Use a strong heading and compact comparison motif above a legible table. The
data must remain primary. Distinguish the current session and leading ranks
with restrained color. Explain which challenges are ranked without filling the
header with implementation details. A decorative motif must not imply real
rankings when there are no results.

## Illustration construction

- Start with a silhouette that reads at thumbnail size. At most three major
  color masses should compete in one illustration.
- Use consistent geometry: one projection, one light direction, one stroke
  scale. Align connectors to shapes; do not leave near-misses or arbitrary bends.
- Use depth to separate parts, not as a background effect. Avoid blur clouds,
  fake glass, and glossy panels around otherwise flat diagrams.
- Keep labels outside the main shapes when possible. The page caption can
  explain a metaphor without placing a paragraph inside the art.
- Preserve object identity through motion. Animate only a learner-triggered
  transformation; retain a useful static view with reduced motion.
- Prefer code-native SVG for diagrams that change state. Raster art is suitable
  for editorial imagery when it adds a visual quality SVG cannot supply.

## Review gate

Review the rendered page at 390px, 768px, and 1440px, plus the 320px overflow
check. Ask these questions separately from automated tests:

1. Is there one obvious focal point within three seconds?
2. Does the image have a deliberate silhouette, color balance, and negative space?
3. Does the headline read naturally without awkward one-word orphan lines?
4. Can the idea be understood before reading the small caption?
5. Does interaction produce a visible, meaningful change?
6. Can Easy and Medium be distinguished at thumbnail size?
7. Do progress and ranking views belong to the same visual family?

Reject a design if any of the first five answers is no. Review screenshots,
not just the source. Test contrast, overflow, keyboard access, and reduced motion
as functional gates; passing them is not evidence of aesthetic quality.

## Contributor continuation

Implementation order: tokens and reusable illustration, landing composition,
variant art, dashboard and leaderboard, then visual review and focused checks.
Keep changes in atomic commits. Preserve the existing baseline tag
`visual-baseline-before-bold-cs-2026-10-16` for comparison.

When revising this guide, update the tokens, recipes, and review criteria in
place. Record stable design decisions, not assistant transcripts. Link this
guide from older design notes so a future contributor has one source of truth.
