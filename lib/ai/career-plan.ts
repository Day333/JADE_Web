/**
 * AI Career Plan: a personalised, narrative plan built on top of the skill
 * gap and the staged roadmap. The same context and output schema are used by
 * the LLM (see CAREER_PLAN_SYSTEM) and by the rule-based writer below.
 */
import { z } from "zod";
import { LEVEL_LABELS, type HiddenPotential, type Readiness, type SkillGap } from "@/lib/ai/matching";
import type { PlannedStage } from "@/lib/ai/roadmap";
import type { RankedJob } from "@/lib/data/jobs";
import type { CareerProfileData, Catalog } from "@/lib/types";

// ---------------------------------------------------------------------------
// Output contract
// ---------------------------------------------------------------------------

export const CareerPlanSchema = z.object({
  headline: z.string().describe("One line, e.g. 'Your 6-month plan to become a Machine Learning Engineer'"),
  summary: z.string().describe("2 short sentences: where the person is today and the overall strategy"),
  horizon: z.string().describe("Time frame of the plan, e.g. '6 months · Sep 2026 – Feb 2027'"),
  whereYouAre: z.object({
    // .catch(): the model intermittently omits these; accept the plan and let sanitizePlan backfill.
    strengths: z.array(z.string()).describe("the 3 strengths that matter most for the goal, grounded in the profile").catch([]),
    gaps: z.array(z.string()).describe("the 3 most important gaps for the goal").catch([]),
  }),
  strategy: z
    .array(z.object({ title: z.string(), detail: z.string() }))
    .describe("2-3 key strategic moves, most important first"),
  phases: z
    .array(
      z.object({
        name: z.string(),
        timeframe: z.string().describe("Months covered, matching the roadmap period labels"),
        goal: z.string(),
        actions: z.array(z.string()).describe("2-3 concrete actions"),
        deliverable: z.string().describe("What exists at the end of the phase").catch(""),
      }),
    )
    .describe("3 phases that together cover the roadmap"),
  weeklyRhythm: z.array(z.string()).describe("3 habits for a typical week"),
  milestones: z
    .array(z.object({ when: z.string(), milestone: z.string(), measure: z.string() }))
    .describe("3-4 checkpoints with a measurable signal"),
  targetOpportunities: z
    .array(z.object({ jobId: z.string(), why: z.string() }))
    .describe("Up to 3 jobs from the provided opportunities list, by jobId"),
  alternativePaths: z
    .array(z.object({ careerId: z.string(), why: z.string() }))
    .describe("Up to 2 careers from the provided alternatives list, by careerId"),
  risks: z.array(z.object({ risk: z.string(), mitigation: z.string() })).describe("2-3 realistic risks"),
  thisWeek: z.array(z.string()).describe("3 small actions the person can start this week"),
});

export type CareerPlan = z.infer<typeof CareerPlanSchema>;

export const CAREER_PLAN_SYSTEM = `You are JADE's career planning coach for university students, graduates and early-career professionals.

You receive a JSON snapshot of one person's Career Profile, their chosen target career, their skill gap, their Career Readiness score, their month-by-month roadmap, matching job opportunities and alternative career paths. Write a personalised career plan that turns this into a clear strategy.

Guidelines:
- Write in English, in the second person ("you"), warm but direct. No filler, no generic advice that would fit anyone.
- Ground every point in the data: name their actual experiences, projects, strengths and gaps. Do not invent facts, employers, courses or credentials that are not in the input.
- Follow the roadmap's order and period labels for the phases so the plan and the roadmap agree.
- targetOpportunities may only use jobId values from input.opportunities; alternativePaths may only use careerId values from input.alternatives. Leave them empty if nothing fits.
- Keep it scannable. List items are one short sentence or fragment (aim for under 15 words); detail, why, measure and mitigation are one sentence. Never use two items where one will do, repeat a point another section already makes, or explain the obvious.
- Highlight only what matters most: wrap a short phrase (2-4 words) in **double asterisks** — the one skill to start with, the key deliverable, a number that counts. At most one per item and 6-8 in the whole plan, never zero and never a whole sentence: they are the few things the reader should remember.
- Be realistic about timing, workload and competition for entry-level roles.`;

