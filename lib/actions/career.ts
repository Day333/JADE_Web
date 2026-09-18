"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateRoadmapPlan, type PlannedStage } from "@/lib/ai";
import { computeReadiness, type Readiness } from "@/lib/ai/matching";
import { getMyProfile } from "@/lib/auth";
import { getCatalog } from "@/lib/data/catalog";
import { loadOpenJobs, rankJobs, strongMatches, type JobWithCompany } from "@/lib/data/jobs";
import { loadCareerProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import type { CareerProfileData, Catalog, Project, UserSkill } from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type ActionError = { ok: false; error: string };

/** Readiness before and after a change, for "Career Readiness 72% → 76%" toasts. */
export interface ProgressResult {
  ok: true;
  before: Readiness | null;
  after: Readiness | null;
  /** Jobs that became a strong match because of this change. */
  newMatches: number;
  /** Roadmap tasks completed automatically (e.g. after raising a skill level). */
  tasksCompleted?: number;
  /** True when this change completed a whole roadmap stage. */
  stageCompleted?: boolean;
}

const STAGE_KINDS = new Set<PlannedStage["kind"]>(["skill", "project", "portfolio", "apply"]);
const LEVELS = new Set([0, 1, 2, 3]);

const CAREER_PAGES = ["/careers", "/skill-gap", "/roadmap", "/dashboard", "/profile", "/jobs"];

function revalidateCareerPages() {
  for (const path of CAREER_PAGES) revalidatePath(path);
  revalidatePath("/careers/[id]", "page");
}

async function requireSeeker() {
  const profile = await getMyProfile();
  if (!profile) redirect("/auth/login");
  if (profile.role !== "seeker") return null;
  return profile;
}

function cleanUrl(value: string | null | undefined): { url: string | null; error?: string } {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return { url: null };
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return { url: null, error: "Links must start with http:// or https://." };
    if (!parsed.hostname.includes(".")) return { url: null, error: "Please enter a full link, e.g. https://github.com/you/project." };
    return { url: parsed.toString() };
  } catch {
    return { url: null, error: "That link does not look valid." };
  }
}

// ---------------------------------------------------------------------------
// Readiness & job snapshots (the §35 chain: skill → task → readiness → jobs)
// ---------------------------------------------------------------------------

interface Snapshot {
  readiness: Readiness | null;
  strong: Set<string>;
}

function snapshot(data: CareerProfileData, catalog: Catalog, careerId: string | null, jobs: JobWithCompany[]): Snapshot {
  return {
    readiness: careerId && catalog.careerById.has(careerId) ? computeReadiness(data, catalog, careerId) : null,
    strong: new Set(strongMatches(rankJobs(data, catalog, jobs)).map((r) => r.job.id)),
  };
}

/** A copy of the profile with one skill set to a new level (0 removes it). */
function withSkill(data: CareerProfileData, userId: string, skillId: string, level: number, source: UserSkill["source"]): CareerProfileData {
  const others = data.skills.filter((s) => s.skill_id !== skillId);
  if (level <= 0) return { ...data, skills: others };
  return {
    ...data,
    skills: [...others, { user_id: userId, skill_id: skillId, level, source, updated_at: new Date().toISOString() }],
  };
}

async function finishProgress(
  supabase: Supabase,
  userId: string,
  before: Snapshot,
  afterData: CareerProfileData,
  catalog: Catalog,
  careerId: string | null,
  jobs: JobWithCompany[],
  extra: Pick<ProgressResult, "tasksCompleted" | "stageCompleted"> = {},
): Promise<ProgressResult> {
  const after = snapshot(afterData, catalog, careerId, jobs);
  const newMatches = [...after.strong].filter((id) => !before.strong.has(id)).length;
  if (newMatches > 0) {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      kind: "job_recommendation",
      title: `We found ${newMatches} new ${newMatches === 1 ? "opportunity" : "opportunities"} for you`,
      body: "Your growing skills now make you a strong match for more roles.",
      link: "/jobs",
    });
    if (error) console.error("Failed to create job recommendation notification", error.message);
  }
  return { ok: true, before: before.readiness, after: after.readiness, newMatches, ...extra };
}

