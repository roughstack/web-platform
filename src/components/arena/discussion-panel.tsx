"use client";

import { Eye, EyeOff, Loader2, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { MAX_REPLY_LENGTH, validateReply } from "@/lib/discussion";
import { cn } from "@/lib/utils";

interface Reply {
  readonly id: string;
  readonly author: string;
  readonly body: string;
  readonly isSpoiler: boolean;
  readonly createdAt: string;
  readonly isMine: boolean;
}

/**
 * Discussion on a problem statement.
 *
 * Three constraints keep this a conversation about the idea rather than a place
 * to collect solutions: a hard length cap, a refusal to accept code, and a
 * spoiler flag for anything that gives the answer away. The composer applies
 * the same rules as the server, so rejection arrives while you type rather than
 * after you press post.
 */
export function DiscussionPanel({ slug }: { slug: string }) {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [posting, setPosting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/challenges/${slug}/replies`);
        if (!response.ok) return;
        const data = (await response.json()) as { replies: Reply[] };
        if (!cancelled) setReplies(data.replies);
      } catch {
        // An empty thread and a thread that failed to load look the same to a
        // reader, and neither is worth an error banner.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const trimmed = body.trim();
  // Only complain once there is something to complain about; validating an
  // empty box just to say "too short" is nagging.
  const validation = trimmed.length > 0 ? validateReply(body) : { ok: false as const };
  const problem = trimmed.length > 0 && !validation.ok ? validation.message : null;
  const remaining = MAX_REPLY_LENGTH - trimmed.length;

  const post = useCallback(async () => {
    setPosting(true);
    setServerError(null);

    try {
      const response = await fetch(`/api/challenges/${slug}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, isSpoiler }),
      });
      const data = (await response.json()) as { reply?: Reply; error?: string };

      if (!response.ok) {
        setServerError(data.error ?? "That reply could not be posted.");
        return;
      }
      if (data.reply) {
        setReplies((current) => [data.reply as Reply, ...current]);
        setBody("");
        setIsSpoiler(false);
      }
    } catch {
      setServerError("Could not reach the server.");
    } finally {
      setPosting(false);
    }
  }, [slug, body, isSpoiler]);

  const toggleReveal = (id: string) => {
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-5 px-5 py-5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (validation.ok && !posting) void post();
        }}
        className="space-y-2"
      >
        <label htmlFor="reply-body" className="sr-only">
          Write a reply
        </label>
        <textarea
          id="reply-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          placeholder="Share how you thought about it. No code — describe the idea."
          className={cn(
            "w-full resize-y rounded-8 border bg-tint px-3 py-2.5 text-mini text-body placeholder:text-quiet",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
            problem ? "border-warning/40" : "border-edge",
          )}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIsSpoiler((on) => !on)}
            aria-pressed={isSpoiler}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-6 border px-2 py-1 text-micro transition-colors",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
              isSpoiler
                ? "border-warning/40 bg-warning/10 text-warning"
                : "border-edge text-quiet hover:text-body",
            )}
          >
            {isSpoiler ? <EyeOff className="size-3" aria-hidden /> : <Eye className="size-3" aria-hidden />}
            Contains a hint
          </button>

          <div className="flex items-center gap-3">
            <span
              className={cn(
                "font-mono text-micro tabular-nums",
                remaining < 0 ? "text-danger" : remaining < 80 ? "text-warning" : "text-quiet",
              )}
            >
              {remaining}
            </span>
            <Button type="submit" size="sm" disabled={!validation.ok || posting} loading={posting}>
              Post
            </Button>
          </div>
        </div>

        {(problem || serverError) && (
          <p className="text-micro text-warning">{serverError ?? problem}</p>
        )}
      </form>

      <div className="border-t border-edge pt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-mini text-quiet">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Loading the thread…
          </div>
        ) : replies.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-6 text-center">
            <MessageSquare className="size-4 text-quiet" aria-hidden />
            <p className="text-mini text-quiet">No replies yet. Start the conversation.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {replies.map((reply) => (
              <li key={reply.id} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-micro text-muted">{reply.author}</span>
                  {reply.isMine && (
                    <span className="rounded-4 bg-white/[0.06] px-1.5 text-micro text-quiet">you</span>
                  )}
                  <time
                    dateTime={reply.createdAt}
                    className="text-micro text-quiet"
                    title={new Date(reply.createdAt).toLocaleString()}
                  >
                    {relativeTime(reply.createdAt)}
                  </time>
                </div>

                {reply.isSpoiler && !revealed.has(reply.id) ? (
                  <button
                    type="button"
                    onClick={() => toggleReveal(reply.id)}
                    className="flex w-full items-center gap-2 rounded-8 border border-dashed border-warning/40 px-3 py-2 text-left text-mini text-quiet transition-colors hover:text-body focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  >
                    <EyeOff className="size-3.5 shrink-0 text-warning" aria-hidden />
                    This reply contains a hint. Click to read it.
                  </button>
                ) : (
                  <p className="whitespace-pre-wrap text-mini leading-relaxed text-body">
                    {reply.body}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const elapsed = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(elapsed / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.round(hours / 24)}d ago`;
}
