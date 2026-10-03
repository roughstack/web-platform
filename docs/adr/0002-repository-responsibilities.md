# ADR 0002: Repository responsibilities

**Status:** Accepted

**Date:** 2026-10-03

**Supersedes:** ADR 0001

## Context

The original repository split separated public challenges from private evaluation,
but it left execution contracts, language SDKs, and runner implementations inside
the web application. That boundary makes runtime releases depend on application
deployments and gives public repositories names that do not describe their content.

## Decision

Rough Stack uses four repositories with explicit responsibilities:

1. `roughstack/web-platform` contains the website, editor, accounts, discussions,
   submissions, database schema, control plane, and deployment configuration.
2. `roughstack/execution-runtime` contains the versioned execution protocol,
   language SDKs, compiler profiles, local and remote runners, and cross-language
   conformance tests.
3. `roughstack/challenges` contains public challenge statements, contracts,
   starters, deterministic simulators, public workloads, public tests, and scoring
   metadata.
4. `roughstack/official-evaluation` is private and contains hidden workloads,
   exploit cases, calibration data, and private reference implementations.

The platform consumes immutable challenge and runtime artifacts. Challenges depend
only on versioned runtime contracts. Official evaluation binds to an exact challenge
version, manifest digest, runtime protocol version, and artifact digest.

No repository uses Git submodules. Local development uses sibling checkouts or
explicit paths, while CI and production use versioned artifacts.

## Migration

The existing `arena` manifest terms and `BYTEARENA_*` environment variables remain
temporary compatibility identifiers until a versioned protocol migration is merged
across all repositories. The existing embedded runner remains in the web platform
until the extracted runtime has equivalent conformance coverage and the platform can
consume it without source-level coupling.

## Consequences

- Web releases do not define SDK or runner release cadence.
- Language SDKs share one protocol and one conformance suite.
- Public challenge development cannot expose private evaluation data.
- Compatibility changes require coordinated versioned releases rather than mutable
  sibling-source assumptions.