/** Set or clear `completed_at` for stages depending on whether all their tasks are done. */
async function syncStageCompletion(supabase: Supabase, stageIds: string[]): Promise<string[]> {
  if (stageIds.length === 0) return [];
  const [{ data: stages }, { data: tasks }] = await Promise.all([
    supabase.from("roadmap_stages").select("id, completed_at").in("id", stageIds),
    supabase.from("roadmap_tasks").select("stage_id, is_done").in("stage_id", stageIds),
  ]);
  const newlyCompleted: string[] = [];
  for (const stage of stages ?? []) {
    const stageTasks = (tasks ?? []).filter((t) => t.stage_id === stage.id);
    const allDone = stageTasks.length > 0 && stageTasks.every((t) => t.is_done);
    if (allDone && !stage.completed_at) {
      await supabase.from("roadmap_stages").update({ completed_at: new Date().toISOString() }).eq("id", stage.id);
      newlyCompleted.push(stage.id);
    } else if (!allDone && stage.completed_at) {
      await supabase.from("roadmap_stages").update({ completed_at: null }).eq("id", stage.id);
    }
  }
  return newlyCompleted;
}

// ---------------------------------------------------------------------------
// Career goal & roadmap generation
// ---------------------------------------------------------------------------

function sanitizePlan(plan: PlannedStage[], catalog: Catalog): PlannedStage[] {
  const validSkill = (id: string | undefined) => (id && catalog.skillById.has(id) ? id : undefined);
  return plan
    .filter((s) => s && typeof s.title === "string" && s.title.trim())
    .slice(0, 12)
    .map((s) => ({
      periodLabel: String(s.periodLabel ?? "").slice(0, 60),
      title: s.title.trim().slice(0, 200),
      description: String(s.description ?? "").slice(0, 1000),
      kind: STAGE_KINDS.has(s.kind) ? s.kind : "skill",
      skillId: validSkill(s.skillId),
      tasks: (s.tasks ?? [])
        .filter((t) => t && typeof t.title === "string" && t.title.trim())
        .slice(0, 12)
        .map((t) => {
          const skillId = validSkill(t.skillId);
          const target = Number(t.targetLevel);
          return {
            title: t.title.trim().slice(0, 300),
            skillId,
            targetLevel: skillId && target >= 1 && target <= 3 ? Math.round(target) : undefined,
          };
        }),
    }));
}

/**
 * Plan a roadmap from the current profile and store it as the user's only
 * active roadmap. The new roadmap is written first and activated last, so a
 * failure leaves the previous roadmap untouched.
 */
async function createRoadmap(
  supabase: Supabase,
  userId: string,
  data: CareerProfileData,
  catalog: Catalog,
  careerId: string,
): Promise<{ error: string } | { firstTask: string | null }> {
  const plan = sanitizePlan(await generateRoadmapPlan(data, catalog, careerId), catalog);
  if (plan.length === 0) return { error: "We could not plan a roadmap for this career." };

  const { data: roadmap, error: roadmapError } = await supabase
    .from("roadmaps")
    .insert({ user_id: userId, career_id: careerId, is_active: false })
    .select("id")
    .single();
  if (roadmapError || !roadmap) return { error: roadmapError?.message ?? "Could not save the roadmap." };

  const discard = async (message: string) => {
    await supabase.from("roadmaps").delete().eq("id", roadmap.id);
    return { error: message };
  };

  const { data: stages, error: stageError } = await supabase
    .from("roadmap_stages")
    .insert(
      plan.map((stage, position) => ({
        roadmap_id: roadmap.id,
        user_id: userId,
        position,
        period_label: stage.periodLabel || `Step ${position + 1}`,
        title: stage.title,
        description: stage.description || null,
        kind: stage.kind,
        skill_id: stage.skillId ?? null,
      })),
    )
    .select("id, position");
  if (stageError || !stages) return discard(stageError?.message ?? "Could not save the roadmap stages.");

  const stageIdByPosition = new Map(stages.map((s) => [s.position, s.id]));
  const tasks = plan.flatMap((stage, position) =>
    stage.tasks.map((task, index) => ({
      stage_id: stageIdByPosition.get(position)!,
      user_id: userId,
      title: task.title,
      skill_id: task.skillId ?? null,
      target_level: task.skillId ? (task.targetLevel ?? null) : null,
      position: index,
    })),
  );
  if (tasks.length > 0) {
    const { error: taskError } = await supabase.from("roadmap_tasks").insert(tasks);
    if (taskError) return discard(taskError.message);
  }

  const { error: deactivateError } = await supabase
    .from("roadmaps")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);
  if (deactivateError) return discard(deactivateError.message);

  const { error: activateError } = await supabase.from("roadmaps").update({ is_active: true }).eq("id", roadmap.id);
  if (activateError) return discard(activateError.message);

  return { firstTask: plan[0]?.tasks[0]?.title ?? null };
}

