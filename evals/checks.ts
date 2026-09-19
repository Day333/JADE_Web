/**
 * Rule-based checks on one AI Career Plan generation. Free and repeatable.
 *
 * trajectory — did the LLM call succeed, how many attempts, how long, how much?
 * grounding  — did the plan actually use the data we gave it (jobs, skill gap,
 *              roadmap, the person's own experience) and not invent any?
 */

import type { CareerPlan, PlanContext } from "@/lib/ai/career-plan";
import type { LLMCallRecord } from "@/lib/ai/llm";
import { config } from "./config";

export type CheckStatus = "pass" | "fail" | "warn" | "skip";

export interface CheckResult {
  name: string;
  group: "trajectory" | "grounding";
  status: CheckStatus;
  detail: string;
}

export interface EvalCase {
  id: string;
  description?: string;
  context: PlanContext;
}

export interface EvalRun {
  evalCase: EvalCase;
  llmConfigured: boolean;
  source: "ai" | "rules";
  model: string | null;
  /** The plan users see (after sanitizePlan). */
  plan: CareerPlan;
  /** Every askLLM call made while generating it. */
  calls: LLMCallRecord[];
}

// ---------------------------------------------------------------- helpers

const pct = (x: number) => `${Math.round(x * 100)}%`;
const check = (group: CheckResult["group"], name: string, status: CheckStatus, detail: string): CheckResult => ({
  name,
  group,
  status,
  detail,
});

/** Lowercase, hyphens as spaces, British -is- spellings as -iz- ("data-visualisation" = "data visualization"). */
function normalize(s: string) {
  return s.toLowerCase().replace(/-/g, " ").replace(/is(ation|ing|ed|e)\b/g, "iz$1");
}

function termRegex(term: string) {
  const escaped = normalize(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9+#])${escaped}($|[^a-z0-9+#])`, "i");
}

export function mentions(text: string, term: string) {
  return term.trim().length > 0 && termRegex(term.trim()).test(normalize(text));
}

// Words too generic to identify an experience or project on their own.
const GENERIC_WORDS = new Set(["the", "and", "for", "with", "university", "school", "project", "pipeline", "app", "part", "time"]);

/**
 * Does the text refer to this experience/project? Accepts the exact name
 * (ignoring parentheses) or a paraphrase that uses most of its distinctive
 * words in one line, e.g. "your timetable ETL" for "University timetable ETL pipeline".
 */
export function mentionsAnchor(text: string, anchor: string): boolean {
  const clean = anchor.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length < 3) return false;
  if (mentions(text, clean)) return true;
  const words = clean
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((w) => w.length >= 3 && !GENERIC_WORDS.has(w));
  if (words.length < 2) return false;
  return text.split("\n").some((line) => words.filter((w) => mentions(line, w)).length / words.length >= 0.6);
}

export function planCall(run: EvalRun): LLMCallRecord | undefined {
  return run.calls.find((c) => c.task === "career_plan");
}

/** The model's own output before sanitizePlan removed invented ids. */
export function rawPlan(run: EvalRun): CareerPlan | null {
  const call = planCall(run);
  return call?.result === "ok" ? (call.output as CareerPlan) : null;
}

export function planText(plan: CareerPlan): string {
  return [
    plan.headline,
    plan.summary,
    ...plan.whereYouAre.strengths,
    ...plan.whereYouAre.gaps,
    ...plan.strategy.flatMap((s) => [s.title, s.detail]),
    ...plan.phases.flatMap((p) => [p.name, p.goal, p.deliverable, ...p.actions]),
    ...plan.weeklyRhythm,
    ...plan.milestones.flatMap((m) => [m.milestone, m.measure]),
    ...plan.risks.flatMap((r) => [r.risk, r.mitigation]),
    ...plan.thisWeek,
  ].join("\n");
}

