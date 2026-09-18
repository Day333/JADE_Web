import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Community, JourneyEntry, Post, PostType, Profile } from "@/lib/types";

export const POST_SELECT =
  "*, author:profiles!posts_author_id_fkey(id, full_name, headline, role, university), community:communities!posts_community_id_fkey(id, slug, name, kind)";

export type PostAuthor = Pick<Profile, "id" | "full_name" | "headline" | "role" | "university">;
export type PostCommunity = Pick<Community, "id" | "slug" | "name" | "kind">;
export type PostWithMeta = Post & { author: PostAuthor | null; community: PostCommunity | null };
export type FeedPost = PostWithMeta & { liked: boolean; saved: boolean; reason?: string | null };

/** Adds the viewer's like / save state to a list of posts. */
export async function withViewerState(userId: string, posts: PostWithMeta[]): Promise<FeedPost[]> {
  if (posts.length === 0) return [];
  const supabase = await createClient();
  const ids = posts.map((p) => p.id);
  const [likes, saves] = await Promise.all([
    supabase.from("post_likes").select("post_id").eq("user_id", userId).in("post_id", ids),
    supabase.from("post_saves").select("post_id").eq("user_id", userId).in("post_id", ids),
  ]);
  const liked = new Set((likes.data ?? []).map((l) => l.post_id));
  const saved = new Set((saves.data ?? []).map((s) => s.post_id));
  return posts.map((p) => ({ ...p, liked: liked.has(p.id), saved: saved.has(p.id) }));
}

/** Posts, newest first, with optional filters. */
export async function loadPosts(options: {
  type?: PostType | null;
  communityId?: string;
  authorIds?: string[];
  limit?: number;
}): Promise<PostWithMeta[]> {
  const supabase = await createClient();
  let query = supabase.from("posts").select(POST_SELECT).order("created_at", { ascending: false });
  if (options.type) query = query.eq("type", options.type);
  if (options.communityId) query = query.eq("community_id", options.communityId);
  if (options.authorIds) {
    if (options.authorIds.length === 0) return [];
    query = query.in("author_id", options.authorIds);
  }
  const { data, error } = await query.limit(options.limit ?? 40);
  if (error) throw new Error(`Could not load posts: ${error.message}`);
  return (data ?? []) as unknown as PostWithMeta[];
}

/** All communities (a small reference list), ordered by kind then name. */
export const loadCommunities = cache(async (): Promise<Community[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("communities").select("*").order("name");
  return data ?? [];
});

/** Number of followers ("members") per followed target of one type. */
export async function followerCounts(targetType: "community" | "company" | "user", targetIds?: string[]) {
  const supabase = await createClient();
  let query = supabase.from("follows").select("target_id").eq("target_type", targetType);
  if (targetIds) {
    if (targetIds.length === 0) return new Map<string, number>();
    query = query.in("target_id", targetIds);
  }
  const { data } = await query.limit(20000);
  const counts = new Map<string, number>();
  for (const row of data ?? []) counts.set(row.target_id, (counts.get(row.target_id) ?? 0) + 1);
  return counts;
}

/** Everything the viewer follows, grouped by target type. */
export const loadMyFollows = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("follows").select("target_type, target_id").eq("follower_id", userId);
  const byType = {
    user: new Set<string>(),
    career: new Set<string>(),
    company: new Set<string>(),
    community: new Set<string>(),
    topic: new Set<string>(),
  };
  for (const f of data ?? []) byType[f.target_type].add(f.target_id);
  return byType;
});

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** The university community that matches a free-text university name. */
export function findUniversityCommunity(communities: Community[], university: string | null | undefined) {
  if (!university?.trim()) return null;
  const target = normalizeName(university);
  const unis = communities.filter((c) => c.kind === "university");
  return (
    unis.find((c) => normalizeName(c.name) === target || c.slug === target.replace(/\s+/g, "")) ??
    unis.find((c) => {
      const name = normalizeName(c.name);
      return name.includes(target) || target.includes(name);
    }) ??
    unis.find((c) => target.split(" ").includes(c.slug)) ??
    null
  );
}

export interface FeedSignals {
  follows: Awaited<ReturnType<typeof loadMyFollows>>;
  goalCareerId: string | null;
  goalCommunityIds: Set<string>;
  interestCommunityIds: Set<string>;
  universityCommunityId: string | null;
  companyCommunityId: string | null;
  /** Community ids implied by followed careers and companies. */
  impliedCommunityIds: Set<string>;
}

