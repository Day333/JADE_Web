"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Statuses that mean "this application has been submitted and is still with the employer". */
const SUBMITTED: ApplicationStatus[] = ["applied", "viewed", "screening", "interview", "offer", "rejected"];

async function seekerOrNull() {
  const profile = await getMyProfile();
  if (!profile) redirect("/auth/login");
  return profile.role === "seeker" ? profile : null;
}

function revalidateSeeker(jobId?: string, applicationId?: string) {
  revalidatePath("/jobs");
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  if (jobId) revalidatePath(`/jobs/${jobId}`);
  if (applicationId) revalidatePath(`/applications/${applicationId}`);
}

export type SaveJobResult = { saved: boolean; status?: ApplicationStatus; error?: string };

/** Save a job to the tracker (an application row with status "saved"), or remove it again. */
export async function toggleSaveJob(jobId: string): Promise<SaveJobResult> {
  const profile = await seekerOrNull();
  if (!profile) return { saved: false, error: "Only job seekers can save jobs." };
  if (!UUID.test(jobId)) return { saved: false, error: "Unknown job." };

  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("applications")
    .select("id, status")
    .eq("job_id", jobId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (readError) return { saved: false, error: readError.message };

  if (!existing) {
    const { error } = await supabase.from("applications").insert({ job_id: jobId, user_id: profile.id, status: "saved" });
    if (error) return { saved: false, error: error.message };
    revalidateSeeker(jobId);
    return { saved: true };
  }
  if (existing.status === "saved") {
    const { error } = await supabase.from("applications").delete().eq("id", existing.id);
    if (error) return { saved: true, error: error.message };
    revalidateSeeker(jobId);
    return { saved: false };
  }
  return {
    saved: false,
    status: existing.status,
    error: existing.status === "withdrawn" ? "You withdrew from this job. Re-apply from the job page." : "You have already applied for this job.",
  };
}

export interface ApplyState {
  error?: string;
}

/** Submit the reviewed application. Bound to the job id. */
export async function submitApplication(jobId: string, _prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const profile = await seekerOrNull();
  if (!profile) return { error: "Only job seeker accounts can apply for jobs." };
  if (!UUID.test(jobId)) return { error: "Unknown job." };

  const supabase = await createClient();
  const resumeId = String(formData.get("resume_id") ?? "");
  const coverLetter = String(formData.get("cover_letter") ?? "").trim();
  if (coverLetter.length > 5000) return { error: "Your cover letter is too long (5,000 characters max)." };
  const shareProfile = formData.get("share_profile") === "on";
  const sharePortfolio = formData.get("share_portfolio") === "on";

  const [{ data: job }, { data: existing }, resume] = await Promise.all([
    supabase.from("jobs").select("id, status").eq("id", jobId).maybeSingle(),
    supabase.from("applications").select("id, status").eq("job_id", jobId).eq("user_id", profile.id).maybeSingle(),
    resumeId && resumeId !== "none" && UUID.test(resumeId)
      ? supabase.from("resumes").select("id").eq("id", resumeId).eq("user_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!job || job.status !== "open") return { error: "This job is no longer accepting applications." };
  if (resumeId && resumeId !== "none" && !resume.data) return { error: "Choose one of your own resumes." };
  if (existing && SUBMITTED.includes(existing.status)) redirect(`/applications/${existing.id}`);

  const values = {
    status: "applied" as const,
    resume_id: resume.data?.id ?? null,
    cover_letter: coverLetter || null,
    share_profile: shareProfile,
    share_portfolio: sharePortfolio,
  };

  let applicationId: string;
  if (existing) {
    // A saved (or withdrawn) row becomes the application.
    const { data, error } = await supabase.from("applications").update(values).eq("id", existing.id).select("id").maybeSingle();
    if (error || !data) return { error: error?.message ?? "Could not submit your application." };
    applicationId = data.id;
  } else {
    const { data, error } = await supabase
      .from("applications")
      .insert({ ...values, job_id: jobId, user_id: profile.id })
      .select("id")
      .single();
    if (error || !data) return { error: error?.message ?? "Could not submit your application." };
    applicationId = data.id;
  }

  // Applying answers any pending "invited you to apply" invitation.
  await supabase
    .from("invitations")
    .update({ status: "accepted" })
    .eq("job_id", jobId)
    .eq("candidate_id", profile.id)
    .eq("kind", "apply")
    .eq("status", "pending");

  revalidateSeeker(jobId, applicationId);
  redirect(`/applications/${applicationId}?submitted=1`);
}

export async function withdrawApplication(applicationId: string, note?: string): Promise<{ ok: boolean; error?: string }> {
  const profile = await seekerOrNull();
  if (!profile) return { ok: false, error: "Only job seekers can withdraw applications." };
  if (!UUID.test(applicationId)) return { ok: false, error: "Unknown application." };
  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select("job_id, status")
    .eq("id", applicationId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!app) return { ok: false, error: "Application not found." };
  if (app.status === "withdrawn") return { ok: true };
  const cleanNote = (note ?? "").trim().slice(0, 500);
  const { error } = await supabase.rpc("set_application_status", {
    p_application: applicationId,
    p_status: "withdrawn",
    ...(cleanNote ? { p_note: cleanNote } : {}),
  });
  if (error) return { ok: false, error: error.message };
  revalidateSeeker(app.job_id, applicationId);
  return { ok: true };
}

export type InvitationResponse = { ok: true; kind: "apply" | "interview"; jobId: string } | { ok: false; error: string };

export async function respondToInvitation(invitationId: string, accept: boolean): Promise<InvitationResponse> {
  const profile = await seekerOrNull();
  if (!profile) return { ok: false, error: "Only job seekers can answer invitations." };
  if (!UUID.test(invitationId)) return { ok: false, error: "Unknown invitation." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitations")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", invitationId)
    .eq("candidate_id", profile.id)
    .eq("status", "pending")
    .select("kind, job_id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "This invitation was already answered." };
  revalidateSeeker(data.job_id);
  return { ok: true, kind: data.kind, jobId: data.job_id };
}
