import "server-only";

import { cache } from "react";
import { matchJob, type JobMatch } from "@/lib/ai/matching";
import { createClient } from "@/lib/supabase/server";
import type { CareerProfileData, Catalog, Company, Job } from "@/lib/types";

export type JobWithCompany = Job & { company: Pick<Company, "id" | "name" | "slug" | "industry" | "location" | "is_sample"> | null };

const JOB_SELECT = "*, company:companies(id, name, slug, industry, location, is_sample)";

/** All open jobs with their company, newest first. */
export const loadOpenJobs = cache(async (): Promise<JobWithCompany[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select(JOB_SELECT)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []) as JobWithCompany[];
});

export async function loadJob(jobId: string): Promise<JobWithCompany | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select(JOB_SELECT).eq("id", jobId).maybeSingle();
  return (data as JobWithCompany | null) ?? null;
}

export interface RankedJob {
  job: JobWithCompany;
  match: JobMatch;
}

/** Score every job for this user, best match first. */
export function rankJobs(data: CareerProfileData, catalog: Catalog, jobs: JobWithCompany[]): RankedJob[] {
  return jobs
    .map((job) => ({ job, match: matchJob(data, catalog, job) }))
    .sort((a, b) => b.match.score - a.match.score);
}

/** Jobs that are a strong fit (the "We found N opportunities for you" number). */
export const STRONG_MATCH_THRESHOLD = 70;

export function strongMatches(ranked: RankedJob[]) {
  return ranked.filter((r) => r.match.score >= STRONG_MATCH_THRESHOLD);
}
