# Current architecture audit

This audit records the migration baseline before the arena-platform extraction.

## Current runtime

- The Next.js route creates a `Submission` and starts execution as fire-and-forget
  work in the web process.
- `src/lib/execution/backend.ts` contains the backend contract, local Docker
  implementation, and a task-aware development stub. A production Fly adapter is
  described but not implemented.
- `src/lib/execution/runner.ts` loads challenge data from Prisma, constructs a
  NAND-shaped execution request, invokes the backend, calculates a score, and writes
  `Result` and `Submission` records.
- The Go Sprite runner has a useful task registry, but its shared parameter and
  result structures still carry SSD-specific geometry and result detail.
- Challenge definitions and starter code are seeded into PostgreSQL. Frontend pack
  registration statically imports the SSD pack.

## Coupling to remove

1. Execution requests contain SSD device and compaction fields instead of a generic
   submission, arena bundle, resource policy, and workload reference.
2. Workload construction branches on the `compaction` task in the web process.
3. The stub backend fabricates task-specific metrics.
4. Arena identity is a mutable `Challenge` row rather than an immutable manifest and
   version digest.
5. Result persistence lacks a versioned envelope, run attempt, environment
   provenance, and infrastructure-error category.
6. Execution occurs in the web process and has no durable claim, lease, heartbeat,
   retry, or reconciliation lifecycle.
7. Public arena rendering is extensible through a registry, but the platform still
   imports the SSD implementation directly.

## Verification baseline

- TypeScript typecheck: pass.
- ESLint: pass.
- Vitest: 56 tests pass across 6 files.
- Go: all Sprite packages pass.
- Playwright: blocked before migration changes by a repeated Next.js 16.2.12
  Turbopack panic reporting `Next.js package not found` while writing the dynamic
  challenge page endpoint. This must be stabilized before E2E can be used as a
  migration gate.

## First migration batch

1. Add runtime-validated Arena Specification v1 types.
2. Add deterministic manifest loading, digesting, path containment, duplicate
   identity checks, and a repository validation command.
3. Validate a manifest from a sibling public arena checkout without changing the
   current NAND runtime.
4. Introduce compatibility adapters before replacing current database and runner
   shapes.

