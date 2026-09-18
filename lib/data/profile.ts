import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CareerProfileData } from "@/lib/types";

/**
 * Load everything that makes up a user's Career Profile. Row level security
 * decides what the current viewer is allowed to see; hidden sections simply
 * come back empty.
 */
export const loadCareerProfile = cache(async (userId: string): Promise<CareerProfileData | null> => {
  const supabase = await createClient();
  const [profile, skills, educations, experiences, projects, certifications, portfolio, preferences, goal] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_skills").select("*").eq("user_id", userId),
      supabase.from("educations").select("*").eq("user_id", userId).order("position").order("created_at"),
      supabase.from("experiences").select("*").eq("user_id", userId).order("position").order("created_at"),
      supabase.from("projects").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("certifications").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("portfolio_items").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("career_preferences").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("career_goals").select("*").eq("user_id", userId).maybeSingle(),
    ]);
  if (!profile.data) return null;
  return {
    profile: profile.data,
    skills: skills.data ?? [],
    educations: educations.data ?? [],
    experiences: experiences.data ?? [],
    projects: projects.data ?? [],
    certifications: certifications.data ?? [],
    portfolio: portfolio.data ?? [],
    preferences: preferences.data ?? null,
    goal: goal.data ?? null,
  };
});
