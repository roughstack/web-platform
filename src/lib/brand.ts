// The web label is independent of the Roughstack organization and the symbol.
// NEXT_PUBLIC is intentional: the same value is used in server metadata and
// client navigation. Changing it requires a rebuild, not a repository rename.
export const ORGANIZATION_NAME = "Roughstack";
export const PRODUCT_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME?.trim() || "Rivets";
export const PRODUCT_TAGLINE = "Systems engineering challenges that actually run.";
export const PRODUCT_DESCRIPTION =
  "Write and execute real code for low-level systems problems. Build storage engines, schedulers, caches, and resilient services, then measure how they behave under realistic workloads.";
