import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

/** The signed-in user's id, or null. Cached for the duration of a request. */
export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
});

/** The signed-in user's profile row, or null. */
export const getMyProfile = cache(async (): Promise<Profile | null> => {
  const userId = await getUserId();
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data;
});

export function homePathFor(profile: Pick<Profile, "role" | "onboarding_step">) {
  if (profile.onboarding_step !== "done") return "/onboarding";
  return profile.role === "recruiter" ? "/employer" : "/dashboard";
}

/**
 * Require a signed-in user with a finished onboarding.
 * Pass `role` to restrict a page to job seekers or recruiters; other roles
 * are sent to their own home page.
 */
export async function requireProfile(options: { role?: UserRole; allowOnboarding?: boolean } = {}) {
  const profile = await getMyProfile();
  if (!profile) redirect("/auth/login");
  if (!options.allowOnboarding && profile.onboarding_step !== "done") redirect("/onboarding");
  if (options.role && profile.role !== options.role) redirect(homePathFor(profile));
  return profile;
}
