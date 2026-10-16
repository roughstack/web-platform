# Roughstack web platform

The visitor-facing app currently prototypes the name **Rivets**. The
organization and repository names remain Roughstack. Set
`NEXT_PUBLIC_PLATFORM_NAME` before building to try a different label; the
navigation, footer, and metadata read it from one place in `src/lib/brand.ts`.
The symbol is separate from that label. Its shared source is
`src/components/brand-mark.tsx`, including the generated browser icon.

An interactive coding platform for **systems engineering** challenges. You implement
storage and systems internals, run them against deterministic workloads, and inspect
the resulting behavior. Generated challenges currently provide practice feedback;
their zero-valued scores are not a ranking system.

The original SSD challenges ask you to write policies for a simulated NAND flash
device. Those challenges measure write amplification, erase count, and wear evenness
against synthetic workloads and injected faults. The newer Go practice challenges
cover caching, queues, scheduling, logs, and related systems concepts.

The current open-source runtime executes submissions through a local Docker
backend. A synthetic stub is available for UI development. Durable judging,
production worker isolation, and official evaluation are under active
development and must not be represented as production-ready security boundaries.

---

## How it works

```mermaid
flowchart LR
    User["Browser<br/>Monaco editor"] --> App["Next.js app"]
    App --> DB[("Postgres")]
    App --> Backend["Execution backend"]
    Backend --> Sprite["Isolated runner<br/>runs harness + user code"]
    Sprite -->|"JSON on stdout"| Backend
    Backend --> App
    App -->|"metrics + verdict"| User
```

A submission is materialized into a purpose-built runner image containing the
challenge harness. User code is injected, the harness drives it through a
deterministic workload while recording metrics, one JSON object is written to
stdout, and the container is removed. The backend validates that result and stores
the current challenge result.

The execution layer sits behind a single interface with two implementations, so the whole
system runs locally without hosted execution credentials:

| `EXECUTION_MODE` | Backend | Used for |
|------------------|---------|----------|
| `local` | Local Docker daemon | Development and the entire test suite |
| `stub` or unset | Synthetic result | UI development only; never official |

There is no production Fly adapter in the current tree. The architecture audit
tracks the migration from in-process execution to a durable, isolated worker.

---

## Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Editor | Monaco |
| Database | PostgreSQL 16 via Prisma 7 |
| Auth | NextAuth v5, GitHub and Google OAuth |
| Current local isolation | Docker container |
| Planned production isolation | Dedicated judge worker with a reviewed sandbox |
| Simulator | Go |
| Tests | Vitest, Playwright, `go test` |

---

## Running it

Requires Docker, Node.js 22, and npm. Go is required only when running the
simulator tests directly on the host.

For the newer public challenges, clone the independently maintained challenge
repository beside this one. The current local runner reads those challenge
packages from disk; a registry file alone cannot execute them. This is an
explicit development setup, not yet a downloadable challenge-bundle release.

```text
roughstack/
  challenges/
  web-platform/
```

From a new `roughstack` directory:

```bash
git clone https://github.com/roughstack/challenges.git
git clone https://github.com/roughstack/web-platform.git
cd web-platform
npm ci
cp .env.example .env.local
BYTEARENA_ARENA_ROOTS=../challenges/challenges npm run arena:validate -- --all
docker build -t roughstack-execution-runtime:latest ./sprite
npm run docker:up
npm run db:push
npm run db:seed
```

Open `http://localhost:3100/challenges/cache-pressure-easy`. The editor must
show an incomplete scaffold, not the passing public baseline. Complete it and
submit to see a real local run. `EXECUTION_MODE=local` in `.env.local` is required;
`stub` emits synthetic UI-development results and must not be used to verify a
challenge. The Docker Compose file mounts `../challenges` read-only into the web
container, so a differently placed checkout needs an adjusted mount and
`BYTEARENA_ARENA_ROOTS` path.

To run the automated baseline-versus-scaffold check against the running stack:

```bash
ROUGHSTACK_REAL_ARENA_E2E=1 npx playwright test tests/e2e/contributor-loop.spec.ts
```

