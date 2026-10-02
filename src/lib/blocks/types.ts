/**
 * The typed content model for problem statements.
 *
 * A statement is an array of blocks rather than a markdown blob. One renderer
 * draws any array, so adding a challenge in an existing domain is data rather
 * than a new page.
 *
 * The union is split in two on purpose. Core kinds are closed, so the renderer
 * can switch over them exhaustively and adding one is a compile error until it
 * is handled everywhere. Pack kinds are open, because ByteArena will span SSDs,
 * LSM trees, write-ahead logs and distributed systems, and a fixed taxonomy
 * would be wrong by the second domain.
 */

/** Which illustration to draw, and what to draw it with. */
export interface IllustrationSpec {
  /** Registry id, for example "ssd.blockGrid". */
  readonly id: string;
  /** Passed straight to the component. Shape is the illustration's business. */
  readonly props?: Readonly<Record<string, unknown>>;
}

export type CalloutTone = "note" | "warn" | "insight";

/** A numbered step in a walkthrough. */
export interface StepItem {
  readonly title: string;
  readonly md: string;
}

/**
 * Blocks every domain can use. Closed on purpose: the renderer switches over
 * this union with a `never` default.
 */
export type CoreBlock =
  | { readonly kind: "prose"; readonly md: string }
  | {
      readonly kind: "callout";
      readonly tone: CalloutTone;
      readonly title?: string;
      readonly md: string;
    }
  | {
      readonly kind: "figure";
      readonly illustration: IllustrationSpec;
      readonly caption?: string;
      /** Short label such as "FIG 1.2". */
      readonly label?: string;
    }
  | {
      readonly kind: "example";
      readonly input: string;
      readonly output: string;
      readonly explain?: string;
    }
  | {
      readonly kind: "code";
      readonly code: string;
      readonly label?: string;
      readonly language?: string;
    }
  | { readonly kind: "constraints"; readonly items: readonly string[] }
  /**
   * Renders the signature for whichever language the reader has selected. This
   * is what keeps a statement genuinely language-agnostic instead of being one
   * language's docs with footnotes about the others.
   */
  | { readonly kind: "interface" }
  | { readonly kind: "steps"; readonly items: readonly StepItem[] };

/**
 * The escape hatch. A pack registers a renderer under its own key, so a domain
 * can ship whatever bespoke component it needs without the core knowing.
 */
export interface PackBlock {
  readonly kind: `pack:${string}`;
  readonly props?: unknown;
}

export type ContentBlock = CoreBlock | PackBlock;

/** Narrows a block to the open half of the union. */
export function isPackBlock(block: ContentBlock): block is PackBlock {
  return block.kind.startsWith("pack:");
}

/**
 * Validates data coming from the database, which is typed as `Json` and so is
 * `unknown` in practice. Anything unrecognised is dropped rather than thrown,
 * because one bad block should cost a paragraph, not the whole page.
 */
export function parseBlocks(value: unknown): ContentBlock[] {
  if (!Array.isArray(value)) return [];

  return value.filter((entry): entry is ContentBlock => {
    if (typeof entry !== "object" || entry === null) return false;
    const kind = (entry as { kind?: unknown }).kind;
    return typeof kind === "string" && kind.length > 0;
  });
}
