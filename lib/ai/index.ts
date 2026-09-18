import "server-only";

/**
 * AI features used by pages and server actions. Each one asks the LLM first
 * (lib/ai/llm.ts; active once DASHSCOPE_API_KEY and LLM_BASE_URL are set) and falls back to the
 * rule-based engine when the model is unavailable or returns unusable output.
 */
import { unstable_cache } from "next/cache";
import { z } from "zod";
import {
  CAREER_PLAN_SYSTEM,
  CareerPlanSchema,
  sanitizePlan,
  writeRulesPlan,
  type CareerPlan,
  type PlanContext,
} from "@/lib/ai/career-plan";
import { askLLM, isLLMConfigured, llmModel } from "@/lib/ai/llm";
import {
  computeSkillGap,
  discoverHiddenPotential,
  rankCareers,
  type CareerMatch,
  type HiddenPotential,
} from "@/lib/ai/matching";
import { parseResumeText, type ParsedResume } from "@/lib/ai/resume-parser";
import { planRoadmap, type PlannedStage } from "@/lib/ai/roadmap";
import type { CareerProfileData, Catalog } from "@/lib/types";

// ---------------------------------------------------------------------------
// Resume parsing
// ---------------------------------------------------------------------------

const ResumeSchema = z.object({
  basics: z.object({
    fullName: z.string().optional(),
    headline: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    github: z.string().optional(),
    linkedin: z.string().optional(),
    website: z.string().optional(),
  }),
  summary: z.string().optional(),
  educations: z.array(
    z.object({
      school: z.string(),
      degree: z.string().optional(),
      field: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      courses: z.array(z.string()),
    }),
  ),
  experiences: z.array(
    z.object({
      title: z.string(),
      organization: z.string().optional(),
      kind: z.enum(["internship", "work", "research", "volunteer", "other"]),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      description: z.string().optional(),
      skills: z.array(z.string()).describe("skill ids from input.skillCatalog"),
    }),
  ),
  projects: z.array(
    z.object({
      name: z.string(),
      role: z.string().optional(),
      description: z.string().optional(),
      url: z.string().optional(),
      skills: z.array(z.string()).describe("skill ids from input.skillCatalog"),
    }),
  ),
  skills: z.array(
    z.object({
      skillId: z.string().describe("id from input.skillCatalog"),
      level: z.union([z.literal(1), z.literal(2), z.literal(3)]).describe("1 basic, 2 proficient, 3 advanced"),
      mentions: z.number(),
    }),
  ),
  otherSkills: z.array(z.string()).describe("tools or skills in the resume that are not in the catalogue"),
  certifications: z.array(z.object({ name: z.string(), issuer: z.string().optional(), year: z.string().optional() })),
  university: z.string().optional(),
  degree: z.string().optional(),
  major: z.string().optional(),
  graduationYear: z.number().optional(),
});

const RESUME_SYSTEM = `You extract a structured career profile from the plain text of a resume.
- Copy facts exactly as written; never invent employers, dates, degrees or skills.
- Put each education, experience and project in its own entry. Descriptions keep the resume's bullet points, one per line.
- Awards, publications and languages are not certifications; leave them out unless they are actual certificates.
- Map skills only to ids in input.skillCatalog. Level 3 = used across several experiences or projects, 2 = used or listed, 1 = only mentioned in passing. Tools that are not in the catalogue go to otherSkills.
- university/degree/major/graduationYear describe the most recent or current degree. A degree is only the qualification and field (e.g. "PhD in AI"); leave scholarships, GPA and honours out of it.`;

