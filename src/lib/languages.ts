/**
 * The languages a solution can be written in.
 *
 * Kept in one place because four separate things need to agree: the Prisma
 * enum, the Monaco editor's syntax mode, the filename the sprite writes the
 * source to, and the label a human reads. Deriving them from one table means
 * adding a language is one entry rather than four edits in four files.
 */

export const LANGUAGE_IDS = ["GO", "PYTHON", "C", "CPP", "JAVA", "RUST"] as const;

export type LanguageId = (typeof LANGUAGE_IDS)[number];

export interface LanguageInfo {
  readonly id: LanguageId;
  /** What a human calls it. */
  readonly label: string;
  /** Monaco's identifier for the syntax mode. */
  readonly monaco: string;
  /** The file the sprite writes a submission to before building it. */
  readonly filename: string;
  /** How a single-line comment starts, used when stubbing starter code. */
  readonly lineComment: string;
  /** Whether the sprite has to compile before it can run. */
  readonly compiled: boolean;
}

export const LANGUAGES: Readonly<Record<LanguageId, LanguageInfo>> = {
  GO: {
    id: "GO",
    label: "Go",
    monaco: "go",
    filename: "solution.go",
    lineComment: "//",
    compiled: true,
  },
  PYTHON: {
    id: "PYTHON",
    label: "Python",
    monaco: "python",
    filename: "solution.py",
    lineComment: "#",
    compiled: false,
  },
  C: {
    id: "C",
    label: "C",
    monaco: "c",
    filename: "solution.c",
    lineComment: "//",
    compiled: true,
  },
  CPP: {
    id: "CPP",
    label: "C++",
    monaco: "cpp",
    filename: "solution.cpp",
    lineComment: "//",
    compiled: true,
  },
  JAVA: {
    id: "JAVA",
    label: "Java",
    monaco: "java",
    // The public class has to match the filename, so every Java submission is
    // named Solution and the starter code declares `class Solution`.
    filename: "Solution.java",
    lineComment: "//",
    compiled: true,
  },
  RUST: {
    id: "RUST",
    label: "Rust",
    monaco: "rust",
    filename: "solution.rs",
    lineComment: "//",
    compiled: true,
  },
};

/** Narrows an arbitrary string, for values arriving from the database or a URL. */
export function isLanguageId(value: unknown): value is LanguageId {
  return typeof value === "string" && (LANGUAGE_IDS as readonly string[]).includes(value);
}

/** Orders a challenge's languages the way the picker should list them. */
export function orderLanguages(ids: readonly string[]): LanguageId[] {
  const available = new Set(ids.filter(isLanguageId));
  return LANGUAGE_IDS.filter((id) => available.has(id));
}
