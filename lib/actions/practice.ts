"use server";

import { revalidatePath } from "next/cache";
import { getMyProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface UnlockedAchievement {
  name: string;
  icon: string;
}

type Result = { ok: true; unlocked: UnlockedAchievement[] } | { ok: false; error: string };

/**
 * Re-derives achievements from the data and returns anything newly earned
 * (the RPC also writes a notification per new badge).
 */
async function awardAchievements(): Promise<UnlockedAchievement[]> {
  const supabase = await createClient();
  const { data: newIds } = await supabase.rpc("refresh_achievements");
  if (!newIds || newIds.length === 0) return [];
  const { data } = await supabase.from("achievements").select("name, icon").in("id", newIds);
  return data ?? [];
}

/** Tick or untick a practice question, then run the achievement pass. */
export async function setQuestionDone(questionId: string, done: boolean): Promise<Result> {
  const profile = await getMyProfile();
  if (!profile) return { ok: false, error: "Please sign in first." };
  const supabase = await createClient();
  const { error } = done
    ? await supabase.from("practice_progress").upsert({ user_id: profile.id, question_id: questionId })
    : await supabase.from("practice_progress").delete().eq("user_id", profile.id).eq("question_id", questionId);
  if (error) return { ok: false, error: "Could not save your progress. Please try again." };
  const unlocked = done ? await awardAchievements() : [];
  revalidatePath("/practice");
  revalidatePath("/progress");
  return { ok: true, unlocked };
}