/** What we know about the viewer that makes a post relevant to them. */
export async function loadFeedSignals(profile: Profile, communities: Community[]): Promise<FeedSignals> {
  const supabase = await createClient();
  const [follows, goal, prefs] = await Promise.all([
    loadMyFollows(profile.id),
    supabase.from("career_goals").select("career_id").eq("user_id", profile.id).maybeSingle(),
    supabase.from("career_preferences").select("interested_careers").eq("user_id", profile.id).maybeSingle(),
  ]);
  const goalCareerId = goal.data?.career_id ?? null;
  const interested = new Set(prefs.data?.interested_careers ?? []);
  const university = findUniversityCommunity(communities, profile.university);
  const company = profile.company_id ? communities.find((c) => c.company_id === profile.company_id) : null;
  return {
    follows,
    goalCareerId,
    goalCommunityIds: new Set(communities.filter((c) => goalCareerId && c.career_id === goalCareerId).map((c) => c.id)),
    interestCommunityIds: new Set(communities.filter((c) => c.career_id && interested.has(c.career_id)).map((c) => c.id)),
    universityCommunityId: university?.id ?? null,
    companyCommunityId: company?.id ?? null,
    impliedCommunityIds: new Set(
      communities
        .filter(
          (c) => (c.career_id && follows.career.has(c.career_id)) || (c.company_id && follows.company.has(c.company_id)),
        )
        .map((c) => c.id),
    ),
  };
}

/**
 * Rank posts for the "For You" feed: posts from communities, people and
 * topics the viewer follows, their career goal and university come first,
 * then fresher and more discussed posts.
 */
export function rankForYou(posts: FeedPost[], signals: FeedSignals, viewerId: string): FeedPost[] {
  const now = Date.now();
  const topics = new Set([...signals.follows.topic].map((t) => t.toLowerCase()));
  return posts
    .map((post) => {
      let score = 0;
      let reason: string | null = null;
      const communityId = post.community_id ?? "";
      const note = (points: number, why: string) => {
        score += points;
        if (!reason) reason = why;
      };
      if (post.author && signals.follows.user.has(post.author_id)) note(6, `You follow ${post.author.full_name ?? "this person"}`);
      if (signals.goalCommunityIds.has(communityId)) note(5, "Related to your career goal");
      if (signals.follows.community.has(communityId)) note(5, "From a community you follow");
      if (signals.impliedCommunityIds.has(communityId)) note(4, "From a career or company you follow");
      if (communityId && communityId === signals.universityCommunityId) note(4, "From your university");
      if (communityId && communityId === signals.companyCommunityId) note(4, "From your company");
      if (post.tags.some((t) => topics.has(t.toLowerCase()))) note(3, "Matches a topic you follow");
      if (signals.interestCommunityIds.has(communityId)) note(2, "Matches your career interests");
      if (post.author_id === viewerId) score -= 2;
      const ageDays = (now - new Date(post.created_at).getTime()) / 86_400_000;
      score += 4 * Math.exp(-ageDays / 7);
      score += 0.6 * Math.log1p(post.like_count + post.comment_count * 2);
      return { post: { ...post, reason }, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((r) => r.post);
}

/** A user's Career Journey, oldest first. */
export async function loadJourney(userId: string): Promise<JourneyEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("journey_entries")
    .select("*")
    .eq("user_id", userId)
    .order("year")
    .order("created_at");
  return data ?? [];
}

export type JourneyPerson = Pick<Profile, "id" | "full_name" | "headline" | "university" | "degree" | "major"> & {
  entries: JourneyEntry[];
  similarity: number;
};

/**
 * Other people who have shared a Career Journey, most similar to the viewer
 * first ("People like me — how did they get there?").
 */
export async function loadPeopleLikeMe(viewer: Profile, goalCareerId: string | null, limit = 4): Promise<JourneyPerson[]> {
  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("journey_entries")
    .select("*")
    .neq("user_id", viewer.id)
    .order("year")
    .limit(600);
  if (!entries || entries.length === 0) return [];
  const byUser = new Map<string, JourneyEntry[]>();
  for (const e of entries) byUser.set(e.user_id, [...(byUser.get(e.user_id) ?? []), e]);
  const ids = [...byUser.keys()];
  const [{ data: people }, { data: goals }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, headline, university, degree, major").in("id", ids),
    goalCareerId
      ? supabase.from("career_goals").select("user_id").eq("career_id", goalCareerId).in("user_id", ids)
      : Promise.resolve({ data: [] as { user_id: string }[] }),
  ]);
  const sameGoal = new Set((goals ?? []).map((g) => g.user_id));
  const words = (s: string | null | undefined) => new Set((s ?? "").toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3));
  const viewerWords = words(`${viewer.major ?? ""} ${viewer.degree ?? ""} ${viewer.headline ?? ""}`);
  return (people ?? [])
    .map((p) => {
      let similarity = 0;
      if (sameGoal.has(p.id)) similarity += 3;
      if (viewer.university && p.university && p.university === viewer.university) similarity += 2;
      for (const w of words(`${p.major ?? ""} ${p.degree ?? ""} ${p.headline ?? ""}`)) if (viewerWords.has(w)) similarity += 1;
      return { ...p, entries: byUser.get(p.id) ?? [], similarity };
    })
    .sort((a, b) => b.similarity - a.similarity || b.entries.length - a.entries.length)
    .slice(0, limit);
}
