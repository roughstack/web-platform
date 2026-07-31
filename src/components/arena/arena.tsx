"use client";

import { useState, useCallback } from "react";
import { CodeEditor as Editor } from "./editor";
import { ResultsPanel } from "./results-panel";
import { Button } from "@/components/ui/button";
import { Play, Loader2, FileText, Code2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetricDef {
  key: string;
  label: string;
  unit: string;
  description: string;
  lowerIsBetter: boolean;
  weight: number;
}

export interface ScoringDef {
  type: string;
  referenceSolution: string;
  passThreshold: number;
}

export interface ArenaProps {
  slug: string;
  description: string;
  interfaceDoc: string;
  starterCode: string;
  language: string;
  metrics: MetricDef[];
  scoring: ScoringDef;
}

type Tab = "problem" | "interface";
type SubmissionState = "idle" | "submitting" | "queued" | "running" | "done" | "error";

export interface SubmissionResult {
  status: "passed" | "failed" | "error";
  score: number;
  metrics: Record<string, number>;
  message?: string;
  finalState?: BlockState[];
  adversarial?: AdversarialResult;
}

export interface BlockState {
  index: number;
  valid: number;
  invalid: number;
  free: number;
  eraseCount: number;
  isOverProvision: boolean;
}

export interface ScenarioResult {
  name: string;
  passed: boolean;
  error?: string;
  metrics?: Record<string, number>;
}

export interface AdversarialResult {
  passed: boolean;
  scenarios: ScenarioResult[];
}

export function Arena({
  slug,
  description,
  interfaceDoc,
  starterCode,
  language,
  metrics,
  scoring,
}: ArenaProps) {
  const [code, setCode] = useState(starterCode);
  const [tab, setTab] = useState<Tab>("problem");
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>("idle");
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasteWarning, setPasteWarning] = useState(false);

  const handleSubmit = useCallback(async () => {
    setSubmissionState("submitting");
    setError(null);
    setResult(null);
    setPasteWarning(false);

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, code, language }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Submission failed (${res.status})`);
      }

      const data = (await res.json()) as { id: string };
      setSubmissionId(data.id);
      setSubmissionState("queued");

      pollForResult(data.id, setSubmissionState, setResult, setError);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setSubmissionState("error");
    }
  }, [slug, code, language]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr] xl:grid-cols-[1fr_1.5fr]">
      {/* Left: problem description / interface */}
      <div className="flex flex-col overflow-hidden rounded-lg border border-edge bg-surface">
        <div className="flex border-b border-edge">
          <TabButton
            active={tab === "problem"}
            onClick={() => setTab("problem")}
            icon={<FileText className="h-3.5 w-3.5" />}
            label="Problem"
          />
          <TabButton
            active={tab === "interface"}
            onClick={() => setTab("interface")}
            icon={<Code2 className="h-3.5 w-3.5" />}
            label="Interface"
          />
        </div>
        {/* On mobile the description flows naturally with the page; on lg+
            screens it gets its own scroll region so the editor stays visible. */}
        <div className="overflow-y-auto p-5 lg:max-h-[70vh]">
          {tab === "problem" ? (
            <div
              className="prose prose-invert max-w-none prose-headings:text-ink prose-p:text-ink-secondary prose-strong:text-ink prose-code:rounded prose-code:bg-elevated prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-sm prose-code:text-signal prose-pre:rounded prose-pre:border prose-pre:border-edge prose-pre:bg-canvas"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(description) }}
            />
          ) : (
            <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-ink-secondary">
              {interfaceDoc}
            </pre>
          )}
        </div>
      </div>

      {/* Right: editor + submit + results */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col overflow-hidden rounded-lg border border-edge bg-surface">
          <div className="flex items-center justify-between border-b border-edge px-4 py-2.5">
            <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
              {language.toLowerCase()} · solution.go
            </span>
            <Button
              onClick={handleSubmit}
              disabled={submissionState === "submitting" || submissionState === "queued" || submissionState === "running"}
              loading={submissionState === "submitting"}
              size="md"
              className="px-3"
            >
              {submissionState === "submitting" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5" />
                  Submitting…
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Submit
                </>
              )}
            </Button>
          </div>
          <Editor
            value={code}
            onChange={setCode}
            language={language === "GO" ? "go" : "plaintext"}
            onSuspiciousPaste={() => setPasteWarning(true)}
          />
        </div>

        <ResultsPanel
          state={submissionState}
          result={result}
          error={error}
          metrics={metrics}
          scoring={scoring}
          submissionId={submissionId}
        />
      </div>

      {pasteWarning && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-warning/40 bg-surface px-4 py-2.5 shadow-lg">
          <p className="text-xs text-ink-secondary">
            <span className="font-medium text-warning">Paste detected.</span>{" "}
            Large pastes are flagged. Type your solution for the best
            experience.
          </p>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 px-4 text-xs font-medium transition-colors",
        active
          ? "border-b-2 border-signal text-ink"
          : "text-ink-muted hover:text-ink",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

async function pollForResult(
  id: string,
  setState: (s: SubmissionState) => void,
  setResult: (r: SubmissionResult) => void,
  setError: (e: string) => void,
) {
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch(`/api/submissions/${id}`);
      if (!res.ok) continue;
      const data = (await res.json()) as {
        status: string;
        result?: SubmissionResult;
        error?: string;
      };
      if (data.status === "running") {
        setState("running");
        continue;
      }
      if (data.status === "done" && data.result) {
        setResult(data.result);
        setState("done");
        return;
      }
      if (data.status === "error") {
        setError(data.error ?? "Execution failed");
        setState("error");
        return;
      }    } catch {
      // network hiccup; keep polling
    }
  }
  setError("Timed out waiting for result");
  setState("error");
}

// Minimal markdown renderer for the challenge description. Handles headings,
// paragraphs, code blocks, inline code, bold, and lists. The description is
// authored content (not user input), so this is safe enough for the MVP.
// A proper renderer can replace this later.
function renderMarkdown(md: string): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const lines = md.split("\n");
  let html = "";
  let inCode = false;
  let codeLang = "";
  let codeBuf = "";
  let inList = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        html += `<pre><code>${escape(codeBuf)}</code></pre>`;
        inCode = false;
        codeBuf = "";
      } else {
        inCode = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }
    if (inCode) {
      codeBuf += line + "\n";
      continue;
    }
    if (line.startsWith("### ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h3>${escape(line.slice(4))}</h3>`;
      continue;
    }
    if (line.startsWith("## ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h2>${escape(line.slice(3))}</h2>`;
      continue;
    }
    if (line.startsWith("# ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h1>${escape(line.slice(2))}</h1>`;
      continue;
    }
    if (line.startsWith("- ")) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inlineMd(line.slice(2))}</li>`;
      continue;
    }
    if (line.trim() === "") {
      if (inList) { html += "</ul>"; inList = false; }
      continue;
    }
    if (inList) { html += "</ul>"; inList = false; }
    html += `<p>${inlineMd(line)}</p>`;
  }
  if (inList) html += "</ul>";
  if (inCode) html += `<pre><code>${escape(codeBuf)}</code></pre>`;
  return html;

  function inlineMd(s: string): string {
    return escape(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  }
}
