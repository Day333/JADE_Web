"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { getCatalog } from "@/lib/data/catalog";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import {
  type ActionResult,
  type BasicsInput,
  type CertificationInput,
  type EducationInput,
  type ExperienceInput,
  type LinksInput,
  type PortfolioInput,
  type PrivacyKey,
  type ProjectInput,
  type SkillCategory,
  PRIVACY_KEYS,
} from "@/components/profile/model";
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
  portfolioRow,
  projectRow,
  text,
} from "@/components/profile/validate";

type ItemTable = "educations" | "experiences" | "projects" | "certifications" | "portfolio_items";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function session() {
  const userId = await getUserId();
  if (!userId) redirect("/auth/login");
  const supabase = await createClient();
  return { userId, supabase };
}

function refresh(userId: string, extra: string[] = []) {
  revalidatePath("/profile");
  revalidatePath(`/u/${userId}`);
  for (const path of extra) revalidatePath(path);
}

const SAVE_FAILED = "We couldn't save that change. Please try again.";

// ---------------------------------------------------------------------------
// Basic information & links
// ---------------------------------------------------------------------------

export async function updateBasics(input: BasicsInput): Promise<ActionResult> {
  const { userId, supabase } = await session();
  try {
    const { error } = await supabase.from("profiles").update(basicsRow(input)).eq("id", userId);
    if (error) return { error: SAVE_FAILED };
  } catch (e) {
    return { error: errorMessage(e) };
  }
  refresh(userId, ["/dashboard"]);
  return { ok: true, message: "Basic information saved" };
}

export async function updateLinks(input: LinksInput): Promise<ActionResult> {
  const { userId, supabase } = await session();
  try {
    const { error } = await supabase.from("profiles").update(linksRow(input)).eq("id", userId);
    if (error) return { error: SAVE_FAILED };
  } catch (e) {
    return { error: errorMessage(e) };
  }
  refresh(userId);
  return { ok: true, message: "Links saved" };
}

// ---------------------------------------------------------------------------
// List items (education, experience, projects, certifications, portfolio)
// ---------------------------------------------------------------------------

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Write = PromiseLike<{ error: unknown; data?: unknown[] | null }>;

/**
 * Update the item with `id` (checking it belongs to the user) or insert a
 * new one. The table-specific queries are passed in so they stay typed.
 */
async function saveItem(
  id: string | undefined,
  update: (supabase: Supabase, userId: string, id: string) => Write,
  insert: (supabase: Supabase, userId: string) => Write | Promise<Awaited<Write>>,
  extra: string[] = [],
): Promise<ActionResult> {
  const { userId, supabase } = await session();
  if (id) {
    if (!UUID_RE.test(id)) return { error: "That item no longer exists." };
    const { data, error } = await update(supabase, userId, id);
    if (error) return { error: SAVE_FAILED };
    if (!data || data.length === 0) return { error: "That item no longer exists." };
  } else {
    const { error } = await insert(supabase, userId);
    if (error) return { error: SAVE_FAILED };
  }
  refresh(userId, extra);
  return { ok: true, message: id ? "Changes saved" : "Added to your profile" };
}

async function nextPosition(supabase: Supabase, table: "educations" | "experiences", userId: string) {
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId);
  return count ?? 0;
}

async function deleteItem(table: ItemTable, id: string, extra: string[] = []): Promise<ActionResult> {
  const { userId, supabase } = await session();
  if (!UUID_RE.test(id)) return { error: "That item no longer exists." };
  const { error } = await supabase.from(table).delete().eq("id", id).eq("user_id", userId);
  if (error) return { error: "We couldn't remove that item. Please try again." };
  refresh(userId, extra);
  return { ok: true, message: "Removed" };
}

