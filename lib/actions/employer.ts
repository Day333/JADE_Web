"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/auth";
import { getCatalog } from "@/lib/data/catalog";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus, JobType } from "@/lib/types";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

/** State returned to forms driven by useActionState. */
export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const JOB_TYPES: JobType[] = ["internship", "graduate", "part_time", "full_time"];
const JOB_STATUSES = ["open", "draft", "closed"] as const;
const RECRUITER_STATUSES: ApplicationStatus[] = ["viewed", "screening", "interview", "offer", "rejected"];

async function recruiterOrNull() {
  const profile = await getMyProfile();
  if (!profile) redirect("/auth/login");
  return profile.role === "recruiter" ? profile : null;
}

function isRlsError(error: { code?: string; message?: string } | null) {
  return Boolean(error && (error.code === "42501" || /row-level security/i.test(error.message ?? "")));
}

function text(formData: FormData, key: string, max = 200) {
  const value = String(formData.get(key) ?? "").trim();
  return value.slice(0, max);
}

function lines(formData: FormData, key: string) {
  return String(formData.get(key) ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((l) => l.slice(0, 300));
}

function revalidateEmployer(jobId?: string, candidateId?: string) {
  revalidatePath("/employer");
  revalidatePath("/employer/discover");
  if (jobId) revalidatePath(`/employer/jobs/${jobId}/candidates`);
  if (candidateId) revalidatePath(`/employer/candidates/${candidateId}`);
}

// ---------------------------------------------------------------------------
// Company
// ---------------------------------------------------------------------------

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "company"
  );
}

function normaliseUrl(value: string) {
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    return url.hostname.includes(".") ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Create the recruiter's company (and link it to their profile) or update it. */
export async function saveCompany(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await recruiterOrNull();
  if (!profile) return { error: "Only recruiter accounts can manage a company." };

  const name = text(formData, "name", 120);
  const websiteRaw = text(formData, "website", 200);
  const website = normaliseUrl(websiteRaw);
  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Enter your company's name.";
  if (websiteRaw && !website) fieldErrors.website = "Enter a valid website address, e.g. https://example.com";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const values = {
    name,
    industry: text(formData, "industry", 120) || null,
    location: text(formData, "location", 120) || null,
    size: text(formData, "size", 40) || null,
    website,
    description: text(formData, "description", 4000) || null,
  };

  const supabase = await createClient();
  if (profile.company_id) {
    const { data, error } = await supabase
      .from("companies")
      .update(values)
      .eq("id", profile.company_id)
      .select("id")
      .maybeSingle();
    if (error || !data) return { error: error?.message ?? "You don't have permission to edit this company." };
    revalidatePath("/employer", "layout");
    redirect("/employer?company=saved");
  }

  // New company: find a free slug.
  const base = slugify(name);
  let slug = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: taken } = await supabase.from("companies").select("id").eq("slug", slug).maybeSingle();
    if (!taken) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data: company, error } = await supabase
    .from("companies")
    .insert({ ...values, slug, created_by: profile.id, is_sample: false })
    .select("id")
    .single();
  if (error || !company) return { error: error?.message ?? "Could not create the company." };

  const { error: linkError } = await supabase.from("profiles").update({ company_id: company.id }).eq("id", profile.id);
  if (linkError) return { error: `Company created, but linking it to your profile failed: ${linkError.message}` };

  revalidatePath("/", "layout");
  redirect("/employer?company=created");
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

