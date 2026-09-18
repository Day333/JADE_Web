import "server-only";

import { redirect } from "next/navigation";
import type { JobMatch } from "@/lib/ai/matching";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CareerProfileData, Job } from "@/lib/types";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Recruiter pages: require a recruiter with a company (otherwise send them to set one up). */
export async function requireRecruiterWithCompany() {
  const profile = await requireProfile({ role: "recruiter" });
  if (!profile.company_id) redirect("/employer/company");
  const supabase = await createClient();
  const { data: company } = await supabase.from("companies").select("*").eq("id", profile.company_id).maybeSingle();
  if (!company) redirect("/employer/company");
  return { profile, company };
}

/** Every job of the recruiter's company (open, draft and closed), newest first. */
export async function loadCompanyJobs(companyId: string): Promise<Job[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
  return data ?? [];
}

/**
 * Career profiles for many candidates in a handful of queries (instead of one
 * loadCareerProfile per person). Row level security decides what is visible;
 * career preferences are private to their owner, so they are always null here.
 */
export async function loadCandidateProfiles(ids: string[]): Promise<Map<string, CareerProfileData>> {
  const unique = [...new Set(ids)].filter((id) => UUID.test(id));
  const result = new Map<string, CareerProfileData>();
  if (unique.length === 0) return result;
  const supabase = await createClient();
  const [profiles, skills, educations, experiences, projects, certifications, portfolio, goals] = await Promise.all([
    supabase.from("profiles").select("*").in("id", unique),
    supabase.from("user_skills").select("*").in("user_id", unique),
    supabase.from("educations").select("*").in("user_id", unique).order("position").order("created_at"),
    supabase.from("experiences").select("*").in("user_id", unique).order("position").order("created_at"),
    supabase.from("projects").select("*").in("user_id", unique).order("created_at", { ascending: false }),
    supabase.from("certifications").select("*").in("user_id", unique).order("created_at"),
    supabase.from("portfolio_items").select("*").in("user_id", unique).order("created_at"),
    supabase.from("career_goals").select("*").in("user_id", unique),
  ]);
  const group = <T extends { user_id: string }>(rows: T[] | null) => {
    const map = new Map<string, T[]>();
    for (const row of rows ?? []) {
      const list = map.get(row.user_id) ?? [];
      list.push(row);
      map.set(row.user_id, list);
    }
    return map;
  };
  const bySkills = group(skills.data);
  const byEducations = group(educations.data);
  const byExperiences = group(experiences.data);
  const byProjects = group(projects.data);
  const byCertifications = group(certifications.data);
  const byPortfolio = group(portfolio.data);
  const byGoal = new Map((goals.data ?? []).map((g) => [g.user_id, g]));
  for (const profile of profiles.data ?? []) {
    result.set(profile.id, {
      profile,
      skills: bySkills.get(profile.id) ?? [],
      educations: byEducations.get(profile.id) ?? [],
      experiences: byExperiences.get(profile.id) ?? [],
      projects: byProjects.get(profile.id) ?? [],
      certifications: byCertifications.get(profile.id) ?? [],
      portfolio: byPortfolio.get(profile.id) ?? [],
      preferences: null,
      goal: byGoal.get(profile.id) ?? null,
    });
  }
  return result;
}

/** Open-to-opportunity job seekers a recruiter may discover (newest profiles first). */
export async function loadOpenCandidateIds(limit = 30): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "seeker")
    .eq("open_to_opportunities", true)
    .eq("onboarding_step", "done")
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((p) => p.id);
}

/** Recruiter-facing wording for a JobMatch verdict. */
export function fitLabel(match: JobMatch) {
  return match.verdict === "ready" ? "Strong fit" : match.verdict === "good" ? "Good fit" : "Stretch";
}

/** Unread conversations for the current user (same rule as the header badge). */
export async function unreadConversationCount(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversation_members")
    .select("last_read_at, conversations(last_message_at)")
    .eq("user_id", userId);
  return (data ?? []).filter((m) => m.conversations && new Date(m.conversations.last_message_at) > new Date(m.last_read_at)).length;
}
