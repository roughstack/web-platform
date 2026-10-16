# Execution plane implementation

This is the next production-readiness project after the learning UI. It is not
permission to accept untrusted public submissions. The current request handler
still runs work inside the web process with a local Docker or synthetic backend.

## Goal and invariants

One accepted submission must create one durable execution job. A worker may
retry an attempt, but only one terminal result may be published. A web restart
must not lose queued work, and a worker crash must not leave a lease stuck
forever. A run must be reproducible from its recorded source hash, challenge
version, workload seed and parameters, judge policy, runtime image, and backend.

The worker, not participant code, owns resource limits and sandbox cleanup.
Only a verified, immutable arena bundle may be used for an official run. Stub
results remain development-only and must never be presented as official scores.

## Change order

1. **Repair the database migration baseline.** The original migration
   predates the current `Difficulty` and `Language` enums, `Reply`, and several
   `Challenge` and `Submission` fields. The follow-up migration maps old
   difficulty values (`BEGINNER` to `EASY`, `INTERMEDIATE` to `MEDIUM`, and
   `ADVANCED`/`EXPERT` to `HARD`), converts legacy description and interface
   text to blocks, and preserves submissions. Disposable Postgres tests passed
   for both populated legacy rows and a database already at the `db push`
   schema; CI now replays and compares migrations on every PR. Never reset a
   user's database to hide drift.
2. Define versioned job input and result-provenance contracts. Inputs snapshot
   the challenge settings and workload variant at acceptance time. Arena jobs
   pin an arena version and manifest digest. Hash the source without embedding
   duplicate source code in the job payload.
3. Commit a submission and its unique job in one database transaction. Keep
   the old in-process executor behind an explicit development-only switch
   during transition; no request may return success before the job commits.
4. Build a worker that atomically claims a due job with a lease and fencing
   token, heartbeats while running, and reconciles expired leases. Retried
   attempts cannot overwrite a newer or terminal result.
5. Resolve verified arena bundles by digest, then add a production sandbox
   adapter with enforced CPU, memory, process, wall-clock, output and network
   policy. Reconcile and destroy execution environments after every outcome.
6. Exercise restarts, concurrent workers, lease expiry, duplicate delivery,
   malformed bundles, and sandbox cleanup in integration tests. Add queue and
   failure telemetry before enabling public traffic.

## Current slice

The first implementation slice repairs migration parity and defines the
versioned input/provenance contract with tests. It is intentionally not wired
into submission acceptance yet. No existing run changes behavior in this slice.

Databases created earlier with `prisma db push` but without entries in
`_prisma_migrations` need an operator-reviewed baseline procedure before
`prisma migrate deploy`; do not run the initial migration against those tables.
