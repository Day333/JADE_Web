import "server-only";

/**
 * LLM integration point.
 *
 * Every AI feature in the app asks `askLLM` first. It is intentionally NOT
 * connected to a provider yet: it returns null, and each feature falls back
 * to its rule-based implementation in this folder (resume-parser.ts,
 * matching.ts, roadmap.ts). The product works end to end without a model.
 *
 * To connect a model later:
 *   1. Add LLM_API_KEY (and optionally LLM_MODEL) to .env and to Vercel.
 *   2. Implement the request below: build a prompt for `task` from `input`,
 *      ask the model for JSON matching the expected shape, validate it and
 *      return it. Return null on any failure so the fallback is used.
 */
export type LLMTask =
  | "parse_resume" // input: { text } -> ParsedResume
  | "recommend_careers" // input: { profile, careers } -> ranked careers with reasons
  | "hidden_potential" // input: { profile, candidates } -> careers with explanations
  | "roadmap" // input: { profile, career, gaps } -> PlannedStage[]
  | "job_match"; // input: { profile, job } -> JobMatch

export function isLLMConfigured() {
  return Boolean(process.env.LLM_API_KEY);
}

export async function askLLM<T>(task: LLMTask, input: unknown): Promise<T | null> {
  if (!isLLMConfigured()) return null;
  void task;
  void input;
  // TODO(LLM): call the LLM API here and return the parsed, validated result.
  return null;
}
