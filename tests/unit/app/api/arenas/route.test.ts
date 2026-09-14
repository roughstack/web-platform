import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/arena/catalog", () => ({
  loadArenaCatalog: vi.fn(),
}));

import { GET } from "@/app/api/arenas/route";
import { loadArenaCatalog } from "@/lib/arena/catalog";

const loadArenaCatalogMock = vi.mocked(loadArenaCatalog);

describe("GET /api/arenas", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    loadArenaCatalogMock.mockReset();
  });

  it("returns the public catalog without caching", async () => {
    loadArenaCatalogMock.mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ arenas: [] });
  });

  it("does not expose internal errors or filesystem paths", async () => {
    const internalPath = "/srv/bytearena/private/registry.json";
    loadArenaCatalogMock.mockRejectedValue(
      new Error(`ENOENT: no such file or directory, open '${internalPath}'`),
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).not.toContain(internalPath);
    expect(JSON.parse(body)).toEqual({ error: "Arena catalog is unavailable" });
    expect(JSON.stringify(log.mock.calls)).not.toContain(internalPath);
  });
});
