"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FollowTarget } from "@/lib/types";

/** Follow or unfollow a person, career, company, community or topic. */
export async function toggleFollow(targetType: FollowTarget, targetId: string, path?: string) {
  const userId = await getUserId();
  if (!userId) redirect("/auth/login");
  if (targetType === "user" && targetId === userId) return { following: false };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();
  if (existing) {
    await supabase.from("follows").delete().eq("follower_id", userId).eq("target_type", targetType).eq("target_id", targetId);
  } else {
    await supabase.from("follows").insert({ follower_id: userId, target_type: targetType, target_id: targetId });
  }
  if (path) revalidatePath(path);
  return { following: !existing };
}

export type StartConversationResult = { error: string } | undefined;

const MESSAGING_ERRORS: Record<string, string> = {
  messaging_not_allowed: "This person is not accepting messages from you right now.",
  cannot_message_self: "You cannot message yourself.",
  user_not_found: "That user no longer exists.",
};

/**
 * Open (or reuse) a conversation and go to it. Pass a job id to start a
 * recruiter chat about that job. Returns an error message if the other
 * person's privacy settings do not allow it.
 */
export async function startConversation(otherUserId: string, jobId?: string | null): Promise<StartConversationResult> {
  const userId = await getUserId();
  if (!userId) redirect("/auth/login");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_conversation", {
    p_other: otherUserId,
    ...(jobId ? { p_job: jobId } : {}),
  });
  if (error || !data) {
    const key = Object.keys(MESSAGING_ERRORS).find((k) => error?.message.includes(k));
    return { error: key ? MESSAGING_ERRORS[key] : "Could not start the conversation." };
  }
  redirect(`/messages/${data}`);
}