// ---------------------------------------------------------------------------
// Context shared by the LLM and the rule-based writer
// ---------------------------------------------------------------------------

export interface PlanContext {
  today: string;
  person: {
    name: string | null;
    headline: string | null;
    location: string | null;
    graduationYear: number | null;
    openToOpportunities: boolean;
    education: { degree: string | null; school: string; end: string | null }[];
    experiences: { title: string; organization: string | null; kind: string; start: string | null; end: string | null }[];
    projects: { name: string; skills: string[] }[];
  };
  preferences: { workTypes: string[]; locations: string[]; industries: string[] } | null;
  goal: { careerId: string; title: string; summary: string; careerPath: string[] };
  readiness: Readiness;
  skillGap: {
    ready: string[];
    improving: { name: string; level: string; target: string }[];
    missing: { name: string; importance: "core" | "important" | "useful"; why: string; nextStep: string }[];
  };
  roadmap: { period: string; title: string; kind: string; tasksDone: number; tasksTotal: number }[];
  opportunities: { jobId: string; title: string; company: string; location: string | null; match: number; verdict: string; gaps: string[] }[];
  alternatives: { careerId: string; title: string; match: number; reasons: string[] }[];
  community: { name: string; slug: string } | null;
}

export function buildPlanContext(args: {
  data: CareerProfileData;
  catalog: Catalog;
  careerId: string;
  readiness: Readiness;
  gap: SkillGap;
  roadmap: { period: string; title: string; kind: string; tasksDone: number; tasksTotal: number }[];
  ranked: RankedJob[];
  hidden: HiddenPotential[];
  community: { name: string; slug: string } | null;
  today?: Date;
}): PlanContext {
  const { data, catalog, careerId, readiness, gap, roadmap, ranked, hidden, community } = args;
  const career = catalog.careerById.get(careerId)!;
  const name = (id: string) => catalog.skillById.get(id)?.name ?? id;
  const importance = (n: number) => (n === 3 ? "core" : n === 2 ? "important" : "useful") as "core" | "important" | "useful";
  // Roles on the goal's own path first (best match first), then other strong matches.
  const onPath = ranked.filter((r) => r.job.career_id === careerId);
  const others = ranked.filter((r) => r.job.career_id !== careerId && r.match.score >= 70);
  const relevant = [...onPath, ...others];
  return {
    today: (args.today ?? new Date()).toISOString().slice(0, 10),
    person: {
      name: data.profile.full_name,
      headline: data.profile.headline,
      location: data.profile.location,
      graduationYear: data.profile.graduation_year,
      openToOpportunities: data.profile.open_to_opportunities,
      education: data.educations.map((e) => ({ degree: e.degree, school: e.school, end: e.end_date })),
      experiences: data.experiences.map((e) => ({
        title: e.title,
        organization: e.organization,
        kind: e.kind,
        start: e.start_date,
        end: e.end_date,
      })),
      projects: data.projects.map((p) => ({ name: p.name, skills: p.skills.map(name) })),
    },
    preferences: data.preferences
      ? {
          workTypes: data.preferences.work_types,
          locations: data.preferences.preferred_locations,
          industries: data.preferences.interested_industries,
        }
      : null,
    goal: { careerId, title: career.title, summary: career.summary, careerPath: career.career_path },
    readiness,
    skillGap: {
      ready: gap.ready.map((i) => i.name),
      improving: gap.improving.map((i) => ({ name: i.name, level: LEVEL_LABELS[i.level], target: LEVEL_LABELS[i.target] })),
      missing: gap.missing.map((i) => ({ name: i.name, importance: importance(i.importance), why: i.why, nextStep: i.nextStep })),
    },
    roadmap,
    opportunities: relevant.slice(0, 6).map(({ job, match }) => ({
      jobId: job.id,
      title: job.title,
      company: job.company?.name ?? "",
      location: job.location,
      match: match.score,
      verdict: match.message,
      gaps: match.gaps.slice(0, 3).map((g) => name(g.skillId)),
    })),
    alternatives: hidden.map((h) => ({
      careerId: h.match.career.id,
      title: h.match.career.title,
      match: h.match.score,
      reasons: h.reasons,
    })),
    community,
  };
}