/** Create a job (jobId undefined) or update one the recruiter manages. */
export async function saveJob(jobId: string | undefined, _prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await recruiterOrNull();
  if (!profile) return { error: "Only recruiter accounts can post jobs." };
  if (!profile.company_id) return { error: "Set up your company before posting a job." };
  if (jobId && !UUID.test(jobId)) return { error: "Unknown job." };

  const catalog = await getCatalog();
  const fieldErrors: Record<string, string> = {};

  const title = text(formData, "title", 120);
  if (title.length < 3) fieldErrors.title = "Give the job a title (at least 3 characters).";

  const jobType = String(formData.get("job_type") ?? "") as JobType;
  if (!JOB_TYPES.includes(jobType)) fieldErrors.job_type = "Choose a job type.";

  const status = String(formData.get("status") ?? "open") as (typeof JOB_STATUSES)[number];
  if (!JOB_STATUSES.includes(status)) fieldErrors.status = "Choose a status.";

  const careerId = text(formData, "career_id", 80);
  if (careerId && !catalog.careerById.has(careerId)) fieldErrors.career_id = "Choose a career from the list.";

  const deadline = text(formData, "deadline", 10);
  if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) fieldErrors.deadline = "Use a valid date.";

  const skillIds = (key: string) =>
    [...new Set(formData.getAll(key).map(String))].filter((id) => catalog.skillById.has(id)).slice(0, 20);
  const requiredSkills = skillIds("required_skills");
  const preferredSkills = skillIds("preferred_skills").filter((id) => !requiredSkills.includes(id));
  if (status === "open" && requiredSkills.length === 0) {
    fieldErrors.required_skills = "Add at least one required skill so we can match candidates.";
  }

  const gradYears = [...new Set(formData.getAll("grad_years").map((v) => Number(v)))]
    .filter((y) => Number.isInteger(y) && y >= 2000 && y <= 2100)
    .sort();

  const description = text(formData, "description", 10000);
  if (status === "open" && description.length < 20) {
    fieldErrors.description = "Describe the role in a few sentences (at least 20 characters).";
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, error: "Please fix the highlighted fields." };

  const values = {
    title,
    location: text(formData, "location", 120) || null,
    job_type: jobType,
    industry: text(formData, "industry", 120) || null,
    career_id: careerId || null,
    experience_level: text(formData, "experience_level", 120) || null,
    education_requirement: text(formData, "education_requirement", 200) || null,
    salary_range: text(formData, "salary_range", 120) || null,
    description: description || null,
    responsibilities: lines(formData, "responsibilities"),
    requirements: lines(formData, "requirements"),
    preferred_qualifications: lines(formData, "preferred_qualifications"),
    required_skills: requiredSkills,
    preferred_skills: preferredSkills,
    grad_years: gradYears,
    deadline: deadline || null,
    status,
  };

  const supabase = await createClient();
  let id = jobId;
  if (jobId) {
    const { data, error } = await supabase.from("jobs").update(values).eq("id", jobId).select("id").maybeSingle();
    if (error || !data) return { error: error?.message ?? "You don't have permission to edit this job." };
  } else {
    // The id is generated here and the insert returns nothing: with RETURNING, Postgres checks the
    // jobs SELECT policy (open, or is_job_manager) inside the same statement, where the new row is
    // not yet visible to is_job_manager(), so draft/closed jobs would be rejected.
    id = crypto.randomUUID();
    const { error } = await supabase
      .from("jobs")
      .insert({ ...values, id, posted_by: profile.id, company_id: profile.company_id, is_sample: false });
    if (error) {
      return { error: isRlsError(error) ? "Your account can't post jobs for this company." : error.message };
    }
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
  revalidatePath("/employer");
  redirect(`/employer/jobs/${id}/candidates?${jobId ? "updated" : status === "open" ? "published" : "created"}=1`);
}

export async function deleteJob(jobId: string): Promise<ActionResult> {
  const profile = await recruiterOrNull();
  if (!profile) return { ok: false, error: "Only recruiters can delete jobs." };
  if (!UUID.test(jobId)) return { ok: false, error: "Unknown job." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("jobs").delete().eq("id", jobId).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "You don't have permission to delete this job." };
  revalidatePath("/jobs");
  revalidatePath("/employer");
  redirect("/employer?job=deleted");
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

const STATUS_ERRORS: Record<string, string> = {
  invalid_status_for_recruiter: "Recruiters can only move applications to Viewed, Screening, Interview, Offer or Rejected.",
  not_allowed: "You don't manage this job.",
  application_not_found: "This application no longer exists.",
};

function rpcError(message: string | undefined) {
  const key = Object.keys(STATUS_ERRORS).find((k) => message?.includes(k));
  return key ? STATUS_ERRORS[key] : (message ?? "Something went wrong.");
}

export async function setApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
  note?: string,
): Promise<ActionResult> {
  const profile = await recruiterOrNull();
  if (!profile) return { ok: false, error: "Only recruiters can change an application's status." };
  if (!UUID.test(applicationId)) return { ok: false, error: "Unknown application." };
  if (!RECRUITER_STATUSES.includes(status)) return { ok: false, error: "That status isn't available." };

  const supabase = await createClient();
  const { data: app } = await supabase.from("applications").select("job_id, user_id").eq("id", applicationId).maybeSingle();
  const cleanNote = (note ?? "").trim().slice(0, 1000);
  const { error } = await supabase.rpc("set_application_status", {
    p_application: applicationId,
    p_status: status,
    ...(cleanNote ? { p_note: cleanNote } : {}),
  });
  if (error) return { ok: false, error: rpcError(error.message) };
  revalidateEmployer(app?.job_id, app?.user_id);
  return { ok: true, message: `Moved to ${status.charAt(0).toUpperCase()}${status.slice(1)}.` };
}

