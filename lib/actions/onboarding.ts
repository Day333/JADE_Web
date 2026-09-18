"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMyProfile, homePathFor } from "@/lib/auth";
import { parseResume } from "@/lib/ai/index";
import { extractResumeText } from "@/lib/ai/extract-text";
import { PREFERENCE_QUESTIONS, WORK_TYPE_OPTIONS, scorePreferences } from "@/lib/ai/questionnaire";
import { getCatalog } from "@/lib/data/catalog";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";
import type { Profile } from "@/lib/types";
import { dedupeKey, normalizeUrl, slugify, type ProfileDraft } from "@/components/profile/model";
import { resolveSkillIds, skillsFromText } from "@/components/profile/server";
import {
  basicsRow,
  certificationRow,
  educationRow,
  errorMessage,
  experienceRow,
  level as toLevel,
  linksRow,
  list,
  longText,
  projectRow,
  text,
} from "@/components/profile/validate";

async function me(): Promise<Profile> {
  const profile = await getMyProfile();
  if (!profile) redirect("/auth/login");
  return profile;
}

// ---------------------------------------------------------------------------
// Step 1: role
// ---------------------------------------------------------------------------

export async function chooseSeekerRole(): Promise<{ error: string } | undefined> {
  const profile = await me();
  if (profile.onboarding_step === "done") redirect(homePathFor(profile));
  if (profile.onboarding_step === "role") {
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role: "seeker", onboarding_step: "resume" })
      .eq("id", profile.id);
    if (error) return { error: "We couldn't save your choice. Please try again." };
  }
  redirect("/onboarding/resume");
}

export interface CompanyFormState {
  error?: string;
  fields?: Record<string, string>;
}

export async function createRecruiterCompany(_prev: CompanyFormState | undefined, formData: FormData): Promise<CompanyFormState> {
  const profile = await me();
  if (profile.onboarding_step === "done") redirect(homePathFor(profile));
  const fields = Object.fromEntries(
    ["name", "industry", "location", "size", "website", "description", "headline"].map((k) => [
      k,
      String(formData.get(k) ?? ""),
    ]),
  );
  const name = text(fields.name, 120);
  if (name.length < 2) return { error: "Please enter your company's name.", fields };
  const website = normalizeUrl(fields.website);
  if (website === null) return { error: "The website doesn't look like a valid web address.", fields };

  const supabase = await createClient();
  const slug = `${slugify(name) || "company"}-${crypto.randomUUID().slice(0, 6)}`;
  const { data: company, error } = await supabase
    .from("companies")
    .insert({
      slug,
      name,
      industry: text(fields.industry, 80) || null,
      location: text(fields.location, 100) || null,
      size: text(fields.size, 40) || null,
      website: website || null,
      description: longText(fields.description, 2000) || null,
      is_sample: false,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !company) return { error: "We couldn't create your company. Please try again.", fields };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      role: "recruiter",
      company_id: company.id,
      headline: text(fields.headline, 140) || null,
      onboarding_step: "done",
    })
    .eq("id", profile.id);
  if (profileError) return { error: "Your company was created but we couldn't update your account. Please try again.", fields };

  revalidatePath("/", "layout");
  redirect("/employer");
}

// ---------------------------------------------------------------------------
// Step 2: resume
// ---------------------------------------------------------------------------

export type ProcessResumeResult = { error: string } | { empty: true; resumeId: string };

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * The browser has uploaded the file to storage; read it, extract the text,
 * parse it into a draft profile and store the resume row. The draft is only
 * written to the profile after the user confirms it on the review step.
 */
