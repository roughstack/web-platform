# Production readiness roadmap

Rough Stack has a coherent learning experience, a deterministic arena contract,
and a strong local development path. It is not ready to accept untrusted public
traffic yet. The work below is ordered by dependency and launch risk.

## Current product boundary

The browser experience is functional: visitors can browse challenges, read the
educational material, edit code, submit a solution, inspect results, discuss an
approach, and move between difficulty levels. Public arena source lives in a
separate repository, while official evaluation material has its own private
boundary.

The current server remains a development deployment:

- `src/lib/auth.ts` always returns an anonymous session.
- `src/lib/execution/runner.ts` starts work inside the web process without a
  durable queue.
- `src/lib/execution/backend.ts` has local Docker and synthetic backends, but no
  production execution adapter.
- `src/lib/rate-limit.ts` stores limits in process memory.
- `src/lib/arena/challenge.ts` needs local arena source files to materialize a
  playable challenge, even when the catalog comes from a production registry.
- The application has no production observability contract, incident signals,
  or service-level objectives.

## P0: required before a public launch

### 1. Build the durable execution plane

Move submission execution out of the Next.js process. A successful submission
request should commit one immutable job, and a worker should claim it with a
lease. Retries must be idempotent, terminal states must be monotonic, and an
interrupted worker must not leave a submission in `RUNNING` forever.

The worker should enforce the sandbox policy outside participant code: wall
clock and CPU limits, memory and process ceilings, output limits, read-only
runtime assets, a small writable workspace, no outbound network by default,
and guaranteed cleanup. Official results must record the arena version, bundle
digest, judge policy version, image digest, seed, and execution backend.

Exit criteria:

- Web restarts do not lose accepted submissions.
- Worker crashes are recovered automatically without duplicate results.
- The production backend runs a signed, immutable arena bundle by digest.
- Every execution environment is reconciled and destroyed after completion.

### 2. Make arena distribution self-contained

The generated registry is enough to list arenas, but not enough to open or run
one in production. Produce immutable public arena bundles in CI, publish them to
artifact storage, and let the platform resolve a catalog entry to a verified
bundle. The production web image should not depend on a sibling checkout.

Exit criteria:

- A clean production image can list, open, and execute every published arena.
- Bundle checksums are verified before extraction.
- Paths, links, archives, and file sizes are validated before materialization.
- Rollback selects an earlier catalog and bundle set without rebuilding code.

### 3. Finish identity, sessions, and abuse controls

Replace the authentication stub with the configured providers and decide which
actions remain available to guests. Persist user ownership separately from the
anonymous practice session, support account linking safely, rotate sessions,
and add account export and deletion.

Move submission limits to a shared store. Apply limits by account and by a
privacy-conscious network signal, with stricter controls on expensive execution
paths. Add request body limits, concurrency quotas, and protection against
automated discussion spam.

Exit criteria:

- Sign in, sign out, session expiry, and account linking have end-to-end tests.
- A user can export and delete their account and retained submissions.
- Limits behave consistently across multiple web and worker instances.
- Administrative actions are authenticated, authorized, and audited.

### 4. Add operational visibility and recovery

Use structured logs with request, submission, job, arena, and worker identifiers.
Collect queue depth, queue age, execution duration, failure class, sandbox cleanup,
database latency, and API error rates. Add traces across request, queue, worker,
and result persistence. Define alerts and short runbooks for each user-visible
failure.

The database needs managed backups, tested point-in-time recovery, encrypted
connections, migration discipline, connection pooling, and a rollback procedure.
Expose separate liveness and readiness checks so an unhealthy dependency does
not accept work.

Exit criteria:

- An operator can follow one submission from request to final result.
- Alerts detect stuck queues, elevated failures, and leaked sandboxes.
- Restore drills prove the recovery point and recovery time objectives.
- Deployments run migrations safely and can roll back application code.

### 5. Complete the public trust surface

Publish privacy, terms, acceptable-use, cookie, data-retention, and content
moderation policies. Document what code is retained, who can read it, which
results are official, and how users report a vulnerability or appeal moderation.
Add a content security policy and review all security headers in the deployed
environment.

Exit criteria:

- Legal and data controls match actual product behavior.
- Security reporting is private and tested.
- Dependency, image, and secret scanning run in CI.
- A release has a software bill of materials and signed artifacts.

## P1: required for a strong learning product

### Guided progression

Group related rungs into learning paths, explain prerequisites, show why a next
challenge is recommended, and track concept mastery rather than attempts alone.
The dashboard should show current work, completed families, bookmarks, recent
feedback, and one clear next action.

### Feedback after a run

Convert raw metrics into a concise diagnosis. Show the largest regression, the
tradeoff the solution made, and one concept to revisit. Add run-to-run comparison,
test-case grouping, code replay, and a clear distinction between correctness and
performance.

### Solutions and review

Keep community solutions hidden until a learner has completed or intentionally
revealed a challenge. Support explanation-first solution posts, language and
strategy filters, useful review prompts, reporting, and maintainer moderation.
Automated feedback and human feedback should remain visibly distinct.

### Discovery and accessibility

Add search, subject filters, estimated time, prerequisites, saved challenges,
and explicit completion state. Complete keyboard and screen-reader audits for
the editor, split panes, diagrams, tables, and result visualizations. Test reduced
motion, zoom, narrow screens, and high-contrast modes.

## P2: growth and ecosystem

- Public profiles with opt-in visibility and verified achievements.
- Organization classrooms, private cohorts, and assignment progress.
- A documented arena authoring kit with local preview and contract validation.
- Challenge versioning, deprecation, moderation, and an editorial review queue.
- Product analytics based on explicit events and a documented retention policy.
- Billing only after execution cost, abuse, refund, and quota models are known.

## Product patterns reviewed

This ordering borrows proven patterns without copying another product's surface:

- [CodeCrafters](https://codecrafters.io/) makes the workflow concrete: choose a
  real system, build it in stages, push code, and receive immediate test feedback.
- [Frontend Mentor guides](https://www.frontendmentor.io/guides) connect onboarding,
  challenge discovery, submissions, feedback, learning paths, and account settings.
- [Frontend Mentor community solutions](https://www.frontendmentor.io/guides/viewing-community-solutions)
  keep solution browsing behind a completion gate to protect the learning loop.
- [Exercism getting started](https://exercism.org/docs/using/getting-started) uses
  tracks and progression, while its [feedback model](https://exercism.org/docs/using/feedback)
  separates automated analysis from mentor guidance.
- [LeetCode feature notes](https://leetcode.com/discuss/post/5736503/Feature-Release-Notes/)
  show the value of grouped test cases, submission analysis, code replay, progress
  views, filters, profiles, security settings, and focus modes at scale.

## Recommended implementation order

1. Define the immutable execution job and result provenance schema.
2. Publish and verify arena bundles independently of the platform image.
3. Implement the queue, worker lease, production sandbox adapter, and reconciler.
4. Add shared rate limits and real identity around the execution boundary.
5. Add telemetry, alerts, backups, readiness checks, and runbooks.
6. Complete policies, account controls, and security hardening.
7. Build guided progression and feedback on top of trustworthy run data.
8. Add community solutions, review, discovery, and authoring workflows.

This sequence keeps the most expensive promise first: when Rough Stack says it
ran a learner's code safely and measured it fairly, that claim must be true and
reproducible.
