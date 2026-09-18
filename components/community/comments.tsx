"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/page-parts";
import { UserAvatar } from "@/components/app/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addComment, deleteComment, type CommentWithAuthor } from "@/lib/actions/community";
import { cn } from "@/lib/utils";

type CommentView = CommentWithAuthor & { timeLabel: string; pending?: boolean };

type OptimisticAction = { kind: "add"; comment: CommentView } | { kind: "remove"; id: string };

export function Comments({
  postId,
  initialComments,
  viewer,
}: {
  postId: string;
  /** Comments with a server-rendered relative time label. */
  initialComments: CommentView[];
  viewer: { id: string; full_name: string | null; headline: string | null; role: "seeker" | "recruiter" };
}) {
  const [comments, applyOptimistic] = useOptimistic(initialComments, (state: CommentView[], action: OptimisticAction) =>
    action.kind === "add" ? [...state, action.comment] : state.filter((c) => c.id !== action.id),
  );
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const submit = () => {
    const text = body.trim();
    if (!text || pending) return;
    setBody("");
    startTransition(async () => {
      applyOptimistic({
        kind: "add",
        comment: {
          id: `pending-${Date.now()}`,
          post_id: postId,
          author_id: viewer.id,
          body: text,
          created_at: new Date().toISOString(),
          author: viewer,
          timeLabel: "just now",
          pending: true,
        },
      });
      const result = await addComment(postId, text);
      if (result.error) {
        toast.error(result.error);
        setBody(text);
      }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      applyOptimistic({ kind: "remove", id });
      const result = await deleteComment(id, postId);
      if (result.error) toast.error(result.error);
      else toast.success("Comment deleted");
    });
  };

  return (
    <section id="comments" className="scroll-mt-24 rounded-xl border bg-card p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
        Comments <span className="text-muted-foreground">({comments.length})</span>
      </h2>

      <form
        ref={formRef}
        className="mt-4 flex gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <UserAvatar name={viewer.full_name} seed={viewer.id} size="sm" className="mt-1 hidden sm:inline-flex" />
        <div className="flex-1 space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Add a thoughtful comment or ask a follow-up question…"
            aria-label="Write a comment"
            maxLength={5000}
            rows={3}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Be kind and specific — it helps everyone learn.</p>
            <Button type="submit" size="sm" disabled={!body.trim() || pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Send />}
              Comment
            </Button>
          </div>
        </div>
      </form>

      {comments.length === 0 ? (
        <EmptyState
          className="mt-6 py-8"
          title="No comments yet"
          description="Start the conversation — ask how they prepared or share your own experience."
        />
      ) : (
        <ul className="mt-6 space-y-5">
          {comments.map((comment) => (
            <li key={comment.id} className={cn("flex gap-3", comment.pending && "opacity-60")}>
              <Link href={`/u/${comment.author_id}`} className="shrink-0">
                <UserAvatar name={comment.author?.full_name} seed={comment.author_id} size="sm" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <Link href={`/u/${comment.author_id}`} className="text-sm font-medium hover:underline">
                    {comment.author?.full_name ?? "Member"}
                  </Link>
                  {comment.author?.role === "recruiter" && (
                    <span className="rounded bg-sky-500/10 px-1 py-px text-[10px] font-semibold uppercase text-sky-700 dark:text-sky-300">
                      Recruiter
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{comment.pending ? "Posting…" : comment.timeLabel}</span>
                </div>
                {comment.author?.headline && <p className="truncate text-xs text-muted-foreground">{comment.author.headline}</p>}
                <p className="mt-1.5 whitespace-pre-wrap break-words text-sm">{comment.body}</p>
              </div>
              {comment.author_id === viewer.id && !comment.pending && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Delete comment"
                  onClick={() => {
                    if (window.confirm("Delete this comment?")) remove(comment.id);
                  }}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
