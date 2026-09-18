/**
 * Rule-based career intelligence: career matching, hidden potential,
 * skill gaps, career readiness and job matching.
 *
 * Pure functions over a user's CareerProfileData and the Catalog, so they
 * can run anywhere and are easy to replace with LLM output later.
 */
import type { PreferenceDimension, PreferenceScores } from "@/lib/ai/questionnaire";
import { buildSkillMatchers, findSkillIds, type SkillMatcher } from "@/lib/ai/skill-matcher";
import type { Career, CareerProfileData, CareerSkill, Catalog, Job } from "@/lib/types";

export const LEVEL_LABELS: Record<number, string> = { 1: "Basic", 2: "Proficient", 3: "Advanced" };

export type SkillStatus = "ready" | "improving" | "missing";

const IMPORTANCE_WEIGHT: Record<number, number> = { 1: 1, 2: 2, 3: 3.5 };
const DIMENSIONS: PreferenceDimension[] = ["technical", "team", "research", "coding", "growth", "startup", "client"];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function skillLevels(data: Pick<CareerProfileData, "skills">): Map<string, number> {
  return new Map(data.skills.map((s) => [s.skill_id, s.level]));
}

function coverage(level: number, target: number) {
  return level <= 0 ? 0 : Math.min(level / target, 1);
}

export function statusFor(level: number, target: number): SkillStatus {
  if (level <= 0) return "missing";
  return level >= target ? "ready" : "improving";
}

/** Weighted share (0-1) of a career's requirements the user already meets. */
export function skillScore(levels: Map<string, number>, requirements: CareerSkill[]) {
  let got = 0;
  let total = 0;
  for (const req of requirements) {
    const weight = IMPORTANCE_WEIGHT[req.importance] ?? 1;
    total += weight;
    got += weight * coverage(levels.get(req.skill_id) ?? 0, req.target_level);
  }
  return total === 0 ? 0 : got / total;
}

/** Similarity (0-1) between a user's preferences and a career profile, or null without answers. */
export function preferenceFit(scores: PreferenceScores | null | undefined, careerProfile: unknown) {
  if (!scores || Object.keys(scores).length === 0) return null;
  const profile = (careerProfile ?? {}) as Record<string, number>;
  let diff = 0;
  let count = 0;
  for (const d of DIMENSIONS) {
    const u = scores[d];
    const c = profile[d];
    if (typeof u !== "number" || typeof c !== "number") continue;
    diff += Math.abs(u - c);
    count += 1;
  }
  return count === 0 ? null : 1 - diff / (count * 4);
}

function preferenceScores(data: CareerProfileData): PreferenceScores | null {
  return (data.preferences?.scores as PreferenceScores | undefined) ?? null;
}

// ---------------------------------------------------------------------------
// Career matching
// ---------------------------------------------------------------------------

export interface SkillRequirementView {
  skillId: string;
  level: number;
  target: number;
  importance: number;
  status: SkillStatus;
}

export interface CareerMatch {
  career: Career;
  /** 0-100 */
  score: number;
  skillScore: number;
  preferenceFit: number | null;
  have: SkillRequirementView[];
  gaps: SkillRequirementView[];
}

function relevantExperienceBonus(data: CareerProfileData, requirements: CareerSkill[]) {
  const required = new Set(requirements.map((r) => r.skill_id));
  const entries = [...data.experiences.map((e) => e.skills), ...data.projects.map((p) => p.skills)];
  const relevant = entries.filter((skills) => skills.some((s) => required.has(s))).length;
  return Math.min(relevant * 0.025, 0.08);
}

