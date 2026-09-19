/**
 * LLM-as-judge: scores each plan from 1 to 5 on four dimensions.
 *
 * Default: goes through the site's own askLLM(), i.e. the same variables as the
 * four product features (DASHSCOPE_API_KEY, LLM_BASE_URL, LLM_MODEL).
 *
 * Separate judge (recommended, avoids a model grading itself): set
 *   EVAL_JUDGE_API_KEY   e.g. an OpenAI key
 *   EVAL_JUDGE_MODEL     a chat model on that account
 *   EVAL_JUDGE_BASE_URL  optional, defaults to https://api.openai.com/v1
 * The site's own LLM code is not touched by this path.
 */

import OpenAI from "openai";
import { z } from "zod";
import type { CareerPlan, PlanContext } from "@/lib/ai/career-plan";
import { askLLM, collectLLMCalls, isLLMConfigured, llmModel } from "@/lib/ai/llm";

export const JUDGE_DIMENSIONS = ["grounding", "personalization", "feasibility", "actionability"] as const;
export type JudgeDimension = (typeof JUDGE_DIMENSIONS)[number];

const Dimension = z.object({
  score: z.number().int().min(1).max(5).describe("integer from 1 to 5"),
  reason: z.string().describe("one sentence"),
});
export const JudgeSchema = z.object({
  hallucinations: z
    .array(z.string())
    .describe("each claim presented as fact that plannerInput does not support, briefly quoted; empty if none"),
  grounding: Dimension,
  personalization: Dimension,
  feasibility: Dimension,
  actionability: Dimension,
});
export type JudgeScores = z.infer<typeof JudgeSchema>;

export type JudgeResult =
  | { status: "scored"; model: string; scores: JudgeScores; inputTokens: number; outputTokens: number }
  | { status: "skipped"; reason: string }
  | { status: "error"; reason: string };

type Env = Record<string, string | undefined>;

export type JudgeTarget =
  | { kind: "site"; model: string }
  | { kind: "separate"; model: string; baseURL: string; apiKey: string; temperature?: number }
  | { kind: "error"; reason: string };

export function judgeTarget(env: Env = process.env): JudgeTarget {
  const apiKey = env.EVAL_JUDGE_API_KEY?.trim();
  const model = env.EVAL_JUDGE_MODEL?.trim();
  if (!apiKey && !model) return { kind: "site", model: llmModel() };
  if (!apiKey || !model) return { kind: "error", reason: "set both EVAL_JUDGE_API_KEY and EVAL_JUDGE_MODEL (or neither)" };
  const t = env.EVAL_JUDGE_TEMPERATURE?.trim();
  const temperature = t ? Number(t) : undefined;
  if (temperature !== undefined && Number.isNaN(temperature)) {
    return { kind: "error", reason: `EVAL_JUDGE_TEMPERATURE must be a number, got "${t}"` };
  }
  const baseURL = env.EVAL_JUDGE_BASE_URL?.trim() || "https://api.openai.com/v1";
  return { kind: "separate", model, baseURL, apiKey, temperature };
}

const JUDGE_SYSTEM = `You are a strict evaluator of AI-generated career plans for university students and graduates, many of them international students.
input.plannerInput is exactly what the planner received (profile, skill gap, roadmap, job opportunities, alternative careers); input.plan is the plan it wrote.
First, list hallucinations: statements the plan presents as fact about this person, their history, the job opportunities or the alternative careers that plannerInput does not contain or contradicts (an employer, degree, project, skill level, salary, deadline or job that was never given). Advice on what to learn or which tools and resources to use is not a hallucination.

Then score each dimension with an integer from 1 to 5:

grounding: Is every point backed by plannerInput (their real experiences, projects, skill gap, roadmap and the given job opportunities)? Penalise invented facts, employers, courses or jobs.
  5 = everything traceable to the input; 3 = mostly grounded with some generic filler; 1-2 = any clear hallucination.
personalization: Is it written for this person (builds on their strengths, targets their specific gaps, fits their preferences and graduation timing)?
  5 = clearly tailored; 3 = partly; 1 = could be for anyone.
feasibility: Is the workload and timing realistic for this person and the roadmap months, with sensible sequencing?
  5 = realistic and well sequenced; 3 = tight or uneven; 1 = unrealistic or incoherent.
actionability: Are the actions concrete, with clear deliverables and measurable milestones?
  5 = concrete and measurable; 3 = some vague items; 1 = vague platitudes.

Be critical; reserve 5 for plans you would confidently give a real student. Give a one-sentence reason for each score.`;