/** Roadmap rows for the context, from a stored or freshly planned roadmap. */
export function roadmapRowsFromPlan(stages: PlannedStage[]) {
  return stages.map((s) => ({ period: s.periodLabel, title: s.title, kind: s.kind, tasksDone: 0, tasksTotal: s.tasks.length }));
}

/** Drop references the model may have invented, and cap list lengths. */
export function sanitizePlan(plan: CareerPlan, ctx: PlanContext): CareerPlan {
  const jobIds = new Set(ctx.opportunities.map((o) => o.jobId));
  const careerIds = new Set(ctx.alternatives.map((a) => a.careerId));
  // The model occasionally omits these lists (they are .catch(...) in the schema): rebuild them from the skill gap.
  const strengths = plan.whereYouAre.strengths.length
    ? plan.whereYouAre.strengths
    : ctx.skillGap.ready.map((n) => `${n} already meets the level ${ctx.goal.title}s need`);
  const gaps = plan.whereYouAre.gaps.length
    ? plan.whereYouAre.gaps
    : [
        ...ctx.skillGap.missing.map((m) => `${m.name} (${m.importance} skill, not shown yet)`),
        ...ctx.skillGap.improving.map((i) => `${i.name}: ${i.level} today, ${i.target} needed`),
      ];
  // Sub-lists are capped at 3 items so the plan stays scannable.
  return {
    ...plan,
    whereYouAre: { strengths: strengths.slice(0, 3), gaps: gaps.slice(0, 3) },
    strategy: plan.strategy.slice(0, 3),
    phases: plan.phases.slice(0, 4).map((p) => ({ ...p, actions: p.actions.slice(0, 3) })),
    weeklyRhythm: plan.weeklyRhythm.slice(0, 3),
    milestones: plan.milestones.slice(0, 4),
    targetOpportunities: plan.targetOpportunities.filter((o) => jobIds.has(o.jobId)).slice(0, 3),
    alternativePaths: plan.alternativePaths.filter((a) => careerIds.has(a.careerId)).slice(0, 2),
    risks: plan.risks.slice(0, 3),
    thisWeek: plan.thisWeek.slice(0, 3),
  };
}

// ---------------------------------------------------------------------------
// Rule-based writer (used until an LLM is connected, and as its fallback)
// ---------------------------------------------------------------------------

const article = (word: string) => (/^(ux|uni|use|eu)/i.test(word) ? "a" : /^[aeiou]/i.test(word) ? "an" : "a");

function list(items: string[], max = 3) {
  const picked = items.slice(0, max);
  if (picked.length <= 1) return picked[0] ?? "";
  return `${picked.slice(0, -1).join(", ")} and ${picked[picked.length - 1]}`;
}

function span(rows: { period: string }[]) {
  if (rows.length === 0) return "";
  const first = rows[0].period;
  const last = rows[rows.length - 1].period;
  return first === last ? first : `${first} – ${last}`;
}

const shortMonth = (label: string) => label.replace(/^(\w{3})\w*/, "$1");