export async function processResume(input: {
  path: string;
  fileName: string;
  mimeType?: string;
  update?: boolean;
}): Promise<ProcessResumeResult> {
  const profile = await me();
  const path = String(input.path ?? "");
  const fileName = text(input.fileName, 200) || "resume";
  if (!path.startsWith(`${profile.id}/`) || path.includes("..") || path.length > 400) {
    return { error: "That upload doesn't belong to your account." };
  }
  const supabase = await createClient();
  // Storage can take a moment to serve a file that was just uploaded, so retry once.
  let download = await supabase.storage.from("resumes").download(path);
  if (download.error || !download.data) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    download = await supabase.storage.from("resumes").download(path);
  }
  const blob = download.data;
  if (download.error || !blob) {
    console.error("processResume: download failed", download.error);
    return { error: "We couldn't read the uploaded file. Please try uploading it again." };
  }
  if (blob.size > MAX_BYTES) {
    await supabase.storage.from("resumes").remove([path]);
    return { error: "That file is larger than 10 MB." };
  }

  let rawText = "";
  try {
    // Postgres text/jsonb can't store NUL characters, which some PDFs contain.
    rawText = (await extractResumeText(await blob.arrayBuffer(), fileName, input.mimeType)).replace(/\u0000/g, "");
  } catch {
    rawText = "";
  }
  const readable = rawText.replace(/\s+/g, " ").trim().length >= 40;
  const parsed = readable ? await parseResume(rawText, await getCatalog()) : null;

  // The id is generated here because the resumes SELECT policy can't see a
  // row inside its own INSERT statement, so `insert().select()` is refused.
  const row = { id: crypto.randomUUID() };
  const { error: insertError } = await supabase.from("resumes").insert({
    id: row.id,
    user_id: profile.id,
    file_path: path,
    file_name: fileName,
    raw_text: rawText ? rawText.slice(0, 100_000) : null,
    parsed: parsed as unknown as Json,
    is_primary: true,
  });
  if (insertError) {
    await supabase.storage.from("resumes").remove([path]);
    return { error: "We couldn't save your resume. Please try again." };
  }
  await supabase.from("resumes").update({ is_primary: false }).eq("user_id", profile.id).neq("id", row.id);

  const onboarding = !input.update && profile.onboarding_step !== "done";
  if (onboarding && profile.onboarding_step !== "review") {
    await supabase.from("profiles").update({ onboarding_step: "review" }).eq("id", profile.id);
  }
  revalidatePath("/profile");

  if (!parsed) return { empty: true, resumeId: row.id };
  redirect(`/onboarding/review?resume=${row.id}${onboarding ? "" : "&update=1"}`);
}

/** "I don't have a resume" — continue to the review step with an empty draft. */
export async function skipResume(update = false): Promise<{ error: string } | undefined> {
  const profile = await me();
  const onboarding = !update && profile.onboarding_step !== "done";
  if (onboarding && (profile.onboarding_step === "resume" || profile.onboarding_step === "role")) {
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").update({ onboarding_step: "review" }).eq("id", profile.id);
    if (error) return { error: "Something went wrong. Please try again." };
  }
  redirect(`/onboarding/review?manual=1${onboarding ? "" : "&update=1"}`);
}

// ---------------------------------------------------------------------------
// Step 3: review & confirm
// ---------------------------------------------------------------------------

/**
 * Save the confirmed draft. New items are added; items already on the
 * profile (same school + degree, title + organisation, project name or
 * certification name) are skipped and skill levels only ever go up.
 */
