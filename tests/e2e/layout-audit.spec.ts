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
  { path: "/challenges/ssd-ftl-gc", name: "arena" },
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
