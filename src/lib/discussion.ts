/**
 * Rules for replies on a problem statement.
 *
 * The intent is discussion of the idea, not distribution of solutions. Three
 * constraints do most of the work: a hard length cap, a refusal to accept code,
 * and a spoiler flag for anything that gives the game away.
 *
 * The checks live here rather than in the route so the editor can apply exactly
 * the same rules while someone types. Being told why a reply is rejected before
 * pressing post is the difference between a guardrail and a wall.
 */

/** Replies are short by design. Enough for an idea, not enough for a solution. */
export const MAX_REPLY_LENGTH = 600;

/** Below this a reply is almost always noise rather than a contribution. */
export const MIN_REPLY_LENGTH = 8;

export type RejectionReason = "too-short" | "too-long" | "code-block" | "looks-like-code";

export interface ValidationResult {
  readonly ok: boolean;
  readonly reason?: RejectionReason;
  /** Something to show the author, written for them rather than about them. */
  readonly message?: string;
}

const OK: ValidationResult = { ok: true };

/**
 * Tokens that suggest source code rather than a sentence about source code.
 *
 * Any one of these can appear innocently — "you want to return the block with
 * the fewest valid pages" is a fine sentence. It takes several, spread over
 * more than one line, before something is a snippet rather than a thought.
 */
const CODE_SIGNALS: readonly RegExp[] = [
  /\bfunc\s+\w*\s*\(/,
  /\bdef\s+\w+\s*\(/,
  /\bfn\s+\w+\s*\(/,
  /\bclass\s+\w+/,
  /\b(public|private|static)\s+\w+\s+\w+\s*\(/,
  /\bfor\s*\(.+;.+;/,
  /\bwhile\s*\(/,
  /\bif\s*\(.+\)\s*\{/,
  /=>\s*\{/,
  /\breturn\b.*;/,
  /\bimport\s+[\w."<]/,
  /^\s*[}\])];?\s*$/m,
  /\b\w+\s*:=\s*/,
  /\b(int|char|float|double|void|bool)\s+\w+\s*[=;(]/,
];

const FENCED_BLOCK = /(^|\n)\s*(```|~~~)/;

/** Two or more consecutive lines indented like a code block. */
const INDENTED_BLOCK = /(^|\n)[ \t]{4,}\S.*\n[ \t]{4,}\S/;

export function validateReply(body: string): ValidationResult {
  const trimmed = body.trim();

  if (trimmed.length < MIN_REPLY_LENGTH) {
    return {
      ok: false,
      reason: "too-short",
      message: `Say a little more. Use at least ${MIN_REPLY_LENGTH} characters.`,
    };
  }

  if (trimmed.length > MAX_REPLY_LENGTH) {
    return {
      ok: false,
      reason: "too-long",
      message: `Replies are capped at ${MAX_REPLY_LENGTH} characters. Yours is ${trimmed.length}.`,
    };
  }

  if (FENCED_BLOCK.test(trimmed)) {
    return {
      ok: false,
      reason: "code-block",
      message: "Code blocks are not allowed here. Describe the idea instead.",
    };
  }

  if (INDENTED_BLOCK.test(trimmed)) {
    return {
      ok: false,
      reason: "code-block",
      message: "That looks like a pasted code block. Describe the idea instead.",
    };
  }

  const lines = trimmed.split("\n").filter((line) => line.trim().length > 0);
  const signals = CODE_SIGNALS.filter((pattern) => pattern.test(trimmed)).length;

  // One signal on one line is someone naming a construct. Several across
  // several lines is a snippet wearing a disguise.
  if (signals >= 3 && lines.length >= 2) {
    return {
      ok: false,
      reason: "looks-like-code",
      message: "That reads like source code. Explain the approach in prose instead.",
    };
  }

  return OK;
}

/**
 * A stable, non-identifying handle for a session.
 *
 * Threads read better when replies have a name attached, but nobody has signed
 * in, so the handle is derived from the session id. The same visitor keeps the
 * same handle on a challenge, and it reveals nothing.
 */
export function authorLabelFor(sessionId: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < sessionId.length; i++) {
    hash ^= sessionId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `anon-${(hash >>> 0).toString(16).slice(0, 4)}`;
}
