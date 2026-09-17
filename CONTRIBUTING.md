# Contributing to ByteArena

Thank you for helping build ByteArena. Contributions should keep the platform
reproducible, reviewable, secure around untrusted code, and independent from
private official-evaluation material.

## Before opening a change

1. Open an issue for architecture, contract, security-boundary, schema, or
   dependency changes before implementation.
2. Keep each pull request focused on one logical change.
3. Use conventional commit subjects such as `feat(arena): ...`,
   `fix(judging): ...`, or `docs: ...`.
4. Do not commit secrets, local environments, generated reports, build output,
   participant submissions, private workloads, ranked seeds, or official judge
   material.

## Local verification

The Docker workflow is the supported starting point. See `README.md` for setup.
Before requesting review, run:

```bash
npm ci
npm run hygiene
npm run typecheck
npm run lint
npm run test
npm run test:go
```

Run the relevant Playwright tests when changing routes, user flows, or layout.
Arena contract changes must also pass the manifest and result-envelope tests.

## Pull-request expectations

- Explain the user-visible or engineering problem and why the change is scoped
  appropriately.
- Add or update tests for changed behavior and failure paths.
- Document migrations, compatibility effects, security implications, and
  operational rollback where applicable.
- Preserve deterministic behavior: correctness must not depend on wall-clock
  timing, host paths, network access, or undeclared state.
- Treat execution, bundle extraction, queue transitions, authentication, and
  result validation as security-sensitive areas requiring maintainer review.

By submitting a contribution, you agree that it is licensed under the Apache
License 2.0 in this repository.