This check runs submitted code in Docker and asserts that the public baseline
passes while the learner scaffold fails with a useful diagnostic. It is opt-in
because it requires the separate challenge checkout, Docker access, and a live
database. Use it only on a trusted local machine; the current Docker-backed
development server is not a public untrusted-code service. The extracted
`execution-runtime` repository owns SDK and protocol development. This local
setup still builds its compatibility image from `web-platform/sprite`; moving
that image to a versioned runtime release is separate work.

```bash
npm run docker:logs            # tail the web container
npm run docker:down            # stop everything without deleting data
```

`npm run docker:reset` deletes the local Compose database volume; do not use it
to troubleshoot an existing checkout without backing up data first.

---

## Verification

The project is developed test-first, and "it looks fine" is not accepted as evidence.
Alongside conventional unit and end-to-end tests, every route is put through an automated
**layout audit** at five viewports before any phase is considered complete.

```bash
npm run test        # unit and component tests (Vitest)
npm run test:e2e    # end-to-end and layout audit (Playwright)
npm run test:audit  # layout audit only
npm run test:go     # simulator tests
npm run hygiene     # tracked-file and public/private-boundary checks
npm run verify      # typecheck, lint, unit, e2e
```

### The layout auditor

Six checks run inside the page against real computed geometry:

| Check | What it catches |
|-------|-----------------|
| Occlusion | Text or controls covered by an unrelated element |
| Horizontal overflow | Content wider than the viewport, and the element responsible |
| Text clipping | Text cut off with no ellipsis or line clamp |
| Contrast | Text below the WCAG AA ratio against its true composited background |
| Off-viewport | Visible elements positioned outside the viewport |
| Tap targets | Controls under 44x44 px on mobile |

Occlusion is detected by sampling points inside each element's box and asking
`document.elementFromPoint` what is actually painted there. Because the browser resolves
the real stacking order, this reports genuine visual defects rather than the harmless
bounding-box intersections that naive overlap checks drown in.

### X-ray mode

Every element is outlined in a colour that appears nowhere in the design, and the
screenshot is analysed at the pixel level for boundary crowding, with dense regions
tinted in an annotated copy. `outline` is used rather than `border` specifically because
outlines do not participate in layout, so enabling x-ray cannot itself shift the page and
manufacture the defects being looked for.

This is a heuristic second opinion: it catches things geometry is blind to, such as CSS
transforms and clipped scroll containers, and produces an artefact that is quick to review
by eye. The geometric audit remains the gate that fails a build.

Artefacts land in `tests/e2e/__screenshots__/<route>/`:

```
laptop.png                  clean screenshot, full page
laptop.xray.png             every element boundary drawn
laptop.xray-hotspots.png    crowded regions tinted
laptop.report.json          machine-readable violations
```

Viewports certified: 320, 390, 768, 1280 and 1920 CSS pixels wide.

---

## Layout

```
prisma/          schema, migrations, seed data
src/
  app/           routes, layouts, route handlers
  components/    UI
  lib/           db, auth, execution backends, scoring
sprite/          Go simulator, challenge harnesses, sandbox image
tests/
  unit/          Vitest
  e2e/           Playwright specs and the layout auditor
docs/
  product.md     product brief
```

---

## Documentation

- [`docs/product.md`](docs/product.md): what this is and who it is for
- [`docs/architecture-audit.md`](docs/architecture-audit.md): implemented
  architecture and migration gaps
- [`docs/adr/0002-repository-responsibilities.md`](docs/adr/0002-repository-responsibilities.md):
  repository ownership and dependency boundaries
- [`docs/production-readiness.md`](docs/production-readiness.md): launch blockers
  and the ordered product roadmap
- [`docs/releases.md`](docs/releases.md): release and compatibility policy
- [`docs/dependency-policy.md`](docs/dependency-policy.md): dependency,
  advisory, and license review requirements
- [`CONTRIBUTING.md`](CONTRIBUTING.md): contribution and verification rules
- [`SECURITY.md`](SECURITY.md): private vulnerability reporting and current
  security limitations

## License

Roughstack is licensed under the [Apache License 2.0](LICENSE). See
[NOTICE](NOTICE) for attribution information.
