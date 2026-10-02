"use client";

import { AlertTriangle, Info, Lightbulb } from "lucide-react";
import { createElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { CalloutTone, ContentBlock, CoreBlock, IllustrationSpec } from "@/lib/blocks/types";
import { isPackBlock } from "@/lib/blocks/types";
import type { LanguageId } from "@/lib/languages";
import { LANGUAGES } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { getIllustration, getInterface, getPackBlock } from "@/packs";

/**
 * Draws a problem statement.
 *
 * Resolution happens in two steps, which is what buys both safety and
 * extensibility. Pack kinds go through the registry, and an unregistered one
 * renders a quiet placeholder rather than taking the page down. Core kinds take
 * an exhaustive switch, so adding one is a compile error until it is handled.
 */

export interface BlockContext {
  /** Which language the reader has selected. The `interface` block follows it. */
  readonly language: LanguageId;
  /** Which sprite task grades this challenge, used to look up signatures. */
  readonly task: string;
}

export interface BlockRendererProps {
  readonly blocks: readonly ContentBlock[];
  readonly context: BlockContext;
  readonly className?: string;
}

export function BlockRenderer({ blocks, context, className }: BlockRendererProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} context={context} />
      ))}
    </div>
  );
}

function BlockView({ block, context }: { block: ContentBlock; context: BlockContext }) {
  if (isPackBlock(block)) {
    // Resolved from the registry rather than written as JSX, because the
    // component is chosen at runtime by a string from the database.
    const packBlock = getPackBlock(block.kind);
    if (!packBlock) return <UnknownBlock kind={block.kind} />;
    return createElement(packBlock, { props: block.props });
  }

  return renderCore(block, context);
}

function renderCore(block: CoreBlock, context: BlockContext) {
  switch (block.kind) {
    case "prose":
      return <Prose md={block.md} />;

    case "callout":
      return (
        <Callout tone={block.tone} title={block.title}>
          <Prose md={block.md} />
        </Callout>
      );

    case "figure":
      return (
        <Figure illustration={block.illustration} caption={block.caption} label={block.label} />
      );

    case "example":
      return <Example input={block.input} output={block.output} explain={block.explain} />;

    case "code":
      return <CodeBlock code={block.code} label={block.label} language={block.language} />;

    case "constraints":
      return <Constraints items={block.items} />;

    case "interface":
      return <InterfaceBlock context={context} />;

    case "steps":
      return <Steps items={block.items} />;

    default: {
      // Adding a core block kind is a compile error until it is handled here.
      const exhaustive: never = block;
      return exhaustive;
    }
  }
}

// ------------------------------------------------------------------- pieces

function Prose({ md }: { md: string }) {
  return (
    <div className="prose-ba">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
    </div>
  );
}

const CALLOUT_STYLES: Readonly<
  Record<CalloutTone, { border: string; icon: typeof Info; iconColor: string; label: string }>
> = {
  note: { border: "border-edge", icon: Info, iconColor: "text-muted", label: "Note" },
  warn: { border: "border-warning/30", icon: AlertTriangle, iconColor: "text-warning", label: "Careful" },
  insight: { border: "border-accent/30", icon: Lightbulb, iconColor: "text-accent", label: "Insight" },
};

function Callout({
  tone,
  title,
  children,
}: {
  tone: CalloutTone;
  title?: string;
  children: React.ReactNode;
}) {
  const style = CALLOUT_STYLES[tone];
  const Icon = style.icon;

  return (
    <aside className={cn("rounded-12 border bg-tint px-4 py-3", style.border)}>
      <div className="mb-1.5 flex items-center gap-2">
        <Icon className={cn("size-3.5 shrink-0", style.iconColor)} aria-hidden />
        <span className="text-micro font-medium uppercase tracking-wide text-muted">
          {title ?? style.label}
        </span>
      </div>
      {children}
    </aside>
  );
}

