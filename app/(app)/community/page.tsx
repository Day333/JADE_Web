import Link from "next/link";
import { Bookmark, ChevronDown, Compass, MessagesSquare, PenSquare, Route, Sparkles, Users } from "lucide-react";
import { ForYouLabel } from "@/components/app/match";
import { EmptyState, PageHeader } from "@/components/app/page-parts";
import { UserAvatar } from "@/components/app/user-avatar";
import { CommunityDirectory, CommunityRow, type DirectoryItem } from "@/components/community/community-directory";
import {
  followerCounts,
  loadCommunities,
  loadFeedSignals,
  loadPeopleLikeMe,
  loadPosts,
  rankForYou,
  withViewerState,
  type FeedPost,
  type FeedSignals,
  type PostWithMeta,
} from "@/components/community/data";
import { PostCard } from "@/components/community/post-card";
import { COMMUNITY_KIND_ICONS, isPostType } from "@/components/community/post-meta";
import { TypeFilter } from "@/components/community/type-filter";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { POST_TYPE_LABELS } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { Community, Profile } from "@/lib/types";

export const metadata = { title: "Community" };

const TABS = [
  { id: "for-you", label: "For You" },
  { id: "latest", label: "Latest" },
  { id: "following", label: "Following" },
  { id: "saved", label: "Saved" },
] as const;
type Tab = (typeof TABS)[number]["id"];

