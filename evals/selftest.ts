/**
 * Self-test for the eval harness (no network, no API keys): a local mock
 * endpoint stands in for the LLM, so the real askLLM / generateCareerPlan code
 * runs end to end.
 *
 *   npm run eval:selftest
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { generateCareerPlan } from "@/lib/ai";
import { collectLLMCalls, isLLMConfigured, providerParams } from "@/lib/ai/llm";
import { mentionsAnchor, runChecks, type CheckResult, type EvalCase, type EvalRun } from "./checks";
import { hallucinatedPlan as badPlan } from "./control";
import { evaluateGate, type CaseOutcome } from "./gate";
import { judgePlan, type JudgeResult, type JudgeScores } from "./judge";
import { startMockLLM } from "./selftest/mock-llm";
import { goodPlan } from "./selftest/plans";

const evalCase = JSON.parse(
  readFileSync(join(process.cwd(), "evals", "cases", "data-analyst-sydney.json"), "utf8"),
) as EvalCase;
const ctx = evalCase.context;

const scoresOf = (s: number, grounding = s, hallucinations: string[] = []): JudgeScores => ({
  hallucinations,
  grounding: { score: grounding, reason: "r" },
  personalization: { score: s, reason: "r" },
  feasibility: { score: s, reason: "r" },
  actionability: { score: s, reason: "r" },
});
const judgeJson = (s: number) => JSON.stringify(scoresOf(s));

let passed = 0;
let failed = 0;
async function test(name: string, fn: () => unknown) {
  try {
    await fn();
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✘ ${name}\n    ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function tracedRun(): Promise<EvalRun> {
  const { result, calls } = await collectLLMCalls(() => generateCareerPlan(ctx));
  return { evalCase, llmConfigured: isLLMConfigured(), source: result.source, model: result.model, plan: result.plan, calls };
}

const status = (checks: CheckResult[], name: string) => checks.find((c) => c.name === name)?.status;

async function main() {
  const mock = await startMockLLM();
  // Point the site's LLM client at the mock before its first call.
  process.env.LLM_BASE_URL = mock.baseURL;
  process.env.DASHSCOPE_API_KEY = "test-key";
  delete process.env.LLM_MODEL;

  console.log("Tracing in askLLM");

  await test("records attempts, the retry, token usage and the raw output", async () => {
    mock.queue.push({ content: "not json" }, { content: JSON.stringify(goodPlan), usage: { prompt_tokens: 3000, completion_tokens: 900 } });
    const run = await tracedRun();
    assert.equal(run.source, "ai");
    assert.equal(run.calls.length, 1);
    const call = run.calls[0];
    assert.deepEqual(call.attempts.map((a) => a.outcome), ["invalid_json", "ok"]);
    assert.equal(call.outputTokens, 900 + 800, "usage summed across both attempts");
    assert.deepEqual(call.output, goodPlan);
    assert.equal((mock.requests.at(-1)?.body.stream_options as { include_usage?: boolean })?.include_usage, true);
    assert.equal(status(runChecks(run), "attempts"), "warn");
  });

  await test("production calls are unchanged: no usage request, nothing recorded", async () => {
    mock.queue.push({ content: JSON.stringify(goodPlan) });
    const result = await generateCareerPlan(ctx);
    assert.equal(result.source, "ai");
    const body = mock.requests.at(-1)?.body;
    assert.equal(body?.stream_options, undefined);
    assert.equal(body?.max_tokens, 16000, "DashScope request keeps max_tokens");
    assert.equal(body?.enable_thinking, false, "DashScope request keeps enable_thinking");
    assert.equal(body?.max_completion_tokens, undefined);
  });

  await test("OpenAI base URL gets OpenAI-compatible fields; any other URL is treated as DashScope", () => {
    assert.deepEqual(providerParams("https://api.openai.com/v1", 100, true), { max_completion_tokens: 100 });
    assert.deepEqual(providerParams("https://ws.cn-beijing.maas.aliyuncs.com/compatible-mode/v1", 100, false), {
      max_tokens: 100,
      enable_thinking: false,
    });
    assert.deepEqual(providerParams("https://my-proxy.example.com/v1", 100, true), { max_tokens: 100, enable_thinking: true });
    assert.deepEqual(providerParams(undefined, 100, true), { max_tokens: 100, enable_thinking: true });
  });

  await test("an API error falls back to rules and fails llm_used", async () => {
    mock.queue.push({ status: 500 });
    const run = await tracedRun();
    assert.equal(run.source, "rules");
    assert.equal(run.calls[0].result, "fallback");
    assert.equal(run.calls[0].fallbackReason, "api_error");
    const checks = runChecks(run);
    assert.equal(status(checks, "llm_used"), "fail");
    assert.equal(status(checks, "attempts"), "fail");
  });

  console.log("Rule-based checks");

  await test("a grounded plan passes every check", async () => {
    mock.queue.push({ content: JSON.stringify(goodPlan) });
    const failing = runChecks(await tracedRun()).filter((c) => c.status === "fail");
    assert.deepEqual(failing, []);
  });

  await test("a generic, invented plan fails the grounding checks", async () => {
    mock.queue.push({ content: JSON.stringify(badPlan) });
    const run = await tracedRun();
    assert.equal(run.plan.targetOpportunities.length, 0, "sanitizePlan removed the invented job");
    const checks = runChecks(run);
    for (const name of [
      "job_ids_valid",
      "career_ids_valid",
      "uses_opportunities",
      "gap_coverage",
      "ready_not_gap",
      "mentions_profile",
      "phases_follow_roadmap",
    ]) {
      assert.equal(status(checks, name), "fail", name);
    }
  });

  await test("mentions_profile accepts paraphrases, not unrelated text", () => {
    assert.ok(mentionsAnchor("Refactor your timetable ETL into a scheduled pipeline", "University timetable ETL pipeline"));
    assert.ok(mentionsAnchor("Practical work experience (Retail Assistant) showing reliability", "Retail Assistant (part-time)"));
    assert.ok(!mentionsAnchor("Learn SQL and Spark", "Riverside Grocers"));
    assert.ok(!mentionsAnchor("Shop at Riverside markets", "Riverside Grocers"));
  });

  await test("without an LLM, trajectory checks are skipped and the rules plan is still checked", async () => {
    const saved = process.env.DASHSCOPE_API_KEY;
    delete process.env.DASHSCOPE_API_KEY;
    try {
      const run = await tracedRun();
      assert.equal(run.source, "rules");
      const checks = runChecks(run);
      assert.equal(status(checks, "llm_used"), "skip");
      assert.equal(status(checks, "job_ids_valid"), "pass");
    } finally {
      process.env.DASHSCOPE_API_KEY = saved;
    }
  });

  console.log("LLM judge");

  await test("scores through the site's own askLLM, key and model", async () => {
    mock.queue.push({ content: "```json\n" + judgeJson(4) + "\n```", usage: { prompt_tokens: 2500, completion_tokens: 200 } });
    const r = await judgePlan(ctx, goodPlan);
    assert.equal(r.status, "scored", JSON.stringify(r));
    assert.equal(r.status === "scored" && r.scores.feasibility.score, 4);
    assert.equal(r.status === "scored" && r.outputTokens, 200);
    const req = mock.requests.at(-1);
    assert.equal(req?.body.model, "kimi-k3");
    assert.equal(req?.headers.authorization, "Bearer test-key");
  });

  await test("separate judge (e.g. OpenAI): own key, model and endpoint; no DashScope-only params", async () => {
    mock.queue.push({ content: judgeJson(5), usage: { prompt_tokens: 2400, completion_tokens: 150 } });
    const env = { EVAL_JUDGE_API_KEY: "openai-test-key", EVAL_JUDGE_MODEL: "gpt-judge", EVAL_JUDGE_BASE_URL: mock.baseURL };
    const r = await judgePlan(ctx, goodPlan, env);
    assert.equal(r.status, "scored", JSON.stringify(r));
    assert.equal(r.status === "scored" && r.model, "gpt-judge");
    const req = mock.requests.at(-1);
    assert.equal(req?.headers.authorization, "Bearer openai-test-key");
    assert.equal(req?.body.enable_thinking, undefined);
    assert.equal(req?.body.temperature, undefined, "omitted unless EVAL_JUDGE_TEMPERATURE is set");
    assert.equal(judgePlan.length >= 2, true);
    assert.equal((await judgePlan(ctx, goodPlan, { EVAL_JUDGE_MODEL: "only-model" })).status, "error");
  });

  await test("out-of-range or broken replies are retried, then reported as an error", async () => {
    mock.queue.push({ content: "nope" }, { content: judgeJson(7) }, { content: "still nope" });
    const r = await judgePlan(ctx, goodPlan);
    assert.equal(r.status, "error");
  });

  await test("skipped when the LLM isn't configured", async () => {
    const saved = process.env.DASHSCOPE_API_KEY;
    delete process.env.DASHSCOPE_API_KEY;
    try {
      assert.equal((await judgePlan(ctx, goodPlan)).status, "skipped");
    } finally {
      process.env.DASHSCOPE_API_KEY = saved;
    }
  });

  console.log("Release gate");

  const goodChecks = runChecks({ evalCase, llmConfigured: true, source: "ai", model: "m", plan: goodPlan, calls: [] }).filter(
    (c) => c.group === "grounding",
  );
  const scored = (s: number): JudgeResult => ({ status: "scored", model: "j", scores: scoresOf(s), inputTokens: 0, outputTokens: 0 });
  const outcome = (judge: JudgeResult, caseId = "c"): CaseOutcome => ({ caseId, checks: goodChecks, judge });
  const opts = { llmConfigured: true, requireLLM: true };

  await test("passes with clean checks and good scores", () => {
    assert.equal(evaluateGate([outcome(scored(4)), outcome(scored(5))], opts).pass, true);
  });
  const judged = (s: number, grounding: number, hallucinations: string[] = []): JudgeResult => ({
    status: "scored",
    model: "j",
    scores: scoresOf(s, grounding, hallucinations),
    inputTokens: 0,
    outputTokens: 0,
  });
  await test("low personalization/feasibility/actionability only warn", () => {
    const g = evaluateGate([outcome(judged(2, 5))], opts);
    assert.equal(g.pass, true);
    assert.ok(g.warnings.some((w) => w.includes("feasibility 2")));
  });
  await test("grounding below 3 (hallucination) blocks", () => {
    assert.equal(evaluateGate([outcome(scored(5)), outcome(judged(5, 2, ["invented employer"]), "weak")], opts).pass, false);
  });
  await test("hallucinations listed with acceptable grounding only warn", () => {
    const g = evaluateGate([outcome(judged(5, 4, ["minor unsupported claim"]))], opts);
    assert.equal(g.pass, true);
    assert.ok(g.warnings.some((w) => w.includes("minor unsupported claim")));
  });
  await test("the judge must fail the hallucinated control plan", () => {
    assert.equal(evaluateGate([outcome(scored(5))], { ...opts, control: judged(1, 1, ["Atlassian"]) }).pass, true);
    assert.equal(evaluateGate([outcome(scored(5))], { ...opts, control: judged(4, 4) }).pass, false);
  });
  await test("missing LLM: warning locally, blocks in CI; a judge error blocks", () => {
    const skipped: JudgeResult = { status: "skipped", reason: "LLM not configured" };
    assert.equal(evaluateGate([outcome(skipped)], { llmConfigured: false, requireLLM: false }).pass, true);
    assert.equal(evaluateGate([outcome(skipped)], { llmConfigured: false, requireLLM: true }).pass, false);
    assert.equal(evaluateGate([outcome({ status: "error", reason: "timeout" })], opts).pass, false);
  });
  await test("invented job/career ids block; other rule failures only warn", () => {
    const bad = runChecks({ evalCase, llmConfigured: true, source: "ai", model: "m", plan: badPlan, calls: [] });
    const g = evaluateGate([{ caseId: "bad", checks: bad, judge: scored(5) }], opts);
    assert.equal(g.pass, false);
    assert.ok(g.reasons.every((r) => r.includes("job_ids_valid") || r.includes("career_ids_valid")));
    const onlyStyle = bad.filter((c) => !["job_ids_valid", "career_ids_valid"].includes(c.name));
    assert.equal(evaluateGate([{ caseId: "style", checks: onlyStyle, judge: scored(5) }], opts).pass, true);
  });

  await mock.close();
  console.log(failed ? `\nSELFTEST FAILED (${failed} failed, ${passed} passed)` : `\nSelftest passed (${passed} tests)`);
  return failed ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    console.error(err);
    process.exit(2);
  },
);