export function writeRulesPlan(ctx: PlanContext): CareerPlan {
  const { goal, readiness, skillGap, roadmap, person } = ctx;
  const months = Math.max(roadmap.length, 1);
  const coreMissing = skillGap.missing.filter((m) => m.importance === "core");
  const gapNames = [...coreMissing.map((m) => m.name), ...skillGap.improving.map((i) => i.name), ...skillGap.missing.filter((m) => m.importance !== "core").map((m) => m.name)];
  const strengths = skillGap.ready.slice(0, 4);
  const firstRole = goal.careerPath[0] ?? `entry-level ${goal.title}`;
  const apply = roadmap.find((r) => r.kind === "apply");
  const project = roadmap.find((r) => r.kind === "project");
  const skillStages = roadmap.filter((r) => r.kind === "skill");
  const latestExperience = person.experiences[0];
  const existingProject = person.projects[0];

  // Where you are
  const strengthLines = [
    ...strengths.map((s) => `${s} already meets the level ${goal.title}s need`),
    ...(latestExperience
      ? [`Hands-on experience as ${latestExperience.title}${latestExperience.organization ? ` at ${latestExperience.organization}` : ""}`]
      : []),
    ...(person.projects.length > 0 ? [`${person.projects.length} project${person.projects.length > 1 ? "s" : ""} you can build on`] : []),
  ].slice(0, 3);
  const gapLines = [
    ...coreMissing.map((m) => `${m.name} (core skill, not shown yet)`),
    ...skillGap.improving.map((i) => `${i.name}: ${i.level} today, ${i.target} needed`),
    ...skillGap.missing.filter((m) => m.importance !== "core").map((m) => `${m.name}`),
  ].slice(0, 3);

  // Wrapping a phrase in ** marks it as a highlight (see the plan schema/prompt).
  const bold = (text: string) => (text ? `**${text}**` : text);
  const summary =
    readiness.overall >= 80
      ? `You are ${readiness.overall}% ready for ${goal.title}, which is already competitive. This plan focuses on polishing your evidence and applying in parallel, while closing the last gaps (${bold(list(gapNames, 2)) || "none critical"}).`
      : `You are ${readiness.overall}% ready for ${goal.title}. Your foundation in ${list(strengths, 3) || "your studies"} is solid; the biggest gaps are ${bold(list(gapNames, 3))}. The plan closes the core gaps first, turns them into visible proof with a portfolio project, then moves you into applications${apply ? ` from ${apply.period}` : ""}.`;

  // Strategy
  const strategy: CareerPlan["strategy"] = [];
  if (coreMissing.length > 0 || skillGap.improving.length > 0) {
    const focus = [...coreMissing.map((m) => m.name), ...skillGap.improving.map((i) => i.name)];
    strategy.push({
      title: `Close the core gaps first: ${list(focus, 3)}`,
      detail: `${coreMissing[0]?.why ?? "These are the skills employers screen for first."} Learn them in the order of your roadmap, **one focus skill per month**.`,
    });
  }
  strategy.push({
    title: "Prove it with a project, not just courses",
    detail: existingProject
      ? `Extend "${existingProject.name}" or build a new ${goal.title.toLowerCase()} project that uses your new skills **end to end**, so recruiters can see the result.`
      : `Build one **end-to-end** ${goal.title.toLowerCase()} project that uses your new skills, and publish it with a clear README.`,
  });
  if (readiness.experience < 60) {
    strategy.push({
      title: "Get real-world exposure early",
      detail: "Look for internships, research assistant roles or open-source contributions now; experience is your lowest readiness score.",
    });
  }
  strategy.push({
    title: readiness.portfolio < 70 ? "Make your profile easy to find and trust" : "Apply early and in parallel",
    detail:
      readiness.portfolio < 70
        ? `Your portfolio score is ${readiness.portfolio}%. Link your GitHub and personal site, keep your Career Profile current${person.openToOpportunities ? "" : ", and turn on Open to Opportunities so recruiters can reach you"}.`
        : `Start applying before you feel fully ready: target ${firstRole} and graduate roles${ctx.preferences?.locations.length ? ` in ${list(ctx.preferences.locations, 2)}` : ""}, and tailor each application to the role's gaps.`,
  });

  // Phases: foundation (first skill stages), build (remaining skills + project), launch (portfolio + apply)
  const half = Math.ceil(skillStages.length / 2);
  const foundation = skillStages.slice(0, half);
  const build = [...skillStages.slice(half), ...(project ? [project] : [])];
  const launch = roadmap.filter((r) => r.kind === "portfolio" || r.kind === "apply");
  const phases: CareerPlan["phases"] = [];
  if (foundation.length > 0) {
    phases.push({
      name: "Foundation",
      timeframe: span(foundation),
      goal: `Reach a working level in ${bold(list(foundation.map((s) => s.title.replace(/^(Learn|Strengthen) /, "")), 3))}.`,
      actions: foundation.map((s) => s.title).concat(["Log what you learn as short notes you can reuse in interviews"]).slice(0, 3),
      deliverable: "Small exercises in a public repository showing each new skill",
    });
  }
  if (build.length > 0) {
    phases.push({
      name: "Build & prove",
      timeframe: span(build),
      goal: `Turn your skills into evidence a ${goal.title} hiring manager recognises.`,
      actions: build.map((s) => s.title).concat(["Ask for feedback on your project in the community"]).slice(0, 3),
      deliverable: `A **portfolio-ready** ${goal.title.toLowerCase()} project with a README and demo`,
    });
  }
  if (launch.length > 0) {
    phases.push({
      name: "Launch",
      timeframe: span(launch),
      goal: `Get interviews for ${firstRole} and graduate roles.`,
      actions: [
        ...launch.map((s) => s.title),
        "Update your resume with the new skills and project",
        "Apply to your top matches and message one recruiter per week",
      ].slice(0, 3),
      deliverable: "Applications submitted and conversations with recruiters under way",
    });
  }

  const milestones: CareerPlan["milestones"] = [
    ...(foundation.length > 0
      ? [{ when: shortMonth(foundation[foundation.length - 1].period), milestone: "Core skills in place", measure: "Roadmap skill stages complete; Skills readiness above 70%" }]
      : []),
    ...(project ? [{ when: shortMonth(project.period), milestone: "Portfolio project live", measure: "Public repository with README, linked on your Career Profile" }] : []),
    ...(apply
      ? [{ when: shortMonth(apply.period), milestone: "Applications out", measure: "At least **3 applications** submitted to roles with 70%+ match" }]
      : []),
    { when: "End of plan", milestone: `Ready for ${goal.title}`, measure: "Career Readiness of 80% or more" },
  ];

  const thisWeek = [
    ...(skillStages[0] ? [`Start **"${skillStages[0].title}"** on your roadmap`] : []),
    ...(!person.openToOpportunities ? ["Turn on Open to Opportunities in Settings"] : []),
    ...(ctx.community ? [`Follow the ${ctx.community.name} community and read two recent posts`] : []),
    ...(ctx.opportunities[0] ? [`Save "${ctx.opportunities[0].title}" and note what it asks for`] : []),
    "Block three 90-minute learning sessions in your calendar",
  ].slice(0, 3);

  const risks: CareerPlan["risks"] = [
    {
      risk: "Learning without shipping",
      mitigation: "Every skill stage ends with something you publish; don't move on until it's online.",
    },
    {
      risk: "Applying too late",
      mitigation: "Graduate programs and internships close months ahead. Watch deadlines and apply before the plan ends.",
    },
  ];
  const gradSoon = person.graduationYear && person.graduationYear <= new Date(ctx.today).getFullYear() + 1;
  if (gradSoon) {
    risks.unshift({
      risk: `Limited time before graduation (${person.graduationYear})`,
      mitigation: "Prioritise core skills and one strong project over breadth.",
    });
  }
  if (ctx.alternatives.length > 0) {
    risks.push({
      risk: `Relying on a single path into ${goal.title}`,
      mitigation: `Keep ${ctx.alternatives[0].title} in view as a second option that uses the same strengths.`,
    });
  }

  return {
    headline: `Your ${months}-month plan to become ${article(goal.title)} ${goal.title}`,
    summary,
    horizon: `${months} month${months > 1 ? "s" : ""} · ${span(roadmap.map((r) => ({ period: shortMonth(r.period) })))}`,
    whereYouAre: { strengths: strengthLines, gaps: gapLines },
    strategy: strategy.slice(0, 3),
    phases,
    weeklyRhythm: [
      "Three focused 90-minute sessions on the current roadmap skill",
      "One build session applying it to your project",
      "Every Friday, review new opportunities and save the best matches",
    ],
    milestones,
    targetOpportunities: ctx.opportunities.slice(0, 3).map((o) => ({ jobId: o.jobId, why: o.verdict })),
    alternativePaths: ctx.alternatives.slice(0, 2).map((a) => ({
      careerId: a.careerId,
      why: `Your ${list(a.reasons.map((r) => r.charAt(0).toLowerCase() + r.slice(1)), 2)} also fit this path.`,
    })),
    risks: risks.slice(0, 3),
    thisWeek,
  };
}
