"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bookmark, Heart, Link2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { togglePostLike, togglePostSave } from "@/lib/actions/community";
import { cn } from "@/lib/utils";

const actionClass =
  "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-60";

export function LikeButton({ postId, initialLiked, initialCount }: { postId: string; initialLiked: boolean; initialCount: number }) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
      className={cn(actionClass, liked && "text-rose-600 dark:text-rose-400")}
      onClick={() => {
        const next = !liked;
        setLiked(next);
        setCount((c) => Math.max(0, c + (next ? 1 : -1)));
        startTransition(async () => {
          const result = await togglePostLike(postId, next);
          if (result.error) {
            toast.error(result.error);
            setLiked(!next);
            setCount((c) => Math.max(0, c + (next ? -1 : 1)));
          }
        });
      }}
    >
      <Heart className={cn("h-4 w-4", liked && "fill-current")} />
      <span className="tabular-nums">{count}</span>
    </button>
  );
}

export function SaveButton({ postId, initialSaved, showLabel = false }: { postId: string; initialSaved: boolean; showLabel?: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save post"}
      className={cn(actionClass, saved && "text-emerald-600 dark:text-emerald-400")}
      onClick={() => {
        const next = !saved;
        setSaved(next);
        startTransition(async () => {
          const result = await togglePostSave(postId, next);
          if (result.error) {
            toast.error(result.error);
            setSaved(!next);
          } else if (next) {
            toast.success("Saved to your posts");
          }
        });
      }}
    >
      <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
      {showLabel && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}

export function ShareButton({ path, showLabel = false }: { path: string; showLabel?: boolean }) {
  return (
    <button
      type="button"
      aria-label="Copy link to post"
      className={actionClass}
      onClick={async () => {
        const url = `${window.location.origin}${path}`;
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Link copied", { description: "Share it with a friend or classmate." });
        } catch {
          toast.error("Could not copy the link", { description: url });
        }
      }}
    >
      <Link2 className="h-4 w-4" />
      {showLabel && <span>Share</span>}
    </button>
  );
}

/** Like, comment, save and share row used on post cards. */
export function PostActions({
  postId,
  liked,
  saved,
  likeCount,
  commentCount,
}: {
  postId: string;
  liked: boolean;
  saved: boolean;
  likeCount: number;
  commentCount: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <LikeButton postId={postId} initialLiked={liked} initialCount={likeCount} />
      <Link href={`/community/post/${postId}#comments`} className={actionClass} aria-label={`${commentCount} comments`}>
        <MessageCircle className="h-4 w-4" />
        <span className="tabular-nums">{commentCount}</span>
      </Link>
      <div className="ml-auto flex items-center gap-1">
        <ShareButton path={`/community/post/${postId}`} />
        <SaveButton postId={postId} initialSaved={saved} />
      </div>
    </div>
  );
}
