import { config } from "dotenv";
import type { Language, Difficulty } from "@prisma/client";
import { createRequire } from "node:module";

// tsx does not load .env.local automatically (only the Prisma CLI does, via
// prisma.config.ts). Load it BEFORE importing db.ts, which reads DATABASE_URL
// at module-evaluation time. A static import would be hoisted above this call,
// so db is required dynamically after the env is in place. Top-level await is
// not supported in the CJS output format tsx uses, so require() is used.
config({ path: [".env.local", ".env"], quiet: true });

const require = createRequire(import.meta.url);
const { prisma } = require("@/lib/db") as typeof import("@/lib/db");

const SSD_FTL_METRICS = {
  metrics: [
    {
      key: "write_amplification",
      label: "Write Amplification",
      unit: "ratio",
      description:
        "Total physical page writes divided by host-requested writes. 1.0 is perfect; higher means the device is doing extra work to move data around.",
      lowerIsBetter: true,
      weight: 0.4,
    },
    {
      key: "block_erases",
      label: "Block Erases",
      unit: "count",
      description:
        "Total erase operations. Each erase wears the block, so fewer erases means a longer device lifetime.",
      lowerIsBetter: true,
      weight: 0.2,
    },
    {
      key: "wear_spread",
      label: "Wear Spread",
      unit: "stddev",
      description:
        "Standard deviation of per-block erase counts. Low means wear is levelled evenly; high means some blocks are burning out while others sit idle.",
      lowerIsBetter: true,
      weight: 0.2,
    },
    {
      key: "gc_writes",
      label: "GC Writes",
      unit: "count",
      description:
        "Physical page writes caused by garbage collection (migrating valid pages out of victim blocks). This is the overhead the policy creates.",
      lowerIsBetter: true,
      weight: 0.2,
    },
  ],
  scoring: {
    // The score is a weighted sum of metric ratios against the reference
    // solution. 100 means matching the reference; above 100 means beating it.
    type: "weighted_ratio",
    referenceSolution: "greedy",
    passThreshold: 60,
  },
};

const SSD_FTL_STARTER_GO = `// Package solution implements a flash translation layer policy.
//
// Your task: decide which block to reclaim when the device runs out of free
// space. The harness calls Reclaim when it needs space; you choose the
// victim, move any live pages out of it, and return its index.
package solution

import (
	"github.com/bytearena/sprite/ftl"
)

// Policy implements the ftl.Policy interface.
type Policy struct{}

func (Policy) Name() string { return "your-name" }

// Reclaim is called when the device needs free space. You must:
//  1. Choose a block to reclaim (from stats.Blocks).
//  2. Migrate every valid page in that block using d.MigratePage.
//  3. Return the block index so the harness can erase it.
//
// A good starting point: pick the block with the most invalid pages
// (greedy). Then think about wear levelling and hot/cold separation.
func (Policy) Reclaim(d *ftl.Device, stats ftl.DeviceStats) (int, error) {
	// TODO: implement your victim-selection policy
	return 0, nil
}

// New is called once at the start of each run.
func New() ftl.Policy { return Policy{} }
`;

const SSD_FTL_INTERFACE = `// The interface your solution implements.
//
// type Policy interface {
//     Name() string
//     Reclaim(d *ftl.Device, stats ftl.DeviceStats) (blockToErase int, err error)
// }
//
// DeviceStats contains:
//   Blocks        []BlockStat  // one per block, including over-provision
//   PagesPerBlock int
//   TotalErases   int
//   FreePages     int
//   ValidPages    int
//   InvalidPages  int
//
// BlockStat contains:
//   Index           int
//   Valid           int   // pages holding live data
//   Invalid         int   // pages holding dead data (garbage to reclaim)
//   Free            int   // pages available for new writes
//   EraseCount      int   // how many times this block has been erased
//   IsOverProvision bool  // true for reserved GC blocks
//
// Device methods available to your policy:
//   d.MigratePage(ppn int) error    // move a valid page elsewhere
//   d.ValidPagesIn(blockIdx int) []int  // list valid pages in a block
//   d.EraseCount(blockIdx int) int
//   d.BlockValidPages(blockIdx int) int
//   d.BlockInvalidPages(blockIdx int) int
//   d.BlockFreePages(blockIdx int) int`;