function Figure({
  illustration,
  caption,
  label,
}: {
  illustration: IllustrationSpec;
  caption?: string;
  label?: string;
}) {
  const drawing = getIllustration(illustration.id);
  if (!drawing) {
    return <UnknownBlock kind={`illustration ${illustration.id}`} />;
  }

  return (
    <figure className="space-y-2.5">
      <div className="rounded-12 border border-edge bg-tint p-4">
        {createElement(drawing, illustration.props ?? {})}
      </div>
      {(label || caption) && (
        <figcaption className="flex gap-2 text-mini text-quiet">
          {label && <span className="shrink-0 font-mono text-micro text-muted">{label}</span>}
          {caption && <span>{caption}</span>}
        </figcaption>
      )}
    </figure>
  );
}

function Example({
  input,
  output,
  explain,
}: {
  input: string;
  output: string;
  explain?: string;
}) {
  return (
    <div className="space-y-2.5 rounded-12 border border-edge bg-tint p-4">
      <ExampleRow label="Input" value={input} />
      <ExampleRow label="Output" value={output} />
      {explain && (
        <div className="border-t border-edge pt-2.5">
          <span className="text-micro uppercase tracking-wide text-quiet">Why</span>
          <div className="mt-1 text-mini text-body">
            <Prose md={explain} />
          </div>
        </div>
      )}
    </div>
  );
}

function ExampleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-micro uppercase tracking-wide text-quiet">{label}</span>
      <pre className="overflow-x-auto rounded-8 bg-canvas-deep px-3 py-2 font-mono text-mini text-ink">
        <code>{value}</code>
      </pre>
    </div>
  );
}

function CodeBlock({
  code,
  label,
  language,
}: {
  code: string;
  label?: string;
  language?: string;
}) {
  return (
    <div className="space-y-2">
      {(label || language) && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-micro font-medium uppercase tracking-wide text-muted">
            {label ?? "Code"}
          </span>
          {language && <span className="font-mono text-micro text-quiet">{language}</span>}
        </div>
      )}
      <pre className="overflow-x-auto rounded-12 border border-edge bg-canvas-deep px-4 py-3 font-mono text-mini leading-relaxed text-ink">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Constraints({ items }: { items: readonly string[] }) {
  return (
    <div className="space-y-2">
      <span className="text-micro font-medium uppercase tracking-wide text-muted">
        Constraints
      </span>
      <ul className="space-y-1.5">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2.5 text-mini text-body">
            <span aria-hidden className="mt-[0.45rem] size-1 shrink-0 rounded-full bg-quiet" />
            <span className="prose-ba prose-ba-inline">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{item}</ReactMarkdown>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InterfaceBlock({ context }: { context: BlockContext }) {
  const snippet = getInterface(context.task, context.language);
  const language = LANGUAGES[context.language];

  if (!snippet) {
    return <UnknownBlock kind={`signature for ${language.label}`} />;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-micro font-medium uppercase tracking-wide text-muted">
          What you implement
        </span>
        <span className="font-mono text-micro text-quiet">{language.label}</span>
      </div>
      <pre className="overflow-x-auto rounded-12 border border-edge bg-canvas-deep px-4 py-3 font-mono text-mini leading-relaxed text-ink">
        <code>{snippet}</code>
      </pre>
    </div>
  );
}

function Steps({ items }: { items: readonly { title: string; md: string }[] }) {
  return (
    <ol className="space-y-4">
      {items.map((step, index) => (
        <li key={index} className="flex gap-3.5">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-edge bg-tint font-mono text-micro tabular-nums text-muted">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <h4 className="text-mini font-medium text-ink">{step.title}</h4>
            <Prose md={step.md} />
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Stands in for a block the registry does not know.
 *
 * Rendering a placeholder rather than throwing means a stale pack reference or
 * a typo in seeded data costs one paragraph instead of the whole statement.
 */
function UnknownBlock({ kind }: { kind: string }) {
  return (
    <div className="rounded-8 border border-dashed border-edge px-3 py-2 text-micro text-quiet">
      This section could not be rendered ({kind}).
    </div>
  );
}
