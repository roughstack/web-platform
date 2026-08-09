"use client";

import {
  ChevronLeft,
  Columns2,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BlockRenderer } from "@/components/blocks/block-renderer";
import { Button } from "@/components/ui/button";
import { IconButton, Panel, PanelBody, PanelHeader, Tabs } from "@/components/ui/panel";
import { Split } from "@/components/ui/split";
import type { ContentBlock } from "@/lib/blocks/types";
import type { LanguageId } from "@/lib/languages";
import { LANGUAGES } from "@/lib/languages";
import { cn } from "@/lib/utils";

import { ConsolePanel } from "./console-panel";
import { DiscussionPanel } from "./discussion-panel";
import { CodeEditor } from "./editor";
import type { MetricDef, SubmissionResult, SubmissionState } from "./types";

export interface LadderRung {
  readonly slug: string;
  readonly title: string;
  readonly difficulty: "EASY" | "MEDIUM" | "HARD";
  readonly tier: number;
}

export interface ArenaProps {
  readonly slug: string;
  readonly title: string;
  readonly difficulty: "EASY" | "MEDIUM" | "HARD";
  /** Which sprite task grades this challenge. Selects the signature to show. */
  readonly task: string;
  readonly blocks: readonly ContentBlock[];
  readonly languages: readonly LanguageId[];
  readonly starterCode: Readonly<Record<string, string>>;
  readonly metrics: readonly MetricDef[];
  /** The other rungs of this ladder, for the difficulty switcher. */
  readonly ladder: readonly LadderRung[];
}

type LeftTab = "description" | "discussion" | "submissions";

const FONT_SIZES = [11, 12, 13, 14, 16, 18, 20] as const;
const DEFAULT_FONT_INDEX = 2;

const DIFFICULTY_STYLES: Record<ArenaProps["difficulty"], string> = {
  EASY: "text-signal",
  MEDIUM: "text-warning",
  HARD: "text-danger",
};

/**
 * The workspace.
 *
 * Everything is inside one viewport: no page scroll, no hunting for the editor.
 * The problem sits beside the code, the console sits under it, and every
 * boundary can be dragged. Focus mode collapses the problem away when you have
 * read enough and just want to write.
 */