export async function setShortlisted(applicationId: string, value: boolean): Promise<ActionResult> {
  const profile = await recruiterOrNull();
  if (!profile) return { ok: false, error: "Only recruiters can shortlist." };
  if (!UUID.test(applicationId)) return { ok: false, error: "Unknown application." };
  const supabase = await createClient();
  const { data: app } = await supabase.from("applications").select("job_id, user_id").eq("id", applicationId).maybeSingle();
  const { error } = await supabase.rpc("set_application_shortlisted", { p_application: applicationId, p_value: value });
  if (error) return { ok: false, error: rpcError(error.message) };
  revalidateEmployer(app?.job_id, app?.user_id);
  return { ok: true, message: value ? "Added to your shortlist." : "Removed from your shortlist." };
}

// ---------------------------------------------------------------------------
// Invitations & saved candidates
// ---------------------------------------------------------------------------

export async function inviteCandidate(
  candidateId: string,
  jobId: string,
  kind: "apply" | "interview",
  message?: string,
): Promise<ActionResult> {
  const profile = await recruiterOrNull();
  if (!profile) return { ok: false, error: "Only recruiters can send invitations." };
  if (!UUID.test(candidateId) || !UUID.test(jobId)) return { ok: false, error: "Unknown candidate or job." };
  if (kind !== "apply" && kind !== "interview") return { ok: false, error: "Unknown invitation type." };

  const supabase = await createClient();
  const [{ data: job }, { data: application }, { data: existing }] = await Promise.all([
    supabase.from("jobs").select("id, title, status").eq("id", jobId).maybeSingle(),
    supabase.from("applications").select("id, status").eq("job_id", jobId).eq("user_id", candidateId).maybeSingle(),
    supabase
      .from("invitations")
      .select("id")
      .eq("job_id", jobId)
      .eq("candidate_id", candidateId)
      .eq("kind", kind)
      .eq("status", "pending")
      .limit(1),
  ]);
  if (!job) return { ok: false, error: "You can only invite candidates to your own jobs." };
  if (kind === "apply" && job.status !== "open") return { ok: false, error: "Publish this job before inviting candidates to apply." };
  if (kind === "apply" && application) {
    return { ok: false, error: "This candidate has already applied for this job." };
  }
  if (existing && existing.length > 0) {
    return { ok: true, message: kind === "apply" ? "You already invited this candidate to apply." : "An interview invitation is already pending." };
  }

  const { error } = await supabase.from("invitations").insert({
    kind,
    job_id: jobId,
    candidate_id: candidateId,
    recruiter_id: profile.id,
    message: (message ?? "").trim().slice(0, 1000) || null,
  });
  if (error) {
    return {
      ok: false,
      error: isRlsError(error)
        ? "You can't invite this candidate: they are not open to opportunities or don't accept recruiter contact."
        : error.message,
    };
  }

  if (kind === "interview" && application && ["applied", "viewed", "screening"].includes(application.status)) {
    const { error: statusError } = await supabase.rpc("set_application_status", {
      p_application: application.id,
      p_status: "interview",
      p_note: "Invited to interview",
    });
    if (statusError) {
      revalidateEmployer(jobId, candidateId);
      return { ok: false, error: `Invitation sent, but the status could not be updated: ${rpcError(statusError.message)}` };
    }
  }

  revalidateEmployer(jobId, candidateId);
  return {
    ok: true,
    message: kind === "apply" ? `Invitation to apply for ${job.title} sent.` : `Interview invitation for ${job.title} sent.`,
  };
}

export async function toggleSaveCandidate(candidateId: string): Promise<{ saved: boolean; error?: string }> {
  const profile = await recruiterOrNull();
  if (!profile) return { saved: false, error: "Only recruiters can save candidates." };
  if (!UUID.test(candidateId)) return { saved: false, error: "Unknown candidate." };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("saved_candidates")
    .select("candidate_id")
    .eq("recruiter_id", profile.id)
    .eq("candidate_id", candidateId)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("saved_candidates")
      .delete()
      .eq("recruiter_id", profile.id)
      .eq("candidate_id", candidateId);
    if (error) return { saved: true, error: error.message };
  } else {
    const { error } = await supabase.from("saved_candidates").insert({ recruiter_id: profile.id, candidate_id: candidateId });
    if (error) return { saved: false, error: error.message };
  }
  revalidateEmployer(undefined, candidateId);
  return { saved: !existing };
}