const JSON_SHAPE = `Reply with one JSON object only, in exactly this shape:
{"hallucinations":["..."],"grounding":{"score":<1-5>,"reason":"..."},"personalization":{"score":<1-5>,"reason":"..."},"feasibility":{"score":<1-5>,"reason":"..."},"actionability":{"score":<1-5>,"reason":"..."}}`;

function parseScores(text: string): JudgeScores {
  const body = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in reply");
  return JudgeSchema.parse(JSON.parse(body.slice(start, end + 1)));
}

/** Judge through the site's own askLLM (same key and model as the product). */
async function judgeWithSite(input: object): Promise<JudgeResult> {
  if (!isLLMConfigured()) {
    return { status: "skipped", reason: "LLM not configured (DASHSCOPE_API_KEY / LLM_BASE_URL unset) and no EVAL_JUDGE_* set" };
  }
  const { result, calls } = await collectLLMCalls(() =>
    askLLM({ task: "eval_judge", system: JUDGE_SYSTEM, input, schema: JudgeSchema, effort: "low", maxTokens: 2000, timeoutMs: 120_000 }),
  );
  const call = calls[0];
  if (!result) return { status: "error", reason: `judge call failed (${call?.fallbackReason ?? "unknown"})` };
  return { status: "scored", model: call?.model ?? llmModel(), scores: result, inputTokens: call?.inputTokens ?? 0, outputTokens: call?.outputTokens ?? 0 };
}

/** Judge with a separate OpenAI-compatible endpoint, e.g. OpenAI itself. */
async function judgeSeparately(t: Extract<JudgeTarget, { kind: "separate" }>, input: object): Promise<JudgeResult> {
  const client = new OpenAI({ apiKey: t.apiKey, baseURL: t.baseURL, timeout: 120_000, maxRetries: 1 });
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: `${JUDGE_SYSTEM}\n\n${JSON_SHAPE}` },
    { role: "user", content: `Input (JSON):\n${JSON.stringify(input)}` },
  ];
  let jsonMode = true;
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    let content = "";
    let inputTokens = 0;
    let outputTokens = 0;
    try {
      const stream = await client.chat.completions.create({
        model: t.model,
        messages,
        stream: true,
        stream_options: { include_usage: true },
        ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
        ...(t.temperature !== undefined ? { temperature: t.temperature } : {}),
      });
      for await (const chunk of stream) {
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens;
          outputTokens = chunk.usage.completion_tokens;
        }
        content += chunk.choices?.[0]?.delta?.content ?? "";
      }
    } catch (err) {
      // Some endpoints don't support response_format; retry once without it.
      if (err instanceof OpenAI.APIError && err.status === 400 && jsonMode) {
        jsonMode = false;
        continue;
      }
      return { status: "error", reason: err instanceof Error ? err.message : String(err) };
    }
    try {
      return { status: "scored", model: t.model, scores: parseScores(content), inputTokens, outputTokens };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      messages.push(
        { role: "assistant", content },
        { role: "user", content: `That did not match the required JSON. ${JSON_SHAPE}` },
      );
    }
  }
  return { status: "error", reason: `judge gave unusable output: ${lastError}` };
}

export async function judgePlan(ctx: PlanContext, plan: CareerPlan, env: Env = process.env): Promise<JudgeResult> {
  const target = judgeTarget(env);
  const input = { plannerInput: ctx, plan };
  if (target.kind === "error") return { status: "error", reason: target.reason };
  return target.kind === "site" ? judgeWithSite(input) : judgeSeparately(target, input);
}