export function Arena({
  slug,
  title,
  difficulty,
  task,
  blocks,
  languages,
  starterCode,
  metrics,
  ladder,
}: ArenaProps) {
  const [language, setLanguage] = useState<LanguageId>(languages[0] ?? "GO");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [leftTab, setLeftTab] = useState<LeftTab>("description");
  const [fontIndex, setFontIndex] = useState(DEFAULT_FONT_INDEX);
  const [focusMode, setFocusMode] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(true);

  const [state, setState] = useState<SubmissionState>("idle");
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasteWarning, setPasteWarning] = useState(false);

  const code = drafts[language] ?? starterCode[language] ?? "";
  const busy = state === "submitting" || state === "queued" || state === "running";

  // Drafts are restored per challenge and per language, so switching languages
  // to read another signature does not throw away work in progress.
  //
  // This has to happen after mount: localStorage does not exist on the server,
  // so reading it in an initialiser would make the first client paint disagree
  // with the server's and break hydration.
  useEffect(() => {
    const stored = window.localStorage.getItem(`ba.draft.${slug}`);
    if (!stored) return;
    try {
      const parsed: unknown = JSON.parse(stored);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see above: client-only state, restored once per challenge
      if (parsed && typeof parsed === "object") setDrafts(parsed as Record<string, string>);
    } catch {
      // A corrupt draft is not worth surfacing; the starter code is a fine
      // fallback and the next save overwrites it.
    }
  }, [slug]);

  const setCode = useCallback(
    (next: string) => {
      setDrafts((current) => {
        const updated = { ...current, [language]: next };
        window.localStorage.setItem(`ba.draft.${slug}`, JSON.stringify(updated));
        return updated;
      });
    },
    [language, slug],
  );

  const resetCode = useCallback(() => {
    setCode(starterCode[language] ?? "");
  }, [setCode, starterCode, language]);

  const submit = useCallback(async () => {
    setState("submitting");
    setError(null);
    setResult(null);
    setConsoleOpen(true);

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, code, language }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Submission failed (${response.status})`);
      }

      const { id } = (await response.json()) as { id: string };
      setState("queued");
      await pollForResult(id, { setState, setResult, setError });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
      setState("error");
    }
  }, [slug, code, language]);

  // Submitting from the keyboard is the difference between a tool and a form.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        if (!busy) void submit();
        return;
      }
      if (event.key === "Escape" && focusMode) setFocusMode(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, submit, focusMode]);

  const leftTabs = useMemo(
    () =>
      [
        { id: "description" as const, label: "Description" },
        { id: "discussion" as const, label: "Discussion" },
        { id: "submissions" as const, label: "Submissions" },
      ] satisfies { id: LeftTab; label: string }[],
    [],
  );

  const editorSide = (
    <Split
      direction="vertical"
      storageKey={`${slug}.console`}
      defaultSize={62}
      minSize={25}
      maxSize={85}
      collapse={consoleOpen ? undefined : "second"}
      label="Resize the editor and console"
      className="h-full"
      first={
        <Panel className="h-full border-l border-edge">
          <PanelHeader className="justify-between">
            <span className="truncate px-1 font-mono text-micro text-quiet">
              {LANGUAGES[language].filename}
            </span>
            <div className="flex items-center gap-0.5">
              <IconButton
                label="Smaller text"
                onClick={() => setFontIndex((i) => Math.max(0, i - 1))}
                disabled={fontIndex === 0}
              >
                <ZoomOut className="size-3.5" />
              </IconButton>
              <span className="w-8 text-center font-mono text-micro tabular-nums text-quiet">
                {FONT_SIZES[fontIndex]}
              </span>
              <IconButton
                label="Larger text"
                onClick={() => setFontIndex((i) => Math.min(FONT_SIZES.length - 1, i + 1))}
                disabled={fontIndex === FONT_SIZES.length - 1}
              >
                <ZoomIn className="size-3.5" />
              </IconButton>
              <span className="mx-1 h-4 w-px bg-edge" aria-hidden />
              <IconButton label="Reset to starter code" onClick={resetCode}>
                <RotateCcw className="size-3.5" />
              </IconButton>
              <IconButton
                label={consoleOpen ? "Hide console" : "Show console"}
                active={!consoleOpen}
                onClick={() => setConsoleOpen((open) => !open)}
              >
                <Columns2 className="size-3.5 rotate-90" />
              </IconButton>
              <IconButton
                label={focusMode ? "Exit focus mode" : "Focus mode"}
                active={focusMode}
                onClick={() => setFocusMode((on) => !on)}
              >
                {focusMode ? (
                  <Minimize2 className="size-3.5" />
                ) : (
                  <Maximize2 className="size-3.5" />
                )}
              </IconButton>
            </div>
          </PanelHeader>
          <div className="min-h-0 flex-1">
            <CodeEditor
              value={code}
              onChange={setCode}
              language={LANGUAGES[language].monaco}
              fontSize={FONT_SIZES[fontIndex]}
              onSuspiciousPaste={() => setPasteWarning(true)}
            />
          </div>
        </Panel>
      }
      second={
        <ConsolePanel
          state={state}
          result={result}
          error={error}
          metrics={metrics}
          task={task}
          className="border-l border-t border-edge"
        />
      }
    />
  );

  return (
    // dvh rather than vh so mobile browser chrome does not push the console
    // off the bottom of the screen.
    // The workspace layout owns the viewport, so the arena simply fills it.
    // It used to subtract a navbar height that the workspace no longer renders,
    // which quietly cost a whole toolbar's worth of vertical space.
    <div className="flex h-full flex-col overflow-hidden">
      <ArenaToolbar
        title={title}
        difficulty={difficulty}
        slug={slug}
        ladder={ladder}
        languages={languages}
        language={language}
        onLanguageChange={setLanguage}
        busy={busy}
        onSubmit={submit}
      />

      <Split
        direction="horizontal"
        storageKey={`${slug}.main`}
        defaultSize={42}
        minSize={22}
        maxSize={65}
        collapse={focusMode ? "first" : undefined}
        label="Resize the problem and editor panes"
        className="min-h-0 flex-1"
        first={
          <Panel className="h-full">
            <PanelHeader>
              <Tabs
                tabs={leftTabs}
                active={leftTab}
                onChange={setLeftTab}
                label="Problem panels"
              />
            </PanelHeader>
            <PanelBody>
              {leftTab === "description" && (
                <div className="px-5 py-5">
                  <BlockRenderer blocks={blocks} context={{ language, task }} />
                </div>
              )}
              {leftTab === "discussion" && <DiscussionPanel slug={slug} />}
              {leftTab === "submissions" && <SubmissionsTab slug={slug} />}
            </PanelBody>
          </Panel>
        }
        second={editorSide}
      />

      {pasteWarning && (
        <PasteNotice onDismiss={() => setPasteWarning(false)} />
      )}
    </div>
  );
}

// ----------------------------------------------------------------- toolbar

function ArenaToolbar({
  title,
  difficulty,
  slug,
  ladder,
  languages,
  language,
  onLanguageChange,
  busy,
  onSubmit,
}: {
  title: string;
  difficulty: ArenaProps["difficulty"];
  slug: string;
  ladder: readonly LadderRung[];
  languages: readonly LanguageId[];
  language: LanguageId;
  onLanguageChange: (id: LanguageId) => void;
  busy: boolean;
  onSubmit: () => void;
}) {
  return (
    <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-edge bg-canvas px-3 py-1.5 lg:h-11 lg:min-h-0 lg:flex-nowrap lg:py-0">
      <Link
        href="/challenges"
        className="inline-flex size-11 items-center justify-center gap-1 rounded-6 text-mini text-quiet transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent lg:size-auto lg:justify-start lg:px-1.5 lg:py-1"
      >
        <ChevronLeft className="size-3.5" aria-hidden />
        <span className="hidden sm:inline">Challenges</span>
      </Link>

      <span className="h-4 w-px shrink-0 bg-edge" aria-hidden />

      <h1 className="min-w-0 truncate text-mini font-medium text-ink">{title}</h1>
      <span
        className={cn(
          "hidden shrink-0 text-micro font-medium uppercase tracking-wide sm:inline",
          DIFFICULTY_STYLES[difficulty],
        )}
      >
        {difficulty.toLowerCase()}
      </span>

      {ladder.length > 1 && <LadderSwitcher ladder={ladder} current={slug} />}

      <div className="ml-auto flex items-center gap-2">
        <label className="sr-only" htmlFor="arena-language">
          Language
        </label>
        <select
          id="arena-language"
          value={language}
          onChange={(event) => onLanguageChange(event.target.value as LanguageId)}
          className="h-11 rounded-6 border border-edge bg-tint px-2 text-mini text-body transition-colors hover:border-edge-strong focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent lg:h-7"
        >
          {languages.map((id) => (
            <option key={id} value={id}>
              {LANGUAGES[id].label}
            </option>
          ))}
        </select>

        <Button onClick={onSubmit} disabled={busy} loading={busy} size="sm" className="shrink-0">
          {busy ? "Running…" : (
            <>
              <Play className="size-3.5" aria-hidden />
              Submit
            </>
          )}
        </Button>
      </div>
    </header>
  );
}

/**
 * The three rungs of the ladder, as a switcher.
 *
 * Putting them in the toolbar rather than on the listing page is the point: the
 * ladder is one idea at three depths, so stepping down a rung when you are
 * stuck should be one click from where you are stuck.
 */
function LadderSwitcher({
  ladder,
  current,
}: {
  ladder: readonly LadderRung[];
  current: string;
}) {
  return (
    <nav
      aria-label="Difficulty"
      className="hidden shrink-0 items-center gap-0.5 rounded-6 border border-edge bg-tint p-0.5 md:flex"
    >
      {[...ladder]
        .sort((a, b) => a.tier - b.tier)
        .map((rung) => {
          const active = rung.slug === current;
          return (
            <Link
              key={rung.slug}
              href={`/challenges/${rung.slug}`}
              aria-current={active ? "page" : undefined}
              title={rung.title}
              className={cn(
                "inline-flex min-h-11 min-w-11 items-center justify-center rounded-4 px-3 text-micro capitalize transition-colors lg:min-h-0 lg:min-w-0 lg:px-2 lg:py-1",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
                active
                  ? cn("bg-white/[0.09] font-medium", DIFFICULTY_STYLES[rung.difficulty])
                  : "text-quiet hover:text-body",
              )}
            >
              {rung.difficulty.toLowerCase()}
            </Link>
          );
        })}
    </nav>
  );
}

// ------------------------------------------------------------------ pieces

function SubmissionsTab({ slug }: { slug: string }) {
  return (
    <div className="px-5 py-8 text-center">
      <p className="text-mini text-quiet">
        Your attempts at this challenge appear here once you have submitted one.
      </p>
      <Link
        href={`/dashboard?challenge=${slug}`}
        className="mt-2 inline-block text-mini text-link underline-offset-4 hover:underline"
      >
        Open the full history
      </Link>
    </div>
  );
}

function PasteNotice({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="pointer-events-auto fixed bottom-4 left-1/2 z-50 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-8 border border-warning/40 bg-surface px-4 py-2.5 shadow-lg"
    >
      <div className="flex items-center gap-3">
        <p className="text-mini text-body">
          <span className="font-medium text-warning">Large paste detected.</span> Working through
          it yourself is where the learning is.
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-4 px-1.5 py-0.5 text-micro text-quiet transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ polling

async function pollForResult(
  id: string,
  handlers: {
    setState: (state: SubmissionState) => void;
    setResult: (result: SubmissionResult) => void;
    setError: (error: string) => void;
  },
) {
  const maxAttempts = 60;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      const response = await fetch(`/api/submissions/${id}`);
      if (!response.ok) continue;

      const data = (await response.json()) as {
        status: string;
        result?: SubmissionResult;
        error?: string;
      };

      if (data.status === "running") {
        handlers.setState("running");
        continue;
      }
      if (data.status === "done" && data.result) {
        handlers.setResult(data.result);
        handlers.setState("done");
        return;
      }
      if (data.status === "error") {
        handlers.setError(data.error ?? "The run failed");
        handlers.setState("error");
        return;
      }
    } catch {
      // A dropped request mid-run is not worth surfacing; keep polling.
    }
  }

  handlers.setError("Timed out waiting for a result");
  handlers.setState("error");
}
