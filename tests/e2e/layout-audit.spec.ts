import { test } from "@playwright/test";
import { VIEWPORTS } from "./helpers/viewports";
import { certifyRoute } from "./helpers/certify";

/**
 * Every route listed here is certified at every viewport before a phase is
 * considered done. Adding a route to this list is part of building it.
 */
const ROUTES = [
  { path: "/", name: "landing" },
  { path: "/challenges", name: "challenges" },
  // All three rungs, because they render different illustrations and the
  // hard one carries the most content in the description panel.
  { path: "/challenges/compaction", name: "arena-easy" },
  { path: "/challenges/victim-selection", name: "arena-medium" },
  { path: "/challenges/wear-levelling", name: "arena-hard" },
  // External statements exercise the generic systems diagrams and the
  // materialization boundary rather than the seeded SSD pack.
  { path: "/challenges/cache-pressure-easy", name: "arena-public" },
  { path: "/dashboard", name: "dashboard" },
  { path: "/leaderboard", name: "leaderboard" },
];

for (const route of ROUTES) {
  test.describe(`layout: ${route.name}`, () => {
    for (const viewport of VIEWPORTS) {
      test(`${route.name} at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
        page,
      }) => {
        await certifyRoute(page, {
          route: route.path,
          name: route.name,
          viewport,
        });
      });
    }
  });
}
