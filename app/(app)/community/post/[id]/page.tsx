import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Route, UserRound } from "lucide-react";
import { FollowButton, MessageButton } from "@/components/app/social-buttons";
import { UserAvatar } from "@/components/app/user-avatar";
import { Comments } from "@/components/community/comments";
import { loadJourney, loadPosts, withViewerState, POST_SELECT, type PostWithMeta } from "@/components/community/data";
import { DeletePostButton } from "@/components/community/delete-post-button";
import { JourneyTimeline } from "@/components/community/journey-timeline";
import { LikeButton, SaveButton, ShareButton } from "@/components/community/post-actions";
import { excerpt, PostTypeBadge } from "@/components/community/post-card";
import { COMMUNITY_KIND_ICONS, COMMUNITY_KIND_LABELS } from "@/components/community/post-meta";
import { Button } from "@/components/ui/button";
import type { CommentWithAuthor } from "@/lib/actions/community";
import { requireProfile } from "@/lib/auth";
import { formatDate, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadPost(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select(POST_SELECT).eq("id", id).maybeSingle();
  return (data as unknown as PostWithMeta | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await loadPost(id);
  return { title: post ? post.title : "Post not found" };
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  const { id } = await params;
  const raw = await loadPost(id);
  if (!raw) notFound();
  const supabase = await createClient();

  const [[post], commentsRes, followRes, followerRes, journey, related] = await Promise.all([
    withViewerState(profile.id, [raw]),
    supabase
      .from("comments")
      .select("*, author:profiles!comments_author_id_fkey(id, full_name, headline, role)")
      .eq("post_id", raw.id)
      .order("created_at"),
    supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", profile.id)
      .eq("target_type", "user")
      .eq("target_id", raw.author_id)
      .maybeSingle(),
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("target_type", "user").eq("target_id", raw.author_id),
    loadJourney(raw.author_id),
    raw.community_id ? loadPosts({ communityId: raw.community_id, limit: 4 }) : Promise.resolve([] as PostWithMeta[]),
  ]);

  const comments = ((commentsRes.data ?? []) as unknown as CommentWithAuthor[]).map((c) => ({ ...c, timeLabel: timeAgo(c.created_at) }));
  const isAuthor = post.author_id === profile.id;
  const author = post.author;
  const CommunityIcon = post.community ? COMMUNITY_KIND_ICONS[post.community.kind] : null;
  const currentYear = new Date().getFullYear();
  const moreInCommunity = related.filter((p) => p.id !== post.id).slice(0, 3);

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={post.community ? `/community/c/${post.community.slug}` : "/community"}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {post.community ? post.community.name : "Community"}
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <article className="rounded-xl border bg-card p-5 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <PostTypeBadge type={post.type} />
              {post.community && CommunityIcon && (
                <Link
                  href={`/community/c/${post.community.slug}`}
                  className="inline-flex items-center gap-1 font-medium text-foreground/80 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  <CommunityIcon className="h-3.5 w-3.5" aria-hidden />
                  {post.community.name}
                </Link>
              )}
              <span>·</span>
              <time dateTime={post.created_at} title={formatDate(post.created_at)}>
                {timeAgo(post.created_at)}
              </time>
            </div>

            <h1 className="mt-4 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{post.title}</h1>

            {author && (
              <Link href={`/u/${author.id}`} className="mt-4 flex items-center gap-3">
                <UserAvatar name={author.full_name} seed={author.id} size="md" />
                <span className="min-w-0">
                  <span className="block font-medium hover:underline">{author.full_name ?? "Member"}</span>
                  {author.headline && <span className="block truncate text-sm text-muted-foreground">{author.headline}</span>}
                </span>
              </Link>
            )}

            <div className="mt-6 whitespace-pre-wrap break-words text-[15px] leading-7">{post.body}</div>

            {post.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/search?q=${encodeURIComponent(tag)}`}
                    className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground hover:bg-secondary/70"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            <div className="-mx-2 mt-6 flex flex-wrap items-center gap-1 border-t pt-3">
              <LikeButton postId={post.id} initialLiked={post.liked} initialCount={post.like_count} />
              <a
                href="#comments"
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {post.comment_count} {post.comment_count === 1 ? "comment" : "comments"}
              </a>
              <div className="ml-auto flex items-center gap-1">
                <ShareButton path={`/community/post/${post.id}`} showLabel />
                <SaveButton postId={post.id} initialSaved={post.saved} showLabel />
                {isAuthor && <DeletePostButton postId={post.id} />}
              </div>
            </div>
          </article>

          {post.type === "career_journey" && journey.length > 0 && (
            <section className="rounded-xl border bg-card p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Route className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                {isAuthor ? "Your Career Journey" : `${author?.full_name ?? "Their"}'s Career Journey`}
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">How they got from where they started to where they are going.</p>
              <JourneyTimeline entries={journey} currentYear={currentYear} />
            </section>
          )}

          <Comments
            postId={post.id}
            initialComments={comments}
            viewer={{ id: profile.id, full_name: profile.full_name, headline: profile.headline, role: profile.role }}
          />
        </div>

        <aside className="space-y-4">
          {author && (
            <section className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <UserAvatar name={author.full_name} seed={author.id} size="lg" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{author.full_name ?? "Member"}</p>
                  {author.headline && <p className="line-clamp-2 text-sm text-muted-foreground">{author.headline}</p>}
                </div>
              </div>
              {author.university && <p className="mt-3 text-sm text-muted-foreground">{author.university}</p>}
              <p className="mt-1 text-xs text-muted-foreground">
                {followerRes.count ?? 0} {followerRes.count === 1 ? "follower" : "followers"}
              </p>
              {!isAuthor && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <FollowButton targetType="user" targetId={author.id} initialFollowing={!!followRes.data} />
                  <MessageButton userId={author.id} />
                </div>
              )}
              <div className="mt-3 flex flex-col gap-1">
                <Button variant="ghost" size="sm" className="justify-start" asChild>
                  <Link href={`/u/${author.id}`}>
                    <UserRound /> View Career Profile
                  </Link>
                </Button>
                {journey.length > 0 && (
                  <Button variant="ghost" size="sm" className="justify-start" asChild>
                    <Link href={`/u/${author.id}#journey`}>
                      <Route /> View Career Journey
                    </Link>
                  </Button>
                )}
              </div>
            </section>
          )}

          {post.community && CommunityIcon && (
            <section className="rounded-xl border bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {COMMUNITY_KIND_LABELS[post.community.kind]} community
              </p>
              <Link
                href={`/community/c/${post.community.slug}`}
                className="mt-1 flex items-center gap-2 font-semibold hover:underline"
              >
                <CommunityIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                {post.community.name}
              </Link>
              {moreInCommunity.length > 0 && (
                <ul className="mt-3 space-y-3 border-t pt-3">
                  {moreInCommunity.map((p) => (
                    <li key={p.id}>
                      <Link href={`/community/post/${p.id}`} className="group block">
                        <p className="line-clamp-2 text-sm font-medium group-hover:underline">{p.title}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">{excerpt(p.body, 90)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                <Link href={`/community/new?community=${post.community.slug}`}>Post in this community</Link>
              </Button>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