export function callCost(call: LLMCallRecord): number | null {
  const price = config.cost.pricesPerMTok[call.model];
  if (!price) return null;
  return (call.inputTokens * price.input + call.outputTokens * price.output) / 1_000_000;
}

// ---------------------------------------------------------------- trajectory

function trajectoryChecks(run: EvalRun): CheckResult[] {
  const names = ["llm_used", "attempts", "latency", "cost"];
  if (!run.llmConfigured) {
    return names.map((n) =>
      check("trajectory", n, "skip", "LLM not configured (DASHSCOPE_API_KEY / LLM_BASE_URL unset); only the rule-based plan was checked"),
    );
  }
  const call = planCall(run);
  if (!call) return names.map((n) => check("trajectory", n, "fail", "career_plan never called the LLM"));

  const outcomes = call.attempts.map((a) => a.outcome).join(" → ") || "no attempt";
  const results: CheckResult[] = [];

  results.push(
    call.result === "ok" && run.source === "ai"
      ? check("trajectory", "llm_used", "pass", `plan written by ${call.model}`)
      : check("trajectory", "llm_used", "fail", `fell back to the rule-based plan (${call.fallbackReason ?? "unknown reason"})`),
  );

  if (call.result === "ok" && call.attempts.length === 1) {
    results.push(check("trajectory", "attempts", "pass", "valid output on the first attempt"));
  } else if (call.result === "ok") {
    results.push(check("trajectory", "attempts", "warn", `recovered after retry: ${outcomes}`));
  } else {
    results.push(check("trajectory", "attempts", "fail", `${outcomes} → gave up`));
  }

  const max = config.latency.maxMsPerCall;
  results.push(
    check(
      "trajectory",
      "latency",
      call.durationMs <= max ? "pass" : "fail",
      `${(call.durationMs / 1000).toFixed(1)} s (max ${max / 1000} s)`,
    ),
  );

  const tokens = `${call.inputTokens} in / ${call.outputTokens} out tokens`;
  const cost = callCost(call);
  const { currency, maxPerCase } = config.cost;
  if (call.inputTokens + call.outputTokens === 0) {
    results.push(check("trajectory", "cost", "warn", "the endpoint reported no token usage"));
  } else if (cost === null) {
    results.push(check("trajectory", "cost", "warn", `${tokens}; no price for ${call.model} in evals/config.ts`));
  } else {
    results.push(
      check(
        "trajectory",
        "cost",
        cost <= maxPerCase ? "pass" : "fail",
        `${tokens} = ${cost.toFixed(4)} ${currency} (max ${maxPerCase} ${currency})`,
      ),
    );
  }
  return results;
}

// ---------------------------------------------------------------- grounding