const SSD_FTL_DESCRIPTION = `## The problem

NAND flash cannot overwrite a page in place. To rewrite a logical page, the device writes the new data to a fresh physical page and marks the old one **invalid**. Space is only reclaimed by erasing an entire block — but a block can only be erased when every page in it is either free or invalid. If a block still holds valid pages, those pages must be migrated elsewhere first.

This is the **garbage collection** problem at the heart of every flash translation layer. Your policy decides which block to reclaim and how to move the live data, and it is scored on the cost of those decisions.

## What you implement

You implement a \`Policy\` with a single method: \`Reclaim\`. The harness owns the device and the workload. When it runs out of free space, it calls your \`Reclaim\` method, handing you a read-only snapshot of the device state and the device itself. You choose a victim block, migrate its valid pages using \`d.MigratePage\`, and return the block index. The harness erases the block and continues.

## What you are scored on

- **Write amplification** — total physical writes divided by host writes. Every page you migrate is a physical write the host never asked for. Lower is better; 1.0 is perfect.
- **Block erases** — each erase wears the block. Fewer erases means a longer-lived device.
- **Wear spread** — the standard deviation of per-block erase counts. If you always erase the same block, it dies young. A good policy levels wear across the device.
- **GC writes** — the total number of page migrations. This is the overhead your policy creates.

## The workload

You face a deterministic, seeded workload of logical page writes. The workload has a hot set (20% of pages receive 80% of writes), which means a naive greedy policy will keep migrating cold data pointlessly. A good policy recognises the hot set and leaves it alone.

## The adversarial layer

After the standard workload, the harness injects faults:
- **Power loss mid-migration.** Your policy is interrupted while migrating pages. On recovery, the device must be consistent.
- **Capacity pressure.** The workload fills the device to its absolute limit, leaving no room for suboptimal decisions.
- **Hot-page thrash.** A single page is rewritten thousands of times, punishing policies that migrate it.

Your solution must remain correct under all three. A solution that scores well on the standard workload but corrupts data under fault injection fails.

## Getting started

Start with the greedy baseline: always reclaim the block with the most invalid pages. Then think about:
1. **Wear levelling.** Greedy burns out hot blocks. Can you spread erases evenly?
2. **Hot/cold separation.** Migrating cold data is cheap; migrating hot data is expensive. Can you tell them apart?
3. **Cost-benefit.** Rosenblum and Ousterhout's LFS paper (1991) defines a cost-benefit ratio for victim selection. Can you beat greedy with it?
`;

async function main() {
  const challenge = await prisma.challenge.upsert({
    where: { slug: "ssd-ftl-gc" },
    update: {
      title: "Flash Translation Layer: Garbage Collection",
      summary:
        "Implement the victim-selection and page-migration policy for a simulated NAND flash device. Scored on write amplification, erase count, and wear evenness.",
      description: SSD_FTL_DESCRIPTION,
      difficulty: "ADVANCED" as Difficulty,
      category: "Storage",
      languages: ["GO" as Language],
      starterCode: { GO: SSD_FTL_STARTER_GO },
      interfaceDoc: SSD_FTL_INTERFACE,
      timeLimitSec: 30,
      memoryLimitMb: 512,
      metricsConfig: SSD_FTL_METRICS,
      referenceMetrics: {
        write_amplification: 1.45,
        block_erases: 380,
        wear_spread: 3.2,
        gc_writes: 720,
      },
      sortOrder: 0,
      isPublished: true,
    },
    create: {
      slug: "ssd-ftl-gc",
      title: "Flash Translation Layer: Garbage Collection",
      summary:
        "Implement the victim-selection and page-migration policy for a simulated NAND flash device. Scored on write amplification, erase count, and wear evenness.",
      description: SSD_FTL_DESCRIPTION,
      difficulty: "ADVANCED" as Difficulty,
      category: "Storage",
      languages: ["GO" as Language],
      starterCode: { GO: SSD_FTL_STARTER_GO },
      interfaceDoc: SSD_FTL_INTERFACE,
      timeLimitSec: 30,
      memoryLimitMb: 512,
      metricsConfig: SSD_FTL_METRICS,
      referenceMetrics: {
        write_amplification: 1.45,
        block_erases: 380,
        wear_spread: 3.2,
        gc_writes: 720,
      },
      sortOrder: 0,
      isPublished: true,
    },
  });

  console.log(`Seeded challenge: ${challenge.slug} (${challenge.title})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
