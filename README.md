# ByteArena

An interactive coding platform and secure evaluation engine for **systems engineering**
challenges. Not another algorithm quiz site: you implement real storage and hardware
internals, and your solution is graded on the metrics engineers actually argue about.

The first challenge asks you to write the data-movement policy for a simulated NAND
flash device. Your code is scored on write amplification, erase count, and wear evenness
against a synthetic workload of thousands of operations, then attacked with injected
hardware faults to see whether the logic actually holds up.

Every submission runs in a throwaway Firecracker microVM on Fly.io that boots in a few
hundred milliseconds, executes the code, and is destroyed.

---

## How it works

```mermaid
flowchart LR
    User["Browser<br/>Monaco editor"] --> App["Next.js app"]
    App --> DB[("Postgres")]
    App --> Backend["Execution backend"]
    Backend --> Sprite["Ephemeral Sprite VM<br/>runs harness + user code"]
    Sprite -->|"JSON on stdout"| Backend
    Backend --> App
    App -->|"metrics + verdict"| User
```

A submission becomes an ephemeral VM ("Sprite") built from a purpose-built image that
contains the challenge harness. User code is injected, the harness drives it through a
deterministic workload while recording metrics, one JSON object is written to stdout, and
the machine is destroyed. The backend reads that JSON, scores it, and stores the result.

The execution layer sits behind a single interface with two implementations, so the whole
system runs locally against Docker without touching Fly.io or spending credits:

| `EXECUTION_MODE` | Backend | Used for |
|------------------|---------|----------|
| `local` | Local Docker daemon | Development and the entire test suite |
| `fly` | Fly.io Machines API | Production |

---

## Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Editor | Monaco |
| Database | PostgreSQL 16 via Prisma 7 |
| Auth | NextAuth v5, GitHub and Google OAuth |
| Sandbox | Fly.io Machines, Firecracker microVMs |
| Simulator | Go |
| Tests | Vitest, Playwright, `go test` |

---

## Running it

Requires Docker. Nothing else needs to be installed on the host.

```bash
cp .env.example .env.local     # then fill in OAuth credentials
npm run docker:up              # Postgres + web, hot reload enabled
npm run db:push                # create tables
npm run db:seed                # load challenges
```

The app is served at `http://localhost:3100`.

```bash
npm run docker:logs            # tail the web container
npm run docker:reset           # wipe volumes and rebuild from scratch
npm run docker:down            # stop everything
```

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
  ASSUMPTIONS.md every decision made without sign-off, and why
```

---

## Documentation

- [`docs/product.md`](docs/product.md) — what this is and who it is for
- [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md) — decisions taken without explicit
  sign-off, each with its rationale and the cost of reversing it