function groundingChecks(run: EvalRun): CheckResult[] {
  const ctx = run.evalCase.context;
  const plan = run.plan;
  const raw = rawPlan(run) ?? plan;
  const text = planText(plan);
  const results: CheckResult[] = [];

  // 1. Jobs and careers must come from the lists we gave the model.
  const jobIds = new Set(ctx.opportunities.map((o) => o.jobId));
  const invented = raw.targetOpportunities.map((o) => o.jobId).filter((id) => !jobIds.has(id));
  results.push(
    invented.length > 0
      ? check("grounding", "job_ids_valid", "fail", `model invented job ids: ${invented.join(", ")} (sanitizePlan hides them, but they were made up)`)
      : check("grounding", "job_ids_valid", "pass", `${raw.targetOpportunities.length} job(s) cited, all from the opportunities given`),
  );

  const careerIds = new Set(ctx.alternatives.map((a) => a.careerId));
  const inventedCareers = raw.alternativePaths.map((a) => a.careerId).filter((id) => !careerIds.has(id));
  results.push(
    inventedCareers.length > 0
      ? check("grounding", "career_ids_valid", "fail", `model invented career ids: ${inventedCareers.join(", ")}`)
      : check("grounding", "career_ids_valid", "pass", `${raw.alternativePaths.length} alternative path(s), all from the list given`),
  );

  // 2. If we gave it jobs, the plan should point at some of them.
  if (ctx.opportunities.length === 0) {
    results.push(check("grounding", "uses_opportunities", "pass", "no opportunities given"));
  } else {
    const used = plan.targetOpportunities.length;
    results.push(
      check(
        "grounding",
        "uses_opportunities",
        used > 0 ? "pass" : "fail",
        `${used}/${ctx.opportunities.length} given job(s) used as targets`,
      ),
    );
  }

  // 3. The plan must work on the skill gap we computed.
  const gaps = [
    ...ctx.skillGap.missing.filter((m) => m.importance !== "useful").map((m) => m.name),
    ...ctx.skillGap.improving.map((i) => i.name),
  ];
  if (gaps.length === 0) {
    results.push(check("grounding", "gap_coverage", "skip", "no core or important gaps"));
  } else {
    const covered = gaps.filter((g) => mentions(text, g));
    const share = covered.length / gaps.length;
    const min = config.grounding.minGapCoverage;
    const list = gaps.map((g) => `${g} ${covered.includes(g) ? "✓" : "✗"}`).join(", ");
    results.push(
      check("grounding", "gap_coverage", share >= min ? "pass" : "fail", `${covered.length}/${gaps.length} gaps addressed (${pct(share)}, min ${pct(min)}): ${list}`),
    );
  }

  // 4. Skills the person already has must not be listed as gaps.
  const gapText = plan.whereYouAre.gaps.join("\n");
  const readyAsGap = ctx.skillGap.ready.filter((s) => mentions(gapText, s));
  results.push(
    readyAsGap.length > 0
      ? check("grounding", "ready_not_gap", "fail", `lists skills the person already has as gaps: ${readyAsGap.join(", ")}`)
      : check("grounding", "ready_not_gap", "pass", "no ready skill listed as a gap"),
  );

  // 5. Personal: it should refer to the person's own experience or projects.
  const anchors = [
    ...ctx.person.experiences.flatMap((e) => [e.organization ?? "", e.title]),
    ...ctx.person.projects.map((p) => p.name),
  ].filter((a) => a.trim().length > 2);
  if (anchors.length === 0) {
    results.push(check("grounding", "mentions_profile", "skip", "profile has no experiences or projects"));
  } else {
    const hit = anchors.filter((a) => mentionsAnchor(text, a));
    results.push(
      hit.length > 0
        ? check("grounding", "mentions_profile", "pass", `refers to: ${[...new Set(hit)].join(", ")}`)
        : check("grounding", "mentions_profile", "fail", "never mentions the person's own experiences or projects"),
    );
  }

  // 6. Phases follow the roadmap's months.
  const { minPhases, maxPhases } = config.grounding;
  const months = [...new Set(ctx.roadmap.map((r) => r.period.slice(0, 3).toLowerCase()))];
  const n = plan.phases.length;
  if (ctx.roadmap.length === 0) {
    results.push(check("grounding", "phases_follow_roadmap", "skip", "no roadmap given"));
  } else {
    const off = plan.phases.filter((p) => !months.some((m) => p.timeframe.toLowerCase().includes(m)));
    const problems = [
      ...(n < minPhases || n > maxPhases ? [`${n} phases (expected ${minPhases}–${maxPhases})`] : []),
      ...off.map((p) => `"${p.name}" timeframe "${p.timeframe}" matches no roadmap month`),
    ];
    results.push(
      problems.length > 0
        ? check("grounding", "phases_follow_roadmap", "fail", problems.join("; "))
        : check("grounding", "phases_follow_roadmap", "pass", `${n} phases, all within the roadmap's months`),
    );
  }

  return results;
}

export function runChecks(run: EvalRun): CheckResult[] {
  return [...trajectoryChecks(run), ...groundingChecks(run)];
}
