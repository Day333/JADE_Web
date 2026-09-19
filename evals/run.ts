/**
 * Release-gate eval for the AI Career Plan.
 *
 * Runs the real generateCareerPlan() on every case in evals/cases, records each
 * LLM call (attempts, latency, tokens), checks the result, asks the judge model
 * to score it, and decides whether this version may be released.
 *
 *   npm run eval                    # all cases
 *   npm run eval -- --case <id>     # one case
 *
 * Exit code: 0 = release OK, 1 = release blocked, 2 = the eval itself could not run.
 * Full traces and plans are written to evals/reports/latest.json (summary in latest.md).
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { generateCareerPlan } from "@/lib/ai";
import { collectLLMCalls, isLLMConfigured, llmModel } from "@/lib/ai/llm";
import { callCost, rawPlan, runChecks, type CheckResult, type EvalCase, type EvalRun } from "./checks";
import { config } from "./config";
import { CONTROL_CASE_ID, hallucinatedPlan } from "./control";
import { evaluateGate, type CaseOutcome, type GateResult } from "./gate";
import { JUDGE_DIMENSIONS, judgePlan, judgeTarget, type JudgeResult } from "./judge";

const evalsDir = join(process.cwd(), "evals");
const casesDir = join(evalsDir, "cases");
const outDir = join(evalsDir, "reports");
const onlyCase = process.argv.includes("--case") ? process.argv[process.argv.indexOf("--case") + 1] : undefined;
// Uses the site's own LLM variables (DASHSCOPE_API_KEY, LLM_BASE_URL, LLM_MODEL).
// GitHub Actions sets CI=true: there the LLM must be configured, or release is blocked.
const requireLLM = process.env.CI === "true";

const icon: Record<CheckResult["status"], string> = { pass: "✔", fail: "✘", warn: "⚠", skip: "–" };

interface CaseReport extends CaseOutcome {
  description?: string;
  run: EvalRun;
}

function readCase(id: string): EvalCase {
  return JSON.parse(readFileSync(join(casesDir, `${id}.json`), "utf8")) as EvalCase;
}

function loadCases(): EvalCase[] {
  const files = readdirSync(casesDir).filter((f) => f.endsWith(".json")).sort();
  const cases = files.map((f) => JSON.parse(readFileSync(join(casesDir, f), "utf8")) as EvalCase);
  const selected = onlyCase ? cases.filter((c) => c.id === onlyCase) : cases;
  if (selected.length === 0) throw new Error(onlyCase ? `no case with id "${onlyCase}"` : `no cases in ${casesDir}`);
  return selected;
}

async function runCase(evalCase: EvalCase): Promise<CaseReport> {
  const { result, calls } = await collectLLMCalls(() => generateCareerPlan(evalCase.context));
  const run: EvalRun = {
    evalCase,
    llmConfigured: isLLMConfigured(),
    source: result.source,
    model: result.model,
    plan: result.plan,
    calls,
  };
  const checks = runChecks(run);
  const judge: JudgeResult = await judgePlan(evalCase.context, result.plan);
  return { caseId: evalCase.id, description: evalCase.description, run, checks, judge };
}

function printCase(r: CaseReport) {
  console.log(`\n■ ${r.caseId}${r.description ? ` — ${r.description}` : ""}`);
  console.log(`  plan source: ${r.run.source}${r.run.model ? ` (${r.run.model})` : ""}`);
  for (const c of r.checks) console.log(`  ${icon[c.status]} ${c.group}/${c.name}: ${c.detail}`);
  for (const call of r.run.calls.filter((c) => c.fallbackReason !== "not_configured")) {
    const cost = callCost(call);
    const attempts = call.attempts.map((a) => `${a.outcome} ${(a.durationMs / 1000).toFixed(1)}s`).join(" → ") || "—";
    console.log(
      `  call ${call.task} (${call.model}): ${attempts} · ${call.inputTokens}/${call.outputTokens} tokens` +
        (cost === null ? "" : ` · ${cost.toFixed(4)} ${config.cost.currency}`),
    );
  }
  if (r.judge.status === "scored") {
    const j = r.judge;
    console.log(`  judge (${j.model}): ` + JUDGE_DIMENSIONS.map((d) => `${d} ${j.scores[d].score}`).join(", "));
    for (const h of j.scores.hallucinations) console.log(`    possible hallucination: ${h}`);
  } else {
    console.log(`  judge ${r.judge.status}: ${r.judge.reason}`);
  }
}

function markdown(reports: CaseReport[], gate: GateResult) {
  const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
  const { minGrounding, warnBelow } = config.judge;
  const blocking = config.gate.blockingChecks;
  const judged = reports.find((r) => r.judge.status === "scored")?.judge;
  const generator = reports.find((r) => r.run.model)?.run.model ?? "rules only (LLM not configured)";

  const lines = [
    "# LLM evaluation suites",
    "",
    gate.pass ? "**✅ PASS — release allowed**" : "**❌ BLOCKED — release stopped**",
    "",
    ...gate.reasons.map((r) => `- ${esc(r)}`),
    ...(gate.reasons.length ? [""] : []),
  ];

  // 1. Deterministic trace checks, grouped.
  const all = reports.flatMap((r) => r.checks);
  const tally = (checks: CheckResult[]) => {
    const n = (s: CheckResult["status"]) => checks.filter((c) => c.status === s).length;
    const ran = checks.length - n("skip");
    if (ran === 0) return "skipped";
    const extra = [n("warn") && `${n("warn")} warn`, n("fail") && `${n("fail")} fail`].filter(Boolean).join(" · ");
    return `${n("fail") ? "⚠️" : "✅"} ${n("pass")}/${ran} pass${extra ? ` · ${extra}` : ""}`;
  };
  lines.push(
    "## 1. Deterministic trace checks",
    "Rule-based, free, recorded from LLM calls and compared against the input of the test plans.",
    "",
    "| What it checks | Result |",
    "|---|---|",
    `| Every recommended job and career exists in the input | ${tally(all.filter((c) => blocking.includes(c.name)))} |`,
    `| LLM call succeeded on the first try, ≤ ${config.latency.maxMsPerCall / 1000} s, within cost budget | ${tally(all.filter((c) => c.group === "trajectory"))} |`,
    `| Covers ≥ ${Math.round(config.grounding.minGapCoverage * 100)}% of skill gaps, targets the given jobs, cites own experience, follows the roadmap | ${tally(all.filter((c) => c.group === "grounding" && !blocking.includes(c.name)))} |`,
    "",
  );

  // 2. LLM-as-judge.
  const judgeModel = judged?.status === "scored" ? judged.model : null;
  const separate = judgeModel !== null && judgeModel !== generator;
  lines.push(
    "## 2. LLM-as-judge",
    `${separate ? "A separate" : "A"} judge model${judgeModel ? ` (\`${judgeModel}\`)` : ""} scores each plan from 1 to 5 on four factors. **Threshold: score ≥ ${warnBelow}.**`,
    "",
    "1. **Grounding** — traces back to the input, nothing invented",
    "2. **Personalization** — built on this person's strengths and gaps",
    "3. **Feasibility** — realistic workload",
    "4. **Actionability** — concrete steps and measurable milestones",
    "",
    `> **Note:** an invented employer, job or deadline would mislead a student and **will be blocked** (Grounding < ${minGrounding}).`,
    "",
  );

  // 3. Results, one row per case.
  const cell = (r: CaseReport, d: (typeof JUDGE_DIMENSIONS)[number]) => {
    if (r.judge.status !== "scored") return "–";
    const score = r.judge.scores[d].score;
    const low = d === "grounding" ? score < minGrounding : score < warnBelow;
    return low ? `**${score}** ${d === "grounding" ? "❌" : "⚠️"}` : String(score);
  };
  lines.push(
    "## 3. Results",
    "| Eval case | Trace checks | Grounding | Personalization | Feasibility | Actionability |",
    "|---|---|---|---|---|---|",
    ...reports.map((r) => `| ${r.caseId} | ${tally(r.checks)} | ${JUDGE_DIMENSIONS.map((d) => cell(r, d)).join(" | ")} |`),
  );
  if (Object.keys(gate.judgeMeans).length) {
    lines.push(`| **Mean** | | ${JUDGE_DIMENSIONS.map((d) => `**${gate.judgeMeans[d]?.toFixed(1) ?? "–"}**`).join(" | ")} |`);
  }
  lines.push("");

  if (gate.warnings.length) {
    lines.push(
      `<details><summary>${gate.warnings.length} warning(s)</summary>`,
      "",
      ...gate.warnings.map((w) => `- ${esc(w)}`),
      "",
      "</details>",
      "",
    );
  }
  lines.push("Full traces and generated plans: `eval-report` artifact (`latest.json`).");
  return lines.join("\n");
}

async function main(): Promise<number> {
  const cases = loadCases();
  const llmConfigured = isLLMConfigured();
  const judge = judgeTarget();
  const judgeLabel =
    judge.kind === "separate"
      ? `${judge.model} (${new URL(judge.baseURL).host})`
      : judge.kind === "site"
        ? llmConfigured
          ? `${judge.model} (site LLM)`
          : "skipped"
        : `error: ${judge.reason}`;
  console.log(
    `Running ${cases.length} case(s) · generator: ${llmConfigured ? llmModel() : "rules only (LLM not configured)"} · judge: ${judgeLabel}`,
  );

  const reports: CaseReport[] = [];
  for (const evalCase of cases) {
    const report = await runCase(evalCase);
    reports.push(report);
    printCase(report);
  }

  // Hallucination control: the judge must give a low grounding score to a plan full of invented facts.
  let control: JudgeResult | null = null;
  if (judge.kind === "separate" || (judge.kind === "site" && llmConfigured)) {
    control = await judgePlan(readCase(CONTROL_CASE_ID).context, hallucinatedPlan);
    const g = control.status === "scored" ? control.scores.grounding.score : null;
    console.log(
      `\n■ hallucination control — ` +
        (g === null ? `${control.status}: ${"reason" in control ? control.reason : ""}` : `grounding ${g} (must be ≤ ${config.judge.controlMaxGrounding}): ${g <= config.judge.controlMaxGrounding ? "judge OK" : "judge NOT trusted"}`),
    );
  }

  const sameModel = llmConfigured && judge.kind !== "error" && judge.model === llmModel();
  const gate = evaluateGate(reports, { llmConfigured, requireLLM, control: control ?? undefined, sameModel });

  mkdirSync(outDir, { recursive: true });
  const saved = reports.map((r) => ({
    caseId: r.caseId,
    source: r.run.source,
    model: r.run.model,
    checks: r.checks,
    judge: r.judge,
    calls: r.run.calls.map((c) => ({ ...c, output: undefined })),
    rawPlan: rawPlan(r.run),
    plan: r.run.plan,
  }));
  writeFileSync(join(outDir, "latest.json"), JSON.stringify({ createdAt: new Date().toISOString(), gate, control, cases: saved }, null, 2));
  writeFileSync(join(outDir, "latest.md"), markdown(reports, gate));

  console.log("");
  for (const w of gate.warnings) console.log(`⚠ ${w}`);
  if (gate.pass) {
    console.log(`\nRELEASE OK ✅  (report: evals/reports/latest.md)`);
    return 0;
  }
  console.log(`\nRELEASE BLOCKED ❌`);
  for (const r of gate.reasons) console.log(`  - ${r}`);
  return 1;
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    console.error(`\nEval could not run: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
    process.exit(2);
  },
);