export function matchCareer(data: CareerProfileData, catalog: Catalog, careerId: string): CareerMatch | null {
  const career = catalog.careerById.get(careerId);
  if (!career) return null;
  const requirements = catalog.requirementsByCareer.get(careerId) ?? [];
  const levels = skillLevels(data);
  const sScore = skillScore(levels, requirements);
  const pFit = preferenceFit(preferenceScores(data), career.preference_profile);
  const base = pFit === null ? sScore : 0.7 * sScore + 0.3 * pFit;
  const score = Math.round(clamp((base + relevantExperienceBonus(data, requirements)) * 100, 3, 97));

  const views = requirements.map((req) => {
    const level = levels.get(req.skill_id) ?? 0;
    return {
      skillId: req.skill_id,
      level,
      target: req.target_level,
      importance: req.importance,
      status: statusFor(level, req.target_level),
    };
  });
  return {
    career,
    score,
    skillScore: sScore,
    preferenceFit: pFit,
    have: views.filter((v) => v.level > 0),
    gaps: views.filter((v) => v.status !== "ready"),
  };
}

/** All careers, best match first. */
export function rankCareers(data: CareerProfileData, catalog: Catalog): CareerMatch[] {
  return catalog.careers
    .map((c) => matchCareer(data, catalog, c.id))
    .filter((m): m is CareerMatch => m !== null)
    .sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Hidden career potential
// ---------------------------------------------------------------------------

const MAJOR_FIELDS: [RegExp, string][] = [
  [/data|analytics|statistic|machine learning|artificial intelligence|\bai\b/i, "Data & AI"],
  [/computer science|software|computing|computer engineering/i, "Software"],
  [/information technology|information systems|network/i, "Cloud & Infrastructure"],
  [/\bIT\b/, "Cloud & Infrastructure"],
  [/cyber|security/i, "Security"],
  [/design|interaction|hci/i, "Product & Design"],
  [/finance|actuarial|economics|quantitative|mathemat/i, "Finance"],
  [/business|commerce|management|marketing/i, "Business"],
];

/** The field the user's background mostly points to. */
export function primaryField(data: CareerProfileData, catalog: Catalog, ranked?: CareerMatch[]): string {
  const study = [data.profile.major, data.profile.degree, ...data.educations.map((e) => `${e.field ?? ""} ${e.degree ?? ""}`)]
    .filter(Boolean)
    .join(" ");
  for (const [pattern, field] of MAJOR_FIELDS) {
    if (pattern.test(study)) return field;
  }
  const top = (ranked ?? rankCareers(data, catalog))
    .slice()
    .sort((a, b) => b.skillScore - a.skillScore)[0];
  return top?.career.field ?? "General";
}

interface TraitContext {
  levels: Map<string, number>;
  prefs: PreferenceScores | null;
  data: CareerProfileData;
  catalog: Catalog;
}

const has = (ctx: TraitContext, ...ids: string[]) => ids.some((id) => (ctx.levels.get(id) ?? 0) > 0);

const TRAITS: Record<string, { label: string; test: (ctx: TraitContext) => boolean }> = {
  technical_depth: {
    label: "Strong technical background",
    test: (ctx) =>
      [...ctx.levels.entries()].filter(([id, level]) => {
        const category = ctx.catalog.skillById.get(id)?.category;
        return level >= 2 && (category === "technical" || category === "tool");
      }).length >= 5,
  },
  communication: {
    label: "Good communication ability",
    test: (ctx) => has(ctx, "communication", "writing", "presentation", "stakeholder-management"),
  },
  presentation: { label: "Presentation experience", test: (ctx) => has(ctx, "presentation") },
  client_facing: {
    label: "Comfortable working with clients",
    test: (ctx) => has(ctx, "stakeholder-management") || (ctx.prefs?.client ?? 0) >= 3.5,
  },
  cloud: { label: "Cloud-related experience", test: (ctx) => has(ctx, "aws", "azure", "gcp", "cloud-architecture", "docker", "kubernetes") },
  analytical: { label: "Strong analytical thinking", test: (ctx) => has(ctx, "statistics", "data-analysis", "problem-solving", "math") },
  research: {
    label: "Research experience",
    test: (ctx) => has(ctx, "research") || ctx.data.experiences.some((e) => e.kind === "research"),
  },
  business: {
    label: "Business awareness",
    test: (ctx) =>
      has(ctx, "business-analysis", "market-research", "accounting", "consulting", "product-management") ||
      (ctx.prefs?.technical ?? 5) <= 2.5,
  },
  leadership: { label: "Leadership experience", test: (ctx) => has(ctx, "leadership", "mentoring", "project-management") },
  design: { label: "Design sensibility", test: (ctx) => has(ctx, "ui-design", "ux-research", "figma") },
  security: {
    label: "Security mindset",
    test: (ctx) => has(ctx, "cybersecurity", "network-security", "siem", "incident-response", "penetration-testing", "cryptography"),
  },
  quant: { label: "Quantitative strength", test: (ctx) => (ctx.levels.get("math") ?? 0) >= 2 || (ctx.levels.get("statistics") ?? 0) >= 2 },
  building: { label: "You build and ship projects", test: (ctx) => ctx.data.projects.length >= 2 },
};

export interface HiddenPotential {
  match: CareerMatch;
  reasons: string[];
  explanation: string;
}

function article(word: string) {
  if (/^(ux|uni|use|eu)/i.test(word)) return "a";
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

/**
 * Careers outside the user's main field that their mix of strengths fits:
 * "which careers haven't you considered yet?"
 */
export function discoverHiddenPotential(
  data: CareerProfileData,
  catalog: Catalog,
  ranked: CareerMatch[] = rankCareers(data, catalog),
  limit = 3,
): HiddenPotential[] {
  const field = primaryField(data, catalog, ranked);
  const ctx: TraitContext = { levels: skillLevels(data), prefs: preferenceScores(data), data, catalog };
  const topIds = new Set(ranked.slice(0, 3).map((m) => m.career.id));

  return ranked
    .filter((m) => m.career.field !== field && !topIds.has(m.career.id) && m.score >= 30)
    .map((m) => {
      const reasons = m.career.traits.filter((t) => TRAITS[t]?.test(ctx)).map((t) => TRAITS[t].label);
      return { match: m, reasons };
    })
    .filter((c) => c.reasons.length >= 2)
    .sort((a, b) => b.reasons.length * 12 + b.match.score - (a.reasons.length * 12 + a.match.score))
    .slice(0, limit)
    .map(({ match, reasons }) => {
      const title = match.career.title;
      const summary = match.career.summary.charAt(0).toLowerCase() + match.career.summary.slice(1);
      return {
        match,
        reasons,
        explanation:
          `Although your background is mainly in ${field}, your combination of ` +
          `${reasons[0].toLowerCase()} and ${reasons[1].toLowerCase()} also suits ${article(title)} ${title}: ` +
          `someone who ${summary.replace(/\.$/, "")}.`,
      };
    });
}

// ---------------------------------------------------------------------------
// Skill gap
// ---------------------------------------------------------------------------

export interface SkillGapItem extends SkillRequirementView {
  name: string;
  why: string;
  evidence: string[];
  nextStep: string;
}

export interface SkillGap {
  career: Career;
  ready: SkillGapItem[];
  improving: SkillGapItem[];
  missing: SkillGapItem[];
}

let matcherCache: { catalog: Catalog; matchers: SkillMatcher[] } | null = null;
function matchersFor(catalog: Catalog) {
  if (matcherCache?.catalog !== catalog) {
    matcherCache = { catalog, matchers: buildSkillMatchers(catalog.skills) };
  }
  return matcherCache.matchers;
}

/** Where in the profile the user has demonstrated a skill. */
export function skillEvidence(data: CareerProfileData, catalog: Catalog, skillId: string): string[] {
  const matchers = matchersFor(catalog).filter((m) => m.id === skillId);
  const mentions = (text: string | null | undefined) => Boolean(text) && findSkillIds(text!, matchers).length > 0;
  const evidence: string[] = [];
  for (const e of data.experiences) {
    if (e.skills.includes(skillId) || mentions(`${e.title} ${e.description ?? ""}`)) {
      const kind = e.kind === "internship" ? "Internship" : e.kind === "research" ? "Research" : "Experience";
      evidence.push(`${kind}: ${e.title}${e.organization ? ` at ${e.organization}` : ""}`);
    }
  }
  for (const p of data.projects) {
    if (p.skills.includes(skillId) || mentions(`${p.name} ${p.description ?? ""}`)) {
      evidence.push(`Project: ${p.name}`);
    }
  }
  for (const ed of data.educations) {
    if (ed.courses.some((c) => mentions(c))) evidence.push(`Coursework: ${ed.degree ?? ed.school}`);
  }
  for (const c of data.certifications) {
    if (mentions(c.name)) evidence.push(`Certification: ${c.name}`);
  }
  const userSkill = data.skills.find((s) => s.skill_id === skillId);
  if (userSkill && evidence.length === 0) {
    evidence.push(
      userSkill.source === "resume"
        ? "Listed on your resume"
        : userSkill.source === "roadmap"
          ? "Completed on your Career Roadmap"
          : "Added to your profile",
    );
  }
  return evidence;
}

export function computeSkillGap(data: CareerProfileData, catalog: Catalog, careerId: string): SkillGap | null {
  const match = matchCareer(data, catalog, careerId);
  if (!match) return null;
  const toItem = (v: SkillRequirementView): SkillGapItem => {
    const skill = catalog.skillById.get(v.skillId);
    const req = catalog.requirementsByCareer.get(careerId)?.find((r) => r.skill_id === v.skillId);
    return {
      ...v,
      name: skill?.name ?? v.skillId,
      why:
        req?.why ??
        `${skill?.name ?? v.skillId} is ${v.importance === 3 ? "a core" : v.importance === 2 ? "an important" : "a useful"} skill for ${article(match.career.title)} ${match.career.title}.`,
      evidence: v.level > 0 ? skillEvidence(data, catalog, v.skillId) : [],
      nextStep: skill?.learn_hint ?? `Practise ${skill?.name ?? v.skillId} in a small project.`,
    };
  };
  const all = [...match.have.filter((v) => v.status === "ready"), ...match.gaps].map(toItem);
  const byImportance = (a: SkillGapItem, b: SkillGapItem) => b.importance - a.importance;
  return {
    career: match.career,
    ready: all.filter((i) => i.status === "ready").sort(byImportance),
    improving: all.filter((i) => i.status === "improving").sort(byImportance),
    missing: all.filter((i) => i.status === "missing").sort(byImportance),
  };
}

// ---------------------------------------------------------------------------
// Career readiness
// ---------------------------------------------------------------------------

export interface Readiness {
  overall: number;
  skills: number;
  projects: number;
  experience: number;
  portfolio: number;
}

export function computeReadiness(data: CareerProfileData, catalog: Catalog, careerId: string): Readiness {
  const requirements = catalog.requirementsByCareer.get(careerId) ?? [];
  const required = new Set(requirements.map((r) => r.skill_id));
  const matchers = matchersFor(catalog).filter((m) => required.has(m.id));
  const relevant = (skills: string[], text: string) =>
    skills.some((s) => required.has(s)) || findSkillIds(text, matchers).length > 0;

  const skills = Math.round(skillScore(skillLevels(data), requirements) * 100);

  const relevantProjects = data.projects.filter((p) => relevant(p.skills, `${p.name} ${p.description ?? ""}`)).length;
  const otherProjects = data.projects.length - relevantProjects;
  const projects = Math.round(Math.min(relevantProjects / 2 + otherProjects * 0.15, 1) * 100);

  let expPoints = 0;
  for (const e of data.experiences) {
    const isRelevant = relevant(e.skills, `${e.title} ${e.description ?? ""}`);
    const weight = e.kind === "internship" || e.kind === "work" ? 1 : e.kind === "research" ? 0.75 : 0.4;
    expPoints += isRelevant ? weight : weight * 0.3;
  }
  const experience = Math.round(Math.min(expPoints / 2, 1) * 100);

  let portfolio = 0;
  if (data.profile.github_url || data.portfolio.some((p) => p.kind === "github")) portfolio += 35;
  if (data.profile.website_url || data.portfolio.some((p) => p.kind !== "github")) portfolio += 30;
  if (data.projects.some((p) => p.url)) portfolio += 20;
  if (data.profile.linkedin_url) portfolio += 15;

  const overall = Math.round(0.5 * skills + 0.2 * projects + 0.15 * experience + 0.15 * portfolio);
  return { overall, skills, projects, experience, portfolio: Math.min(portfolio, 100) };
}

// ---------------------------------------------------------------------------
// Job matching
// ---------------------------------------------------------------------------

export interface JobMatch {
  score: number;
  strengths: string[];
  gaps: { skillId: string; required: boolean }[];
  verdict: "ready" | "good" | "stretch";
  message: string;
}

export function matchJob(
  data: CareerProfileData,
  catalog: Catalog,
  job: Pick<Job, "required_skills" | "preferred_skills" | "job_type" | "location" | "career_id" | "grad_years">,
): JobMatch {
  const levels = skillLevels(data);
  const credit = (id: string) => {
    const level = levels.get(id) ?? 0;
    return level >= 2 ? 1 : level === 1 ? 0.6 : 0;
  };
  let got = 0;
  let total = 0;
  for (const id of job.required_skills) {
    total += 2;
    got += 2 * credit(id);
  }
  for (const id of job.preferred_skills) {
    total += 1;
    got += credit(id);
  }
  const skillFit = total === 0 ? 0.5 : got / total;

  const prefs = data.preferences;
  let prefFit = 0.5;
  if (prefs && (prefs.work_types.length > 0 || prefs.preferred_locations.length > 0)) {
    prefFit = 0;
    if (prefs.work_types.length === 0 || prefs.work_types.includes(job.job_type)) prefFit += 0.5;
    const location = (job.location ?? "").toLowerCase();
    if (prefs.preferred_locations.length === 0 || prefs.preferred_locations.some((l) => location.includes(l.toLowerCase()))) {
      prefFit += 0.5;
    }
  }

  let bonus = 0;
  if (job.career_id && data.goal?.career_id === job.career_id) bonus += 0.04;
  if (job.grad_years.length > 0 && data.profile.graduation_year) {
    bonus += job.grad_years.includes(data.profile.graduation_year) ? 0.03 : -0.05;
  }

  const score = Math.round(clamp((0.85 * skillFit + 0.15 * prefFit + bonus) * 100, 3, 98));
  const strengths = [...job.required_skills, ...job.preferred_skills].filter((id) => (levels.get(id) ?? 0) > 0);
  const gaps = [
    ...job.required_skills.filter((id) => credit(id) < 1).map((skillId) => ({ skillId, required: true })),
    ...job.preferred_skills.filter((id) => credit(id) < 1).map((skillId) => ({ skillId, required: false })),
  ];
  const name = (id: string) => catalog.skillById.get(id)?.name ?? id;
  const verdict = score >= 80 ? "ready" : score >= 60 ? "good" : "stretch";
  const message =
    verdict === "ready"
      ? "You are ready to apply."
      : verdict === "good"
        ? gaps.length > 0
          ? `Good match, but improving ${name(gaps[0].skillId)} may strengthen your application.`
          : "Good match. Tailor your resume to this role before applying."
        : `Stretch role. Build ${gaps
            .slice(0, 2)
            .map((g) => name(g.skillId))
            .join(" and ")} first to become competitive.`;
  return { score, strengths, gaps, verdict, message };
}