async function loadSavedPosts(userId: string, limit: number): Promise<PostWithMeta[]> {
  const supabase = await createClient();
  const { data: saves } = await supabase
    .from("post_saves")
    .select("post_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const ids = (saves ?? []).map((s) => s.post_id);
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("posts")
    .select(
      "*, author:profiles!posts_author_id_fkey(id, full_name, headline, role, university), community:communities!posts_community_id_fkey(id, slug, name, kind)",
    )
    .in("id", ids);
  const order = new Map(ids.map((id, i) => [id, i]));
  return ((data ?? []) as unknown as PostWithMeta[]).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

/** Communities without a community row yet: companies created by recruiters. */
async function loadRecruiterCompanies(communities: Community[]) {
  const supabase = await createClient();
  const { data } = await supabase.from("companies").select("id, name, slug").eq("is_sample", false).order("name").limit(100);
  const covered = new Set(communities.map((c) => c.company_id).filter(Boolean));
  return (data ?? []).filter((c) => !covered.has(c.id));
}

function suggestionBadge(community: Community, signals: FeedSignals) {
  if (signals.goalCommunityIds.has(community.id)) return "Your goal";
  if (community.id === signals.universityCommunityId) return "Your university";
  if (community.id === signals.companyCommunityId) return "Your company";
  if (signals.interestCommunityIds.has(community.id)) return "Your interests";
  return null;
}

function personalizationSummary(communities: Community[], signals: FeedSignals) {
  const parts: string[] = [];
  const goal = communities.find((c) => signals.goalCommunityIds.has(c.id));
  if (goal) parts.push(`your goal (${goal.name})`);
  const uni = communities.find((c) => c.id === signals.universityCommunityId);
  if (uni) parts.push(uni.name);
  const followed = signals.follows.community.size;
  if (followed > 0) parts.push(`${followed} ${followed === 1 ? "community" : "communities"} you follow`);
  const people = signals.follows.user.size;
  if (people > 0) parts.push(`${people} ${people === 1 ? "person" : "people"} you follow`);
  if (parts.length === 0) {
    const interests = communities.filter((c) => signals.interestCommunityIds.has(c.id)).slice(0, 2);
    if (interests.length > 0) parts.push(`your interests (${interests.map((c) => c.name).join(", ")})`);
  }
  return parts;
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; type?: string; limit?: string }>;
}) {
  const profile = await requireProfile();
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as Tab) : "for-you";
  const type = isPostType(sp.type) ? sp.type : null;
  const limit = Math.min(Math.max(Number(sp.limit) || 30, 30), 200);

  const communities = await loadCommunities();
  const signals = await loadFeedSignals(profile, communities);

  const [rawPosts, memberCounts, recruiterCompanies, peopleLikeMe] = await Promise.all([
    tab === "for-you"
      ? loadPosts({ type, limit: Math.max(150, limit + 50) })
      : tab === "latest"
        ? loadPosts({ type, limit: limit + 1 })
        : tab === "following"
          ? loadPosts({ type, authorIds: [...signals.follows.user], limit: limit + 1 })
          : loadSavedPosts(profile.id, 200),
    followerCounts("community"),
    loadRecruiterCompanies(communities),
    loadPeopleLikeMe(profile, signals.goalCareerId, 3),
  ]);
  const companyCounts = await followerCounts(
    "company",
    recruiterCompanies.map((c) => c.id),
  );

  let posts: FeedPost[] = await withViewerState(profile.id, tab === "saved" && type ? rawPosts.filter((p) => p.type === type) : rawPosts);
  if (tab === "for-you") posts = rankForYou(posts, signals, profile.id);
  const hasMore = posts.length > limit;
  posts = posts.slice(0, limit);

  const directory: DirectoryItem[] = [
    ...communities.map((c) => ({
      id: c.id,
      followType: "community" as const,
      kind: c.kind,
      name: c.name,
      href: `/community/c/${c.slug}`,
      members: memberCounts.get(c.id) ?? 0,
      following: signals.follows.community.has(c.id),
      badge: suggestionBadge(c, signals),
    })),
    ...recruiterCompanies.map((c) => ({
      id: c.id,
      followType: "company" as const,
      kind: "company" as const,
      name: c.name,
      href: `/community/c/${c.slug}`,
      members: companyCounts.get(c.id) ?? 0,
      following: signals.follows.company.has(c.id),
      badge: c.id === profile.company_id ? "Your company" : null,
    })),
  ];
  const kindOrder = { career: 0, company: 1, university: 2, topic: 3 } as const;
  directory.sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind] || Number(!!b.badge) - Number(!!a.badge) || b.members - a.members || a.name.localeCompare(b.name));

  const yours = directory
    .filter((d) => d.following || d.badge)
    .sort((a, b) => Number(!!b.badge) - Number(!!a.badge) || Number(b.following) - Number(a.following))
    .slice(0, 6);

  const summary = personalizationSummary(communities, signals);
  const currentYear = new Date().getFullYear();

  const tabHref = (id: Tab) => {
    const q = new URLSearchParams();
    if (id !== "for-you") q.set("tab", id);
    if (type) q.set("type", type);
    const s = q.toString();
    return s ? `/community?${s}` : "/community";
  };
  const moreHref = (() => {
    const q = new URLSearchParams();
    if (tab !== "for-you") q.set("tab", tab);
    if (type) q.set("type", type);
    q.set("limit", String(limit + 30));
    return `/community?${q.toString()}`;
  })();

  return (
    <div>
      <PageHeader
        eyebrow={<ForYouLabel>Career community</ForYouLabel>}
        title="Community"
        description="Learn from people a few steps ahead of you — interview experiences, career journeys, graduate programs and honest advice."
        actions={
          <Button asChild>
            <Link href="/community/new">
              <PenSquare /> Create post
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Mobile: communities as a compact top section */}
        <section className="space-y-3 lg:hidden" aria-label="Your communities">
          {yours.length > 0 && (
            <div className="-mx-4 overflow-x-auto px-4">
              <div className="flex w-max gap-2">
                {yours.map((item) => {
                  const Icon = COMMUNITY_KIND_ICONS[item.kind];
                  return (
                    <Link
                      key={`${item.followType}-${item.id}`}
                      href={item.href}
                      className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm hover:border-emerald-500/50"
                    >
                      <Icon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                      <span className="font-medium">{item.name}</span>
                      {item.badge && <span className="text-xs text-emerald-600 dark:text-emerald-400">{item.badge}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          <details className="group rounded-xl border bg-card">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <Compass className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
              Browse career, company, university and topic communities
              <ChevronDown className="ml-auto h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="border-t px-4 pb-4 pt-3">
              <CommunityDirectory items={directory} />
            </div>
          </details>
        </section>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3">
            <nav aria-label="Feed" className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1 sm:inline-grid sm:w-max">
              {TABS.map((t) => (
                <Link
                  key={t.id}
                  href={tabHref(t.id)}
                  aria-current={tab === t.id ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                    tab === t.id && "bg-background text-foreground shadow",
                  )}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
            <TypeFilter basePath="/community" active={type} params={{ tab: tab === "for-you" ? undefined : tab }} />
          </div>

          {tab === "for-you" && (
            <p className="flex items-start gap-2 rounded-lg bg-emerald-500/5 px-3 py-2 text-sm text-muted-foreground">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
              {summary.length > 0 ? (
                <span>
                  Ranked for you using {summary.join(", ")} — then the freshest conversations.
                </span>
              ) : (
                <span>
                  Follow communities and people, or set a career goal, and we&apos;ll put the most relevant posts first.
                </span>
              )}
            </p>
          )}

          {posts.length === 0 ? (
            <FeedEmptyState tab={tab} type={type} />
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
              {hasMore && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" asChild>
                    <Link href={moreHref} scroll={false}>
                      Show more posts
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden space-y-4 lg:block">
          <div className="space-y-4 lg:sticky lg:top-24">
            {yours.length > 0 && (
              <section className="rounded-xl border bg-card p-5">
                <ForYouLabel>Your communities</ForYouLabel>
                <ul className="mt-2 divide-y">
                  {yours.map((item) => (
                    <CommunityRow key={`${item.followType}-${item.id}`} item={item} />
                  ))}
                </ul>
              </section>
            )}
            <section className="rounded-xl border bg-card p-5">
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <Compass className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden /> Browse communities
              </h2>
              <CommunityDirectory items={directory} />
            </section>
            <PeopleLikeMeCard people={peopleLikeMe} viewer={profile} currentYear={currentYear} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function FeedEmptyState({ tab, type }: { tab: Tab; type: keyof typeof POST_TYPE_LABELS | null }) {
  if (tab === "following") {
    return (
      <EmptyState
        icon={Users}
        title={type ? `No ${POST_TYPE_LABELS[type]} posts from people you follow` : "Posts from people you follow appear here"}
        description="Follow people from their profiles or from posts you find useful — classmates, alumni and people already in the roles you want."
        action={
          <Button variant="outline" asChild>
            <Link href="/community?tab=latest">Explore latest posts</Link>
          </Button>
        }
      />
    );
  }
  if (tab === "saved") {
    return (
      <EmptyState
        icon={Bookmark}
        title="No saved posts yet"
        description="Tap the bookmark on any post to keep interview tips and career journeys for later."
        action={
          <Button variant="outline" asChild>
            <Link href="/community">Browse the feed</Link>
          </Button>
        }
      />
    );
  }
  return (
    <EmptyState
      icon={MessagesSquare}
      title={type ? `No ${POST_TYPE_LABELS[type]} posts yet` : "No posts yet"}
      description="Be the first to share — an interview experience, how you landed an internship, or a question for people ahead of you."
      action={
        <Button asChild>
          <Link href={type ? `/community/new?type=${type}` : "/community/new"}>
            <PenSquare /> Create post
          </Link>
        </Button>
      }
    />
  );
}

function PeopleLikeMeCard({
  people,
  viewer,
  currentYear,
}: {
  people: Awaited<ReturnType<typeof loadPeopleLikeMe>>;
  viewer: Profile;
  currentYear: number;
}) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <ForYouLabel>People like you</ForYouLabel>
      <h2 className="font-semibold">How did they get there?</h2>
      {people.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No one has shared a Career Journey yet.{" "}
          <Link href="/journey" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
            Share yours
          </Link>{" "}
          to help students one step behind you.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {people.map((p) => {
            const path = p.entries.slice(-3);
            return (
              <li key={p.id}>
                <Link href={`/u/${p.id}#journey`} className="group flex gap-3">
                  <UserAvatar name={p.full_name} seed={p.id} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium group-hover:underline">{p.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {path.map((e, i) => (
                        <span key={e.id}>
                          {i > 0 && " → "}
                          <span className={cn(e.year > currentYear && "text-emerald-700 dark:text-emerald-400")}>
                            {e.year} {e.title}
                          </span>
                        </span>
                      ))}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Button variant="ghost" size="sm" className="-mx-2 mt-3" asChild>
        <Link href="/journey">
          <Route /> {viewer.role === "recruiter" ? "Share your Career Journey" : "Edit your Career Journey"}
        </Link>
      </Button>
    </section>
  );
}
