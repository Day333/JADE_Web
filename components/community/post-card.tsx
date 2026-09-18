import Link from "next/link";
import { Sparkles } from "lucide-react";
import { UserAvatar } from "@/components/app/user-avatar";
import { PostActions } from "@/components/community/post-actions";
import { COMMUNITY_KIND_ICONS, POST_TYPE_ICONS, POST_TYPE_TONES } from "@/components/community/post-meta";
import type { FeedPost } from "@/components/community/data";
import { POST_TYPE_LABELS, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PostType } from "@/lib/types";

export function PostTypeBadge({ type, className }: { type: PostType; className?: string }) {
  const Icon = POST_TYPE_ICONS[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        POST_TYPE_TONES[type],
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {POST_TYPE_LABELS[type]}
    </span>
  );
}

/** Plain-text excerpt of a post body. */
export function excerpt(body: string, max = 220) {
  const text = body.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

export function PostCard({ post, showCommunity = true }: { post: FeedPost; showCommunity?: boolean }) {
  const href = `/community/post/${post.id}`;
  const CommunityIcon = post.community ? COMMUNITY_KIND_ICONS[post.community.kind] : null;
  return (
    <article className="group rounded-xl border bg-card p-4 transition-colors hover:border-emerald-500/40 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <PostTypeBadge type={post.type} />
        {showCommunity && post.community && CommunityIcon && (
          <Link
            href={`/community/c/${post.community.slug}`}
            className="inline-flex items-center gap-1 font-medium text-foreground/80 hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            <CommunityIcon className="h-3.5 w-3.5" aria-hidden />
            {post.community.name}
          </Link>
        )}
        {post.reason && (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-3 w-3" aria-hidden />
            {post.reason}
          </span>
        )}
      </div>

      <Link href={href} className="mt-3 block">
        <h3 className="text-base font-semibold leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-300 sm:text-lg">
          {post.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{excerpt(post.body)}</p>
      </Link>

      {post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-md bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        {post.author ? (
          <Link href={`/u/${post.author.id}`} className="flex min-w-0 items-center gap-2.5">
            <UserAvatar name={post.author.full_name} seed={post.author.id} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium hover:underline">
                {post.author.full_name ?? "Member"}
                {post.author.role === "recruiter" && (
                  <span className="ml-1.5 rounded bg-sky-500/10 px-1 py-px text-[10px] font-semibold uppercase text-sky-700 dark:text-sky-300">
                    Recruiter
                  </span>
                )}
              </span>
              {post.author.headline && <span className="block truncate text-xs text-muted-foreground">{post.author.headline}</span>}
            </span>
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">Former member</span>
        )}
        <time dateTime={post.created_at} className="ml-auto shrink-0 text-xs text-muted-foreground">
          {timeAgo(post.created_at)}
        </time>
      </div>

      <div className="mt-3 border-t pt-2">
        <div className="-mx-2">
          <PostActions
            postId={post.id}
            liked={post.liked}
            saved={post.saved}
            likeCount={post.like_count}
            commentCount={post.comment_count}
          />
        </div>
      </div>
    </article>
  );
}
