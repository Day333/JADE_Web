import "server-only";

import { cache } from "react";
import { matchJob, type JobMatch } from "@/lib/ai/matching";
import { createClient } from "@/lib/supabase/server";
import type { CareerProfileData, Catalog, Company, Job } from "@/lib/types";

type CompanyCard = Pick<Company, "id" | "name" | "slug" | "industry" | "location" | "is_sample">;

/** List rows skip the long JD fields — with hundreds of imported postings the full descriptions would dwarf every page that ranks jobs. */
export type JobWithCompany = Omit<Job, "description" | "responsibilities" | "requirements" | "preferred_qualifications"> & { company: CompanyCard | null };
export type JobDetail = Job & { company: CompanyCard | null };

const COMPANY_SELECT = "company:companies(id, name, slug, industry, location, is_sample)";
const JOB_LIST_SELECT = `id, company_id, posted_by, title, location, job_type, industry, career_id, experience_level, education_requirement, salary_range, required_skills, preferred_skills, grad_years, deadline, status, is_sample, source_board, source_external_id, source_url, source_posted_at, source_group, description_is_excerpt, created_at, updated_at, ${COMPANY_SELECT}`;

/** All open jobs with their company, newest first. */
export const loadOpenJobs = cache(async (): Promise<JobWithCompany[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select(JOB_LIST_SELECT)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(2000);
  return (data ?? []) as JobWithCompany[];
});

export async function loadJob(jobId: string): Promise<JobDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select(`*, ${COMPANY_SELECT}`).eq("id", jobId).maybeSingle();
  return (data as JobDetail | null) ?? null;
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
