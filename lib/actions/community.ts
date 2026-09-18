"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Comment, JourneyEntry, PostType, Profile } from "@/lib/types";

const POST_TYPES: PostType[] = [
  "experience",
  "career_journey",
  "interview",
  "company_review",
  "graduate_program",
  "internship",
  "question",
  "resource",
];

async function requireUserId() {
  const userId = await getUserId();
  if (!userId) redirect("/auth/login");
  return userId;
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export interface PostFormState {
  error?: string;
  fieldErrors?: Partial<Record<"type" | "title" | "body" | "tags" | "community", string>>;
  values?: { type: string; community: string; title: string; body: string; tags: string };
}

function parseTags(raw: string) {
  const tags = raw
    .split(",")
    .map((t) => t.trim().replace(/^#/, "").replace(/\s+/g, " "))
    .filter(Boolean)
    .map((t) => t.slice(0, 40));
  return [...new Map(tags.map((t) => [t.toLowerCase(), t])).values()].slice(0, 8);
}

export async function createPost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const userId = await requireUserId();
  const values = {
    type: String(formData.get("type") ?? ""),
    community: String(formData.get("community") ?? ""),
    title: String(formData.get("title") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
    tags: String(formData.get("tags") ?? ""),
  };
  const fieldErrors: PostFormState["fieldErrors"] = {};
  if (!POST_TYPES.includes(values.type as PostType)) fieldErrors.type = "Choose what kind of post this is.";
  if (values.title.length < 3) fieldErrors.title = "Give your post a title (at least 3 characters).";
  if (values.title.length > 200) fieldErrors.title = "Keep the title under 200 characters.";
  if (values.body.length < 1) fieldErrors.body = "Write something for the community.";
  if (values.body.length > 20000) fieldErrors.body = "Posts can be up to 20,000 characters.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  const supabase = await createClient();
  let communityId: string | null = null;
  let communitySlug: string | null = null;
  if (values.community && values.community !== "none") {
    const { data: community } = await supabase
      .from("communities")
      .select("id, slug")
      .eq("slug", values.community)
      .maybeSingle();
    if (!community) return { fieldErrors: { community: "That community no longer exists." }, values };
    communityId = community.id;
    communitySlug = community.slug;
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: userId,
      community_id: communityId,
      type: values.type as PostType,
      title: values.title,
      body: values.body,
      tags: parseTags(values.tags),
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Your post could not be published. Please try again.", values };

  revalidatePath("/community");
  if (communitySlug) revalidatePath(`/community/c/${communitySlug}`);
  revalidatePath(`/u/${userId}`);
  redirect(`/community/post/${data.id}`);
}

export async function deletePost(postId: string): Promise<{ error: string } | undefined> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", userId)
    .select("id, community:communities!posts_community_id_fkey(slug)");
  if (error || !data || data.length === 0) return { error: "This post could not be deleted." };
  revalidatePath("/community");
  const slug = data[0].community?.slug;
  if (slug) revalidatePath(`/community/c/${slug}`);
  revalidatePath(`/u/${userId}`);
  redirect("/community");
}

export async function togglePostLike(postId: string, like: boolean): Promise<{ liked: boolean; error?: string }> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { error } = like
    ? await supabase.from("post_likes").upsert({ post_id: postId, user_id: userId }, { ignoreDuplicates: true })
    : await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
  if (error) return { liked: !like, error: "Could not update your like." };
  revalidatePath(`/community/post/${postId}`);
  return { liked: like };
}

export async function togglePostSave(postId: string, save: boolean): Promise<{ saved: boolean; error?: string }> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { error } = save
    ? await supabase.from("post_saves").upsert({ post_id: postId, user_id: userId }, { ignoreDuplicates: true })
    : await supabase.from("post_saves").delete().eq("post_id", postId).eq("user_id", userId);
  if (error) return { saved: !save, error: "Could not update your saved posts." };
  revalidatePath(`/community/post/${postId}`);
  return { saved: save };
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export type CommentWithAuthor = Comment & { author: Pick<Profile, "id" | "full_name" | "headline" | "role"> | null };

export async function addComment(postId: string, body: string): Promise<{ comment?: CommentWithAuthor; error?: string }> {
  const userId = await requireUserId();
  const text = body.trim();
  if (!text) return { error: "Write a comment first." };
  if (text.length > 5000) return { error: "Comments can be up to 5,000 characters." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: userId, body: text })
    .select("*, author:profiles!comments_author_id_fkey(id, full_name, headline, role)")
    .single();
  if (error || !data) return { error: "Your comment could not be posted." };
  revalidatePath(`/community/post/${postId}`);
  return { comment: data as unknown as CommentWithAuthor };
}

export async function deleteComment(commentId: string, postId: string): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", userId)
    .select("id");
  if (error || !data || data.length === 0) return { error: "This comment could not be deleted." };
  revalidatePath(`/community/post/${postId}`);
  return {};
}

