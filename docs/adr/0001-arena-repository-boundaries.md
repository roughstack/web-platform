# ADR 0001: Separate platform, public arenas, and official evaluation

**Status:** Accepted  
**Date:** 2026-09-14

## Context

Rough Stack needs to support multiple independently evolving systems arenas without
turning the web application and judge into a collection of arena-specific branches.
Official evaluation also needs hidden workloads and reference material that must
never enter a public build.

Keeping all three concerns in one repository would couple release cadence, code
ownership, CI cost, and access control. It would also make it too easy for private
evaluation material to leak into a public image or artifact.

## Decision

Rough Stack uses three repository boundaries:

1. `bytearena` is the public platform repository. It owns contracts, discovery,
   validation, scoring primitives, the web/control plane, judge worker, execution
   adapters, SDKs, templates, and conformance fixtures.
2. `bytearena-arenas` is the public arena repository. It owns player-facing arena
   manifests, starters, simulators, harnesses, public fixtures, public tests,
   baselines, and metric documentation.
3. `bytearena-official` is private. It owns hidden cases, ranked workloads, fault
   schedules, exploit tests, reference implementations, and calibration data.

The dependency direction is one-way:

```text
bytearena-arenas  ──uses──> versioned Rough Stack contracts and SDK
bytearena-official ─uses──> versioned Rough Stack contracts and public arena identity
bytearena          ─loads──> immutable arena bundles through public contracts
```

The platform must not import arena source code. Local development discovers
manifests from explicitly configured roots. Production consumes an explicit,
immutable registry of published bundle digests. Git submodules are not part of the
default workflow; sibling checkouts and versioned release artifacts keep repository
history and ownership independent.

The existing NAND implementation remains in the platform repository temporarily
behind compatibility adapters. It moves only after the v1 contracts and validation
path are proven, so the current working experience is preserved during migration.

## Consequences

- Arena authors can change and test public arenas without touching the web or judge
  repositories.
- Platform releases can validate several arena repository revisions against the
  same contract version.
- Official assets have a separate access-control and artifact-publication path.
- Local setup needs an explicit arena-root configuration or a sibling-checkout
  convention.
- Cross-repository compatibility tests and immutable bundle provenance become
  required release gates.