export async function parseResume(text: string, catalog: Catalog): Promise<ParsedResume> {
  const fromLLM = await askLLM({
    task: "parse_resume",
    system: RESUME_SYSTEM,
    input: { resumeText: text, skillCatalog: catalog.skills.map((s) => ({ id: s.id, name: s.name })) },
    schema: ResumeSchema,
    effort: "low",
  });
  if (!fromLLM) return parseResumeText(text, catalog.skills);
  const known = (id: string) => catalog.skillById.has(id);
  return {
    ...fromLLM,
    experiences: fromLLM.experiences.map((e) => ({ ...e, skills: e.skills.filter(known) })),
    projects: fromLLM.projects.map((p) => ({ ...p, skills: p.skills.filter(known) })),
    skills: fromLLM.skills.filter((s) => known(s.skillId)),
  };
}

// ---------------------------------------------------------------------------
// Career recommendations and hidden potential
// ---------------------------------------------------------------------------

export async function recommendCareers(data: CareerProfileData, catalog: Catalog): Promise<CareerMatch[]> {
  // Scores stay rule-based so they are consistent across pages.
  return rankCareers(data, catalog);
}

const HiddenSchema = z.object({
  items: z.array(
    z.object({
      careerId: z.string().describe("careerId from input.candidates"),
      reasons: z.array(z.string()).describe("2-4 short strengths from the profile that fit this career"),
      explanation: z.string().describe("1-2 sentences on why this career suits the person, though they may not have considered it"),
    }),
  ),
});

const HIDDEN_SYSTEM = `You help people discover careers they have not considered. From the candidates provided, pick the 2-3 that best fit this person's combination of strengths (not just their degree title). For each, list 2-4 concrete strengths from their profile and write a short explanation in the second person. Only use careerId values from input.candidates. Write in English.`;

// The same profile always gets the same explanations; cache them for a day so
// pages that show hidden potential don't call the model on every visit.
// This runs while a page renders, so it skips the model's thinking step to stay fast.
const cachedHiddenLLM = unstable_cache(
  async (input: object) => {
    const result = await askLLM({ task: "hidden_potential", system: HIDDEN_SYSTEM, input, schema: HiddenSchema, effort: "low", maxTokens: 4000, timeoutMs: 30_000 });
    // Throwing keeps a failed call out of the cache so the next visit retries.
    if (!result) throw new Error("hidden potential: no LLM result");
    return result;
  },
  ["hidden-potential-v1"],
  { revalidate: 60 * 60 * 24 },
);

export async function findHiddenPotential(
  data: CareerProfileData,
  catalog: Catalog,
  ranked: CareerMatch[] = rankCareers(data, catalog),
): Promise<HiddenPotential[]> {
  const rules = discoverHiddenPotential(data, catalog, ranked, 5);
  if (!isLLMConfigured() || rules.length === 0) return rules.slice(0, 3);
  const fromLLM = await cachedHiddenLLM({
    profile: {
      degree: data.profile.degree,
      major: data.profile.major,
      skills: data.skills.map((s) => `${catalog.skillById.get(s.skill_id)?.name ?? s.skill_id} (${s.level})`).sort(),
      experiences: data.experiences.map((e) => `${e.title}${e.organization ? ` at ${e.organization}` : ""}`),
      projects: data.projects.map((p) => p.name),
    },
    candidates: rules.map((r) => ({ careerId: r.match.career.id, title: r.match.career.title, match: r.match.score, signals: r.reasons })),
  }).catch(() => null);
  if (!fromLLM) return rules.slice(0, 3);
  const byId = new Map(rules.map((r) => [r.match.career.id, r]));
  const merged = fromLLM.items
    .filter((i) => byId.has(i.careerId) && i.reasons.length > 0)
    .map((i) => ({ match: byId.get(i.careerId)!.match, reasons: i.reasons.slice(0, 4), explanation: i.explanation }));
  return merged.length > 0 ? merged.slice(0, 3) : rules.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Career Roadmap
// ---------------------------------------------------------------------------

const RoadmapSchema = z.object({
  stages: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      kind: z.enum(["skill", "project", "portfolio", "apply"]),
      skillId: z.string().optional().describe("for skill stages: skillId from input.gaps"),
      tasks: z.array(
        z.object({
          title: z.string(),
          skillId: z.string().optional().describe("skillId from input.gaps when the task builds that skill"),
          targetLevel: z.number().optional().describe("1-3, the level the task brings the skill to"),
        }),
      ),
    }),
  ),
});