// ---------------------------------------------------------------------------
// Career Journey
// ---------------------------------------------------------------------------

export interface JourneyInput {
  year: number;
  title: string;
  subtitle?: string | null;
  description?: string | null;
}

const CURRENT_YEAR = () => new Date().getFullYear();

function validateJourney(input: JourneyInput): { value?: JourneyInput; error?: string } {
  const year = Number(input.year);
  if (!Number.isInteger(year) || year < 1950 || year > CURRENT_YEAR() + 15) {
    return { error: `Enter a year between 1950 and ${CURRENT_YEAR() + 15}.` };
  }
  const title = String(input.title ?? "").trim();
  if (title.length < 2) return { error: "Give this milestone a title." };
  if (title.length > 120) return { error: "Keep the title under 120 characters." };
  const subtitle = String(input.subtitle ?? "").trim();
  if (subtitle.length > 120) return { error: "Keep the subtitle under 120 characters." };
  const description = String(input.description ?? "").trim();
  if (description.length > 1000) return { error: "Keep the description under 1,000 characters." };
  return { value: { year, title, subtitle: subtitle || null, description: description || null } };
}

function revalidateJourney(userId: string) {
  revalidatePath("/journey");
  revalidatePath(`/u/${userId}`);
}

export async function saveJourneyEntry(
  input: JourneyInput & { id?: string },
): Promise<{ entry?: JourneyEntry; error?: string }> {
  const userId = await requireUserId();
  const { value, error } = validateJourney(input);
  if (!value) return { error };
  const supabase = await createClient();
  const row = { year: value.year, title: value.title, subtitle: value.subtitle, description: value.description };
  const result = input.id
    ? await supabase.from("journey_entries").update(row).eq("id", input.id).eq("user_id", userId).select("*").single()
    : await supabase
        .from("journey_entries")
        .insert({ ...row, user_id: userId })
        .select("*")
        .single();
  if (result.error || !result.data) return { error: "This milestone could not be saved." };
  revalidateJourney(userId);
  return { entry: result.data };
}

export async function addJourneyEntries(inputs: JourneyInput[]): Promise<{ entries?: JourneyEntry[]; error?: string }> {
  const userId = await requireUserId();
  if (!Array.isArray(inputs) || inputs.length === 0) return { error: "Choose at least one milestone." };
  if (inputs.length > 30) return { error: "Add at most 30 milestones at a time." };
  const rows = [];
  for (const input of inputs) {
    const { value, error } = validateJourney(input);
    if (!value) return { error: `${input.title || "A milestone"}: ${error}` };
    rows.push({ ...value, user_id: userId });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("journey_entries").insert(rows).select("*");
  if (error || !data) return { error: "These milestones could not be added." };
  revalidateJourney(userId);
  return { entries: data };
}

export async function deleteJourneyEntry(id: string): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase.from("journey_entries").delete().eq("id", id).eq("user_id", userId).select("id");
  if (error || !data || data.length === 0) return { error: "This milestone could not be deleted." };
  revalidateJourney(userId);
  return {};
}
