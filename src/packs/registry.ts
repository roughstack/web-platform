/**
 * The seam between the core renderer and the domain packs.
 *
 * A pack is one subject area — SSD internals today, LSM trees and write-ahead
 * logs later. It registers the illustrations and bespoke block kinds it
 * contributes, and the core renders them without ever learning what they are.
 *
 * This mirrors the task registry in the sprite: a stable core, extension at a
 * declared seam, and a new domain added by writing a folder rather than by
 * editing a switch statement.
 */

import type { ComponentType } from "react";

/**
 * An illustration receives whatever props its pack put in the content block.
 *
 * Those props come out of a `Json` column, so at this seam they are genuinely
 * unknown and no narrower type would be honest. Each illustration declares its
 * own props and validates what it needs; the registry only stores them.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IllustrationComponent = ComponentType<any>;

/** A pack block receives the untyped props from the content array. */
export type PackBlockComponent = ComponentType<{ readonly props: unknown }>;

const illustrations = new Map<string, IllustrationComponent>();
const packBlocks = new Map<string, PackBlockComponent>();
const interfaces = new Map<string, string>();

/**
 * Registers an illustration under a namespaced id such as "ssd.blockGrid".
 *
 * Re-registration replaces rather than throws, because Next's development
 * server re-executes modules on hot reload and a throw would turn every edit
 * into a restart.
 */
export function registerIllustration(id: string, component: IllustrationComponent): void {
  illustrations.set(id, component);
}

/** Registers a bespoke block kind. The key includes the "pack:" prefix. */
export function registerPackBlock(kind: `pack:${string}`, component: PackBlockComponent): void {
  packBlocks.set(kind, component);
}

export function getIllustration(id: string): IllustrationComponent | undefined {
  return illustrations.get(id);
}

export function getPackBlock(kind: string): PackBlockComponent | undefined {
  return packBlocks.get(kind);
}

/**
 * Registers the signature a solution must implement, for one task in one
 * language.
 *
 * This is what lets a problem statement stay language-agnostic: the `interface`
 * block looks the snippet up for whichever language the reader has selected, so
 * the statement always shows the code they are about to write rather than one
 * language's docs with footnotes about the rest.
 */
export function registerInterface(task: string, language: string, snippet: string): void {
  interfaces.set(`${task}:${language}`, snippet);
}

export function getInterface(task: string, language: string): string | undefined {
  return interfaces.get(`${task}:${language}`);
}

/** Every registered illustration id, for diagnostics and tests. */
export function registeredIllustrations(): string[] {
  return [...illustrations.keys()].sort();
}

/** Every registered pack block kind, for diagnostics and tests. */
export function registeredPackBlocks(): string[] {
  return [...packBlocks.keys()].sort();
}