const ROADMAP_SYSTEM = `You design a month-by-month Career Roadmap. Each stage is one month. Start with the most important missing or weak skills from input.gaps (one or two skills per stage, 2-3 concrete tasks each), then one project stage that combines the new skills, one portfolio stage, and a final apply stage. Use 5-8 stages in total. Tasks must be specific actions, not generic advice. Only use skillId values from input.gaps. Write in English.`;

export async function generateRoadmapPlan(
  data: CareerProfileData,
  catalog: Catalog,
  careerId: string,
): Promise<PlannedStage[]> {
  const rules = planRoadmap(data, catalog, careerId);
  if (!isLLMConfigured()) return rules;
  const gap = computeSkillGap(data, catalog, careerId);
  if (!gap) return rules;
  const gaps = [...gap.missing, ...gap.improving];
  const fromLLM = await askLLM({
    task: "roadmap",
    system: ROADMAP_SYSTEM,
    input: {
      career: gap.career.title,
      gaps: gaps.map((g) => ({ skillId: g.skillId, name: g.name, status: g.status, level: g.level, target: g.target, importance: g.importance, why: g.why })),
      strengths: gap.ready.map((g) => g.name),
      projects: data.projects.map((p) => p.name),
      hasGithub: Boolean(data.profile.github_url),
    },
    schema: RoadmapSchema,
    // Runs while the user waits on "Set as Career Goal": skip thinking and cap the time.
    effort: "low",
    timeoutMs: 75_000,
  });
  if (!fromLLM || fromLLM.stages.length === 0) return rules;
  const allowed = new Set(gaps.map((g) => g.skillId));
  const skill = (id?: string) => (id && allowed.has(id) ? id : undefined);
  // Keep the model's content but our month labels, so every roadmap starts this month.
  return fromLLM.stages.slice(0, 10).map((s, i) => ({
    periodLabel: new Date(new Date().getFullYear(), new Date().getMonth() + i, 1).toLocaleString("en-AU", { month: "long", year: "numeric" }),
    // The month is shown separately, so drop prefixes like "Month 1:".
    title: s.title.replace(/^(month|stage|phase|step)\s*\d+\s*[:.\-–]\s*/i, ""),
    description: s.description,
    kind: s.kind,
    skillId: skill(s.skillId),
    tasks: s.tasks.slice(0, 6).map((t) => ({
      title: t.title,
      skillId: skill(t.skillId),
      targetLevel: skill(t.skillId) && t.targetLevel ? Math.min(Math.max(Math.round(t.targetLevel), 1), 3) : undefined,
    })),
  }));
}

// ---------------------------------------------------------------------------
// AI Career Plan
// ---------------------------------------------------------------------------

export interface GeneratedPlan {
  plan: CareerPlan;
  source: "ai" | "rules";
  model: string | null;
}

export async function generateCareerPlan(ctx: PlanContext): Promise<GeneratedPlan> {
  const fromLLM = await askLLM({
    task: "career_plan",
    system: CAREER_PLAN_SYSTEM,
    input: ctx,
    schema: CareerPlanSchema,
    // Thinking roughly doubles the time (~100 s vs ~50 s with kimi-k3) for little
    // gain here, so it is off. /plan allows 300 s; keep a generous limit anyway.
    effort: "low",
    timeoutMs: 240_000,
  });
  if (fromLLM) return { plan: sanitizePlan(fromLLM, ctx), source: "ai", model: llmModel() };
  return { plan: writeRulesPlan(ctx), source: "rules", model: null };
}

export type { CareerMatch, CareerPlan, HiddenPotential, ParsedResume, PlannedStage };
