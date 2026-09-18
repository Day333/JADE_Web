"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { findHiddenPotential, generateCareerPlan, recommendCareers } from "@/lib/ai";
import { buildPlanContext, roadmapRowsFromPlan } from "@/lib/ai/career-plan";
import { computeReadiness, computeSkillGap } from "@/lib/ai/matching";
import { planRoadmap } from "@/lib/ai/roadmap";
import { getMyProfile } from "@/lib/auth";
import { getCatalog } from "@/lib/data/catalog";
import { loadOpenJobs, rankJobs } from "@/lib/data/jobs";
import { loadCareerProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";

export type GeneratePlanResult = { ok: true; source: "ai" | "rules" } | { ok: false; error: string };

/** Build (or rebuild) the AI Career Plan for the user's current career goal. */
export async function generateMyCareerPlan(): Promise<GeneratePlanResult> {
  const profile = await getMyProfile();
  if (!profile) redirect("/auth/login");
  if (profile.role !== "seeker") return { ok: false, error: "Career plans are for job seekers." };

  const [data, catalog, jobs] = await Promise.all([loadCareerProfile(profile.id), getCatalog(), loadOpenJobs()]);
  if (!data) return { ok: false, error: "We couldn't load your Career Profile." };
  const careerId = data.goal?.career_id;
  if (!careerId || !catalog.careerById.has(careerId)) {
    return { ok: false, error: "Choose a career goal first, then we can plan how to get there." };
  }

  const supabase = await createClient();
  const [{ data: roadmap }, { data: communities }] = await Promise.all([
    supabase
      .from("roadmaps")
      .select("roadmap_stages(title, kind, period_label, position, roadmap_tasks(is_done))")
      .eq("user_id", profile.id)
      .eq("is_active", true)
      .maybeSingle(),
    supabase.from("communities").select("name, slug").eq("career_id", careerId).limit(1),
  ]);

  // Use the roadmap the user is actually following; plan one if it doesn't exist yet.
  const roadmapRows = roadmap?.roadmap_stages.length
    ? [...roadmap.roadmap_stages]
        .sort((a, b) => a.position - b.position)
        .map((s) => ({
          period: s.period_label,
          title: s.title,
          kind: s.kind,
          tasksDone: s.roadmap_tasks.filter((t) => t.is_done).length,
          tasksTotal: s.roadmap_tasks.length,
        }))
    : roadmapRowsFromPlan(planRoadmap(data, catalog, careerId));

  const gap = computeSkillGap(data, catalog, careerId)!;
  const ranked = rankJobs(data, catalog, jobs);
  const hidden = await findHiddenPotential(data, catalog, await recommendCareers(data, catalog));
  const ctx = buildPlanContext({
    data,
    catalog,
    careerId,
    readiness: computeReadiness(data, catalog, careerId),
    gap,
    roadmap: roadmapRows,
    ranked,
    hidden,
    community: communities?.[0] ?? null,
  });

  const { plan, source, model } = await generateCareerPlan(ctx);
  const { error } = await supabase.from("career_plans").insert({
    user_id: profile.id,
    career_id: careerId,
    content: plan as unknown as Json,
    source,
    model,
  });
  if (error) return { ok: false, error: "We couldn't save your plan. Please try again." };

  await supabase.from("notifications").insert({
    user_id: profile.id,
    kind: "roadmap_task",
    title: `Your AI Career Plan for ${catalog.careerById.get(careerId)!.title} is ready`,
    body: plan.headline,
    link: "/plan",
  });
  revalidatePath("/plan");
  revalidatePath("/dashboard");
  return { ok: true, source };
}