export async function confirmProfile(
  draft: ProfileDraft,
  mode: "onboarding" | "update",
): Promise<{ error: string } | undefined> {
  const profile = await me();
  if (profile.role !== "seeker") redirect(homePathFor(profile));
  const onboarding = mode === "onboarding" && profile.onboarding_step !== "done";
  const supabase = await createClient();
  const userId = profile.id;

  try {
    const catalog = await getCatalog();
    const basics = basicsRow(draft.basics);
    const links = linksRow(draft.links);
    const educations = (draft.educations ?? []).slice(0, 20).map(educationRow);
    const experiences = (draft.experiences ?? []).slice(0, 40).map((e) => {
      const row = experienceRow(e);
      row.skills = skillsFromText(catalog, row.skills ?? [], row.title, row.description);
      return row;
    });
    const projects = (draft.projects ?? []).slice(0, 40).map((p) => {
      const row = projectRow(p);
      row.skills = skillsFromText(catalog, row.skills ?? [], row.name, row.description);
      return row;
    });
    const certifications = (draft.certifications ?? []).slice(0, 40).map(certificationRow);
    const draftSkills = (draft.skills ?? []).slice(0, 150);

    const [existingEdu, existingExp, existingProj, existingCert, existingSkills] = await Promise.all([
      supabase.from("educations").select("school, degree").eq("user_id", userId),
      supabase.from("experiences").select("title, organization").eq("user_id", userId),
      supabase.from("projects").select("name").eq("user_id", userId),
      supabase.from("certifications").select("name").eq("user_id", userId),
      supabase.from("user_skills").select("skill_id, level, source").eq("user_id", userId),
    ]);
    if (existingEdu.error || existingExp.error || existingProj.error || existingCert.error || existingSkills.error) {
      return { error: "We couldn't load your current profile. Please try again." };
    }

    function fresh<T>(rows: T[], existing: string[], keyOf: (row: T) => string) {
      const seen = new Set(existing);
      return rows.filter((row) => {
        const key = keyOf(row);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    const newEdu = fresh(
      educations,
      existingEdu.data.map((e) => dedupeKey(e.school, e.degree)),
      (e) => dedupeKey(e.school, e.degree),
    );
    const newExp = fresh(
      experiences,
      existingExp.data.map((e) => dedupeKey(e.title, e.organization)),
      (e) => dedupeKey(e.title, e.organization),
    );
    const newProj = fresh(projects, existingProj.data.map((p) => dedupeKey(p.name)), (p) => dedupeKey(p.name));
    const newCert = fresh(certifications, existingCert.data.map((c) => dedupeKey(c.name)), (c) => dedupeKey(c.name));

    // Skills: resolve ids (creating custom skills), keep the highest level.
    const ids = await resolveSkillIds(
      supabase,
      userId,
      catalog,
      draftSkills.map((s) => ({ skillId: s.skillId, name: s.name, category: s.category })),
    );
    const wanted = new Map<string, { level: number; source: "resume" | "manual" }>();
    draftSkills.forEach((s, i) => {
      const id = ids[i];
      if (!id) return;
      const level = toLevel(s.level);
      const prev = wanted.get(id);
      if (!prev || level > prev.level) wanted.set(id, { level, source: s.source === "resume" ? "resume" : "manual" });
    });
    const current = new Map(existingSkills.data.map((s) => [s.skill_id, s]));
    const now = new Date().toISOString();
    const skillRows = [...wanted.entries()]
      .map(([skillId, w]) => {
        const had = current.get(skillId);
        if (had && had.level >= w.level) return null;
        return { user_id: userId, skill_id: skillId, level: w.level, source: had?.source ?? w.source, updated_at: now };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const eduStart = existingEdu.data.length;
    const expStart = existingExp.data.length;
    const writes = await Promise.all([
      supabase
        .from("profiles")
        .update({ ...basics, ...links, ...(onboarding ? { onboarding_step: "preferences" } : {}) })
        .eq("id", userId),
      newEdu.length
        ? supabase.from("educations").insert(newEdu.map((e, i) => ({ ...e, user_id: userId, position: eduStart + i })))
        : null,
      newExp.length
        ? supabase.from("experiences").insert(newExp.map((e, i) => ({ ...e, user_id: userId, position: expStart + i })))
        : null,
      newProj.length ? supabase.from("projects").insert(newProj.map((p) => ({ ...p, user_id: userId }))) : null,
      newCert.length ? supabase.from("certifications").insert(newCert.map((c) => ({ ...c, user_id: userId }))) : null,
      skillRows.length ? supabase.from("user_skills").upsert(skillRows, { onConflict: "user_id,skill_id" }) : null,
    ]);
    if (writes.some((w) => w?.error)) {
      return { error: "Some parts of your profile couldn't be saved. Please try again." };
    }
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/profile");
  revalidatePath(`/u/${userId}`);
  revalidatePath("/", "layout");
  redirect(onboarding ? "/onboarding/preferences" : "/profile?updated=1");
}

// ---------------------------------------------------------------------------
// Step 4: preferences questionnaire
// ---------------------------------------------------------------------------

export interface PreferencesInput {
  answers: Record<string, number>;
  interestedIndustries: string[];
  workTypes: string[];
  companyTypes: string[];
  preferredLocations: string[];
  interestedCareers: string[];
}

export async function savePreferences(
  input: PreferencesInput,
  retake: boolean,
): Promise<{ error: string } | undefined> {
  const profile = await me();
  if (profile.role !== "seeker") redirect(homePathFor(profile));
  const answers: Record<string, number> = {};
  for (const q of PREFERENCE_QUESTIONS) {
    const value = Number(input.answers?.[q.id]);
    if (Number.isInteger(value) && value >= 1 && value <= 5) answers[q.id] = value;
  }
  const catalog = await getCatalog();
  const workTypes = new Set(WORK_TYPE_OPTIONS.map((w) => w.value));
  const supabase = await createClient();
  const { error } = await supabase.from("career_preferences").upsert(
    {
      user_id: profile.id,
      answers,
      scores: scorePreferences(answers) as Json,
      interested_industries: list(input.interestedIndustries, 20, 60),
      work_types: list(input.workTypes, 10, 30).filter((w) => workTypes.has(w)),
      company_types: list(input.companyTypes, 20, 60),
      preferred_locations: list(input.preferredLocations, 20, 60),
      interested_careers: list(input.interestedCareers, 20, 80).filter((id) => catalog.careerById.has(id)),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: "We couldn't save your preferences. Please try again." };

  const onboarding = !retake && profile.onboarding_step !== "done";
  if (onboarding) {
    const { error: stepError } = await supabase
      .from("profiles")
      .update({ onboarding_step: "done" })
      .eq("id", profile.id);
    if (stepError) return { error: "We saved your answers but couldn't finish setup. Please try again." };
  }
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  redirect(onboarding ? "/onboarding/complete" : "/profile?preferences=1");
}