async function notifyRoadmapReady(supabase: Supabase, userId: string, careerTitle: string, firstTask: string | null, updated = false) {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    kind: "roadmap_task",
    title: updated ? `Your Career Roadmap for ${careerTitle} was updated` : `Your Career Roadmap for ${careerTitle} is ready`,
    body: firstTask ? `First step: ${firstTask}` : null,
    link: "/roadmap",
  });
  if (error) console.error("Failed to create roadmap notification", error.message);
}

/**
 * Make a career the user's goal, build a fresh Career Roadmap for it and
 * continue to the automatically generated Skill Gap.
 */
export async function setCareerGoal(careerId: string): Promise<ActionError> {
  const profile = await requireSeeker();
  if (!profile) return { ok: false, error: "Only job seekers can set a career goal." };
  const catalog = await getCatalog();
  const career = catalog.careerById.get(careerId);
  if (!career) return { ok: false, error: "That career does not exist." };

  const supabase = await createClient();
  const data = await loadCareerProfile(profile.id);
  if (!data) return { ok: false, error: "Your profile could not be loaded." };

  const { error: goalError } = await supabase
    .from("career_goals")
    .upsert({ user_id: profile.id, career_id: careerId, set_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (goalError) return { ok: false, error: `Could not save your goal: ${goalError.message}` };

  const { data: active } = await supabase
    .from("roadmaps")
    .select("id, career_id")
    .eq("user_id", profile.id)
    .eq("is_active", true)
    .maybeSingle();

  if (active?.career_id !== careerId) {
    const result = await createRoadmap(supabase, profile.id, data, catalog, careerId);
    if ("error" in result) {
      revalidateCareerPages();
      return {
        ok: false,
        error: `Your goal is set, but we could not create your roadmap (${result.error}). You can generate it from the Roadmap page.`,
      };
    }
    await notifyRoadmapReady(supabase, profile.id, career.title, result.firstTask);
  }

  revalidateCareerPages();
  redirect("/skill-gap");
}

/** Re-plan the roadmap for the current goal from the latest profile (also used when none exists yet). */
export async function rebuildRoadmap(): Promise<ActionError | { ok: true }> {
  const profile = await requireSeeker();
  if (!profile) return { ok: false, error: "Only job seekers have a Career Roadmap." };
  const [data, catalog] = await Promise.all([loadCareerProfile(profile.id), getCatalog()]);
  if (!data) return { ok: false, error: "Your profile could not be loaded." };
  const careerId = data.goal?.career_id;
  const career = careerId ? catalog.careerById.get(careerId) : undefined;
  if (!careerId || !career) return { ok: false, error: "Choose a career goal first." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("roadmaps")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("is_active", true)
    .eq("career_id", careerId);

  const result = await createRoadmap(supabase, profile.id, data, catalog, careerId);
  if ("error" in result) return { ok: false, error: `Could not create your roadmap: ${result.error}` };
  await notifyRoadmapReady(supabase, profile.id, career.title, result.firstTask, (count ?? 0) > 0);
  revalidateCareerPages();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Roadmap progress
// ---------------------------------------------------------------------------

/**
 * Tick or untick a roadmap task. Completing a skill task raises that skill
 * on the profile; unticking undoes a raise that came from the roadmap.
 * Returns readiness before/after so the page can celebrate the change.
 */
export async function toggleTask(taskId: string, done: boolean): Promise<ActionError | ProgressResult> {
  const profile = await requireSeeker();
  if (!profile) return { ok: false, error: "Only job seekers have a Career Roadmap." };
  const userId = profile.id;
  const supabase = await createClient();

  const { data: task, error: taskError } = await supabase
    .from("roadmap_tasks")
    .select("id, stage_id, skill_id, target_level, is_done, stage:roadmap_stages(roadmap_id, roadmap:roadmaps(career_id))")
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle();
  if (taskError) return { ok: false, error: taskError.message };
  if (!task) return { ok: false, error: "That task no longer exists. Try refreshing the page." };

  const careerId = task.stage?.roadmap?.career_id ?? null;
  const [data, catalog, jobs] = await Promise.all([loadCareerProfile(userId), getCatalog(), loadOpenJobs()]);
  if (!data) return { ok: false, error: "Your profile could not be loaded." };
  const before = snapshot(data, catalog, careerId, jobs);

  if (task.is_done === done) return finishProgress(supabase, userId, before, data, catalog, careerId, jobs);

  const { error: updateError } = await supabase
    .from("roadmap_tasks")
    .update({ is_done: done, done_at: done ? new Date().toISOString() : null })
    .eq("id", task.id);
  if (updateError) return { ok: false, error: `Could not update the task: ${updateError.message}` };

  let afterData = data;
  if (task.skill_id && task.target_level) {
    const current = data.skills.find((s) => s.skill_id === task.skill_id);
    const currentLevel = current?.level ?? 0;
    if (done && task.target_level > currentLevel) {
      const { error } = await supabase.from("user_skills").upsert(
        {
          user_id: userId,
          skill_id: task.skill_id,
          level: task.target_level,
          source: "roadmap",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,skill_id" },
      );
      if (error) return { ok: false, error: `The task was saved, but your skill could not be updated: ${error.message}` };
      afterData = withSkill(data, userId, task.skill_id, task.target_level, "roadmap");
    } else if (!done && current?.source === "roadmap") {
      // Undo the raise, keeping whatever other completed tasks justify.
      const [{ data: sameRoadmap }, { data: otherDone }] = await Promise.all([
        supabase
          .from("roadmap_tasks")
          .select("id, target_level, stage:roadmap_stages!inner(roadmap_id)")
          .eq("user_id", userId)
          .eq("skill_id", task.skill_id)
          .eq("stage.roadmap_id", task.stage?.roadmap_id ?? ""),
        supabase
          .from("roadmap_tasks")
          .select("target_level")
          .eq("user_id", userId)
          .eq("skill_id", task.skill_id)
          .eq("is_done", true)
          .neq("id", task.id),
      ]);
      // A "fundamentals" task in the same roadmap means the skill was new when the plan was made.
      const wasMissing = (sameRoadmap ?? []).some((t) => t.id !== task.id && (t.target_level ?? 0) < task.target_level!);
      const baseline = wasMissing ? 0 : task.target_level - 1;
      const fallback = Math.max(baseline, ...(otherDone ?? []).map((t) => t.target_level ?? 0));
      if (fallback < currentLevel) {
        const { error } =
          fallback <= 0
            ? await supabase.from("user_skills").delete().eq("user_id", userId).eq("skill_id", task.skill_id)
            : await supabase
                .from("user_skills")
                .update({ level: fallback, updated_at: new Date().toISOString() })
                .eq("user_id", userId)
                .eq("skill_id", task.skill_id);
        if (error) return { ok: false, error: `The task was saved, but your skill could not be updated: ${error.message}` };
        afterData = withSkill(data, userId, task.skill_id, fallback, "roadmap");
      }
    }
  }

  const completed = await syncStageCompletion(supabase, [task.stage_id]);
  const result = await finishProgress(supabase, userId, before, afterData, catalog, careerId, jobs, {
    stageCompleted: completed.length > 0,
  });
  revalidateCareerPages();
  return result;
}

/**
 * Set the user's own level for a skill (0 removes it). Raising a skill also
 * completes the matching tasks on the active roadmap.
 */
export async function updateSkillLevel(skillId: string, level: number): Promise<ActionError | ProgressResult> {
  const profile = await requireSeeker();
  if (!profile) return { ok: false, error: "Only job seekers can update skills." };
  if (!LEVELS.has(level)) return { ok: false, error: "Choose Basic, Proficient or Advanced." };
  const userId = profile.id;
  const supabase = await createClient();
  const [data, catalog, jobs] = await Promise.all([loadCareerProfile(userId), getCatalog(), loadOpenJobs()]);
  if (!data) return { ok: false, error: "Your profile could not be loaded." };

  if (!catalog.skillById.has(skillId) && !data.skills.some((s) => s.skill_id === skillId)) {
    const { data: skill } = await supabase.from("skills").select("id").eq("id", skillId).maybeSingle();
    if (!skill) return { ok: false, error: "That skill does not exist." };
  }

  const careerId = data.goal?.career_id ?? null;
  const before = snapshot(data, catalog, careerId, jobs);

  const { error } =
    level === 0
      ? await supabase.from("user_skills").delete().eq("user_id", userId).eq("skill_id", skillId)
      : await supabase
          .from("user_skills")
          .upsert(
            { user_id: userId, skill_id: skillId, level, source: "manual", updated_at: new Date().toISOString() },
            { onConflict: "user_id,skill_id" },
          );
  if (error) return { ok: false, error: `Could not update your skill: ${error.message}` };
  const afterData = withSkill(data, userId, skillId, level, "manual");

  // Skill updated → matching roadmap tasks follow: raising completes the tasks
  // up to the new level, lowering reopens the tasks above it.
  let tasksCompleted = 0;
  let stageCompleted = false;
  const previousLevel = data.skills.find((s) => s.skill_id === skillId)?.level ?? 0;
  const { data: roadmap } = await supabase
    .from("roadmaps")
    .select("id, roadmap_stages(id)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  const stageIds = (roadmap?.roadmap_stages ?? []).map((s) => s.id);
  if (stageIds.length > 0) {
    const touched = new Set<string>();
    if (level > 0) {
      const { data: updated, error: taskError } = await supabase
        .from("roadmap_tasks")
        .update({ is_done: true, done_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("skill_id", skillId)
        .eq("is_done", false)
        .lte("target_level", level)
        .in("stage_id", stageIds)
        .select("id, stage_id");
      if (taskError) console.error("Failed to complete roadmap tasks", taskError.message);
      tasksCompleted = updated?.length ?? 0;
      for (const t of updated ?? []) touched.add(t.stage_id);
    }
    if (level < previousLevel) {
      const { data: reopened, error: taskError } = await supabase
        .from("roadmap_tasks")
        .update({ is_done: false, done_at: null })
        .eq("user_id", userId)
        .eq("skill_id", skillId)
        .eq("is_done", true)
        .gt("target_level", level)
        .in("stage_id", stageIds)
        .select("id, stage_id");
      if (taskError) console.error("Failed to reopen roadmap tasks", taskError.message);
      for (const t of reopened ?? []) touched.add(t.stage_id);
    }
    if (touched.size > 0) {
      const completed = await syncStageCompletion(supabase, [...touched]);
      stageCompleted = completed.length > 0;
    }
  }

  const result = await finishProgress(supabase, userId, before, afterData, catalog, careerId, jobs, {
    tasksCompleted,
    stageCompleted,
  });
  revalidateCareerPages();
  return result;
}

/** Record what the user achieved in a roadmap stage (note and/or link). */
export async function saveStageOutcome(stageId: string, note: string, url: string): Promise<ActionError | { ok: true }> {
  const profile = await requireSeeker();
  if (!profile) return { ok: false, error: "Only job seekers have a Career Roadmap." };
  const cleanNote = note.trim();
  if (cleanNote.length > 1000) return { ok: false, error: "Please keep your outcome under 1,000 characters." };
  const link = cleanUrl(url);
  if (link.error) return { ok: false, error: link.error };
  if (!cleanNote && !link.url) return { ok: false, error: "Add a short note or a link to your outcome." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roadmap_stages")
    .update({ evidence_note: cleanNote || null, evidence_url: link.url })
    .eq("id", stageId)
    .eq("user_id", profile.id)
    .select("id");
  if (error) return { ok: false, error: `Could not save your outcome: ${error.message}` };
  if (!data || data.length === 0) return { ok: false, error: "That roadmap stage no longer exists." };
  revalidatePath("/roadmap");
  return { ok: true };
}

export interface StageProjectInput {
  stageId: string;
  name: string;
  description: string;
  url: string;
  skills: string[];
}

/** Add a project built during a roadmap stage to the Career Profile. */
export async function addStageProject(input: StageProjectInput): Promise<ActionError | ProgressResult> {
  const profile = await requireSeeker();
  if (!profile) return { ok: false, error: "Only job seekers can add projects." };
  const userId = profile.id;
  const name = input.name.trim();
  const description = input.description.trim();
  if (!name) return { ok: false, error: "Give your project a name." };
  if (name.length > 120) return { ok: false, error: "Please keep the project name under 120 characters." };
  if (description.length > 2000) return { ok: false, error: "Please keep the description under 2,000 characters." };
  const link = cleanUrl(input.url);
  if (link.error) return { ok: false, error: link.error };

  const supabase = await createClient();
  const { data: stage } = await supabase
    .from("roadmap_stages")
    .select("id, roadmap:roadmaps(career_id)")
    .eq("id", input.stageId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!stage) return { ok: false, error: "That roadmap stage no longer exists." };

  const [data, catalog, jobs] = await Promise.all([loadCareerProfile(userId), getCatalog(), loadOpenJobs()]);
  if (!data) return { ok: false, error: "Your profile could not be loaded." };
  const skills = [...new Set(input.skills)].filter((id) => catalog.skillById.has(id)).slice(0, 12);
  const careerId = stage.roadmap?.career_id ?? data.goal?.career_id ?? null;
  const before = snapshot(data, catalog, careerId, jobs);

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name,
      description: description || null,
      url: link.url,
      skills,
      roadmap_stage_id: stage.id,
    })
    .select("*")
    .single();
  if (error || !project) return { ok: false, error: `Could not save your project: ${error?.message ?? "unknown error"}` };

  const afterData: CareerProfileData = { ...data, projects: [project as Project, ...data.projects] };
  const result = await finishProgress(supabase, userId, before, afterData, catalog, careerId, jobs);
  revalidateCareerPages();
  return result;
}