export async function saveEducation(input: EducationInput): Promise<ActionResult> {
  try {
    const row = educationRow(input);
    return await saveItem(
      input.id,
      (sb, uid, id) => sb.from("educations").update(row).eq("id", id).eq("user_id", uid).select("id"),
      async (sb, uid) =>
        sb.from("educations").insert({ ...row, user_id: uid, position: await nextPosition(sb, "educations", uid) }),
    );
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function deleteEducation(id: string) {
  return deleteItem("educations", id);
}

export async function saveExperience(input: ExperienceInput): Promise<ActionResult> {
  try {
    const row = experienceRow(input);
    const catalog = await getCatalog();
    row.skills = skillsFromText(catalog, row.skills ?? [], row.title, row.description);
    return await saveItem(
      input.id,
      (sb, uid, id) => sb.from("experiences").update(row).eq("id", id).eq("user_id", uid).select("id"),
      async (sb, uid) =>
        sb.from("experiences").insert({ ...row, user_id: uid, position: await nextPosition(sb, "experiences", uid) }),
      ["/careers", "/skill-gap"],
    );
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function deleteExperience(id: string) {
  return deleteItem("experiences", id, ["/careers", "/skill-gap"]);
}

export async function saveProject(input: ProjectInput): Promise<ActionResult> {
  try {
    const row = projectRow(input);
    const catalog = await getCatalog();
    row.skills = skillsFromText(catalog, row.skills ?? [], row.name, row.description);
    return await saveItem(
      input.id,
      (sb, uid, id) => sb.from("projects").update(row).eq("id", id).eq("user_id", uid).select("id"),
      (sb, uid) => sb.from("projects").insert({ ...row, user_id: uid }),
      ["/careers", "/skill-gap"],
    );
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function deleteProject(id: string) {
  return deleteItem("projects", id, ["/careers", "/skill-gap"]);
}

export async function saveCertification(input: CertificationInput): Promise<ActionResult> {
  try {
    const row = certificationRow(input);
    return await saveItem(
      input.id,
      (sb, uid, id) => sb.from("certifications").update(row).eq("id", id).eq("user_id", uid).select("id"),
      (sb, uid) => sb.from("certifications").insert({ ...row, user_id: uid }),
    );
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function deleteCertification(id: string) {
  return deleteItem("certifications", id);
}

export async function savePortfolioItem(input: PortfolioInput): Promise<ActionResult> {
  try {
    const row = portfolioRow(input);
    return await saveItem(
      input.id,
      (sb, uid, id) => sb.from("portfolio_items").update(row).eq("id", id).eq("user_id", uid).select("id"),
      (sb, uid) => sb.from("portfolio_items").insert({ ...row, user_id: uid }),
    );
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function deletePortfolioItem(id: string) {
  return deleteItem("portfolio_items", id);
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

const SKILL_PATHS = ["/careers", "/skill-gap", "/dashboard", "/jobs"];

export async function addSkill(input: {
  skillId?: string;
  name?: string;
  category?: SkillCategory;
  level: number;
}): Promise<ActionResult> {
  const { userId, supabase } = await session();
  try {
    const catalog = await getCatalog();
    const category: SkillCategory | undefined =
      input.category && ["technical", "tool", "domain", "soft"].includes(input.category) ? input.category : undefined;
    const [skillId] = await resolveSkillIds(supabase, userId, catalog, [
      { skillId: input.skillId, name: input.name, category },
    ]);
    if (!skillId) return { error: "Please choose a skill." };
    const { data: existing } = await supabase
      .from("user_skills")
      .select("level")
      .eq("user_id", userId)
      .eq("skill_id", skillId)
      .maybeSingle();
    const level = toLevel(input.level);
    const { error } = existing
      ? await supabase
          .from("user_skills")
          .update({ level, updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("skill_id", skillId)
      : await supabase.from("user_skills").insert({ user_id: userId, skill_id: skillId, level, source: "manual" });
    if (error) return { error: SAVE_FAILED };
  } catch (e) {
    return { error: errorMessage(e) };
  }
  refresh(userId, SKILL_PATHS);
  return { ok: true, message: "Skill added" };
}

export async function setSkillLevel(skillId: string, level: number): Promise<ActionResult> {
  const { userId, supabase } = await session();
  const { data, error } = await supabase
    .from("user_skills")
    .update({ level: toLevel(level), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("skill_id", text(skillId, 80))
    .select("skill_id");
  if (error) return { error: SAVE_FAILED };
  if (!data || data.length === 0) return { error: "That skill is no longer on your profile." };
  refresh(userId, SKILL_PATHS);
  return { ok: true, message: "Level updated" };
}

export async function removeSkill(skillId: string): Promise<ActionResult> {
  const { userId, supabase } = await session();
  const { error } = await supabase.from("user_skills").delete().eq("user_id", userId).eq("skill_id", text(skillId, 80));
  if (error) return { error: "We couldn't remove that skill. Please try again." };
  refresh(userId, SKILL_PATHS);
  return { ok: true, message: "Skill removed" };
}

// ---------------------------------------------------------------------------
// Career interests & preferences (lists only; the questionnaire lives in onboarding)
// ---------------------------------------------------------------------------

export async function updatePreferenceLists(input: {
  interestedIndustries?: string[];
  interestedCareers?: string[];
  workTypes?: string[];
  companyTypes?: string[];
  preferredLocations?: string[];
}): Promise<ActionResult> {
  const { userId, supabase } = await session();
  const patch: Database["public"]["Tables"]["career_preferences"]["Insert"] = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };
  if (input.interestedIndustries) patch.interested_industries = list(input.interestedIndustries, 20, 60);
  if (input.interestedCareers) {
    const catalog = await getCatalog();
    patch.interested_careers = list(input.interestedCareers, 20, 80).filter((id) => catalog.careerById.has(id));
  }
  if (input.workTypes) {
    patch.work_types = list(input.workTypes, 10, 30).filter((t) =>
      ["internship", "graduate", "part_time", "full_time"].includes(t),
    );
  }
  if (input.companyTypes) patch.company_types = list(input.companyTypes, 20, 60);
  if (input.preferredLocations) patch.preferred_locations = list(input.preferredLocations, 20, 60);
  const { error } = await supabase.from("career_preferences").upsert(patch, { onConflict: "user_id" });
  if (error) return { error: SAVE_FAILED };
  refresh(userId, ["/careers", "/dashboard", "/jobs"]);
  return { ok: true, message: "Preferences saved" };
}

// ---------------------------------------------------------------------------
// Resumes
// ---------------------------------------------------------------------------

export async function setPrimaryResume(id: string): Promise<ActionResult> {
  const { userId, supabase } = await session();
  if (!UUID_RE.test(id)) return { error: "That resume no longer exists." };
  const { data, error } = await supabase
    .from("resumes")
    .update({ is_primary: true })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");
  if (error || !data || data.length === 0) return { error: "We couldn't update that resume." };
  const { error: others } = await supabase
    .from("resumes")
    .update({ is_primary: false })
    .eq("user_id", userId)
    .neq("id", id);
  if (others) return { error: "We couldn't update your other resumes." };
  refresh(userId);
  return { ok: true, message: "Primary resume updated" };
}

export async function deleteResume(id: string): Promise<ActionResult> {
  const { userId, supabase } = await session();
  if (!UUID_RE.test(id)) return { error: "That resume no longer exists." };
  const { data: row } = await supabase
    .from("resumes")
    .select("id, file_path, is_primary")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return { error: "That resume no longer exists." };
  const { error } = await supabase.from("resumes").delete().eq("id", id).eq("user_id", userId);
  if (error) return { error: "We couldn't delete that resume. Please try again." };
  await supabase.storage.from("resumes").remove([row.file_path]);
  if (row.is_primary) {
    const { data: latest } = await supabase
      .from("resumes")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest) await supabase.from("resumes").update({ is_primary: true }).eq("id", latest.id);
  }
  refresh(userId);
  return { ok: true, message: "Resume deleted" };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------


export async function updatePrivacy(
  patch: Partial<Record<PrivacyKey, boolean>> & { dm_policy?: string },
): Promise<ActionResult> {
  const { userId, supabase } = await session();
  const update: Database["public"]["Tables"]["profiles"]["Update"] = {};
  for (const key of PRIVACY_KEYS) {
    if (typeof patch[key] === "boolean") update[key] = patch[key];
  }
  if (patch.dm_policy !== undefined) {
    if (patch.dm_policy !== "everyone" && patch.dm_policy !== "followers" && patch.dm_policy !== "none") {
      return { error: "Unknown messaging setting." };
    }
    update.dm_policy = patch.dm_policy;
  }
  if (Object.keys(update).length === 0) return { error: "Nothing to update." };
  const { error } = await supabase.from("profiles").update(update).eq("id", userId);
  if (error) return { error: SAVE_FAILED };
  refresh(userId, ["/settings"]);
  return { ok: true, message: "Setting saved" };
}

export async function updateAccount(input: { fullName: string; headline?: string }): Promise<ActionResult> {
  const { userId, supabase } = await session();
  const fullName = text(input.fullName, 100);
  if (!fullName) return { error: "Please enter your name." };
  const update: Database["public"]["Tables"]["profiles"]["Update"] = { full_name: fullName };
  if (input.headline !== undefined) update.headline = text(input.headline, 140) || null;
  const { error } = await supabase.from("profiles").update(update).eq("id", userId);
  if (error) return { error: SAVE_FAILED };
  refresh(userId, ["/settings"]);
  revalidatePath("/", "layout");
  return { ok: true, message: "Account details saved" };
}
