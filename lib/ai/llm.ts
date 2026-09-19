import "server-only";

import OpenAI from "openai";
import { z } from "zod";

/**
 * LLM integration point — every AI feature calls the model through `askLLM`.
 *
 * Uses an OpenAI-compatible Chat Completions endpoint (Alibaba Cloud Model
 * Studio / DashScope by default). Configure in .env locally and in
 * Vercel → Settings → Environment Variables (server-only, no NEXT_PUBLIC_ prefix):
 *   DASHSCOPE_API_KEY   API key (LLM_API_KEY also works). While it is unset, askLLM
 *                       returns null and every feature uses its rule-based engine.
 *   LLM_BASE_URL        e.g. https://<workspace>.cn-beijing.maas.aliyuncs.com/compatible-mode/v1
 *   LLM_MODEL           optional, defaults to kimi-k3.
 *
 * askLLM never throws: missing config, network/API errors, truncated or invalid
 * output all return null so the caller can fall back to the rule-based result.
 */
export type LLMTask = "parse_resume" | "hidden_potential" | "roadmap" | "career_plan";

export interface AskLLMOptions<Schema extends z.ZodType> {
  task: LLMTask;
  /** Stable instructions for this task. */
  system: string;
  /** Per-request data, serialised as JSON for the model. */
  input: unknown;
  /** Output contract; the response is validated against it. */
  schema: Schema;
  /** "low" turns thinking off for speed; "medium"/"high" let the model think first. */
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
  /** Per-call time limit; keep it below the route's maxDuration. */
  timeoutMs?: number;
}

const DEFAULT_MODEL = "kimi-k3";

type Message = OpenAI.Chat.ChatCompletionMessageParam;
type ResponseFormat = OpenAI.Chat.ChatCompletionCreateParams["response_format"];

let client: OpenAI | null = null;
function getClient() {
  client ??= new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY || process.env.LLM_API_KEY,
    baseURL: process.env.LLM_BASE_URL,
    // Server actions and pages wait on this call; fail over to the rules engine in time.
    timeout: 110_000,
    maxRetries: 1,
  });
  return client;
}

export function isLLMConfigured() {
  return Boolean((process.env.DASHSCOPE_API_KEY || process.env.LLM_API_KEY) && process.env.LLM_BASE_URL);
}

export function llmModel() {
  return process.env.LLM_MODEL || DEFAULT_MODEL;
}

/** Stream a completion and return the final answer text (reasoning is discarded). */
async function complete(messages: Message[], responseFormat: ResponseFormat, thinking: boolean, maxTokens: number, timeoutMs: number) {
  const params: OpenAI.Chat.ChatCompletionCreateParamsStreaming & { enable_thinking: boolean } = {
    model: llmModel(),
    messages,
    stream: true,
    max_tokens: maxTokens,
    response_format: responseFormat,
    // DashScope extension: thinking improves plans and roadmaps; skip it for extraction.
    enable_thinking: thinking,
  };
  // The SDK timeout only covers the wait for the first byte; this deadline also
  // covers the whole stream so a slow reply can't outlive the route's maxDuration.
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), timeoutMs);
  try {
    // No automatic retry: a slow model would otherwise double the wait.
    const stream = await getClient().chat.completions.create(params, {
      timeout: timeoutMs,
      maxRetries: 0,
      signal: deadline.signal,
    });
    let content = "";
    let finish: string | null = null;
    for await (const chunk of stream) {
      const choice = chunk.choices?.[0];
      if (!choice) continue;
      if (choice.delta?.content) content += choice.delta.content;
      if (choice.finish_reason) finish = choice.finish_reason;
    }
    // An abort mid-stream can end the iteration quietly with partial content.
    if (deadline.signal.aborted) throw new OpenAI.APIUserAbortError();
    return { content, finish };
  } finally {
    clearTimeout(timer);
  }
}

/** Pull a JSON object out of the reply, tolerating code fences or stray text. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? text;
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in reply");
  return JSON.parse(fenced.slice(start, end + 1));
}

function describeIssues(error: z.ZodError) {
  return error.issues
    .slice(0, 8)
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

/** Remove .catch()/.default() artifacts: they are for our validation, not the model. */
function stripDefaults(node: unknown) {
  if (Array.isArray(node)) node.forEach(stripDefaults);
  else if (node && typeof node === "object") {
    delete (node as Record<string, unknown>).default;
    Object.values(node).forEach(stripDefaults);
  }
}

export async function askLLM<Schema extends z.ZodType>({
  task,
  system,
  input,
  schema,
  effort = "medium",
  maxTokens = 16000,
  timeoutMs = 100_000,
}: AskLLMOptions<Schema>): Promise<z.infer<Schema> | null> {
  if (!isLLMConfigured()) return null;

  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  stripDefaults(jsonSchema);
  let responseFormat: ResponseFormat = {
    type: "json_schema",
    json_schema: { name: task, strict: true, schema: jsonSchema },
  };
  const messages: Message[] = [
    { role: "system", content: system },
    { role: "user", content: `Task: ${task}\n\nInput (JSON):\n${JSON.stringify(input)}\n\nReply with a single JSON object.` },
  ];
  const thinking = effort !== "low";

  // The endpoint's schema-constrained decoding sometimes garbles a key (e.g. ":strengths")
  // or drops fields, and repeats the exact same fault on a retry. Retries therefore run
  // unconstrained, with the JSON Schema spelled out in the system prompt instead.
  const fallBackToJsonObject = () => {
    responseFormat = { type: "json_object" };
    messages[0] = { role: "system", content: `${system}\n\nThe reply must be a JSON object matching this JSON Schema:\n${JSON.stringify(jsonSchema)}` };
  };

  // Up to 3 attempts: schema-constrained, a plain-JSON fallback if the endpoint
  // rejects the schema, and one repair round if the output doesn't validate.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const started = Date.now();
      if (process.env.LLM_DEBUG) console.log(`[llm] ${task}: attempt ${attempt + 1} (${responseFormat?.type})`);
      const { content, finish } = await complete(messages, responseFormat, thinking, maxTokens, timeoutMs);
      // A repair round would not fit in the remaining time budget.
      if (Date.now() - started > timeoutMs * 0.6) attempt = 2;
      if (finish === "length") {
        console.warn(`[llm] ${task}: reply hit the token limit, using rules instead`);
        return null;
      }
      let value: unknown;
      try {
        value = extractJson(content);
      } catch {
        console.warn(`[llm] ${task}: attempt ${attempt + 1} returned invalid JSON (${content.length} chars, finish=${finish})`);
        messages.push({ role: "assistant", content }, { role: "user", content: "That was not valid JSON. Reply with the JSON object only." });
        if (responseFormat?.type === "json_schema") fallBackToJsonObject();
        continue;
      }
      const parsed = schema.safeParse(value);
      if (parsed.success) return parsed.data;
      console.warn(`[llm] ${task}: attempt ${attempt + 1} did not match the schema: ${describeIssues(parsed.error)}`);
      messages.push(
        { role: "assistant", content },
        { role: "user", content: `The JSON does not match the required schema (${describeIssues(parsed.error)}). Reply with the corrected JSON object only.` },
      );
      if (responseFormat?.type === "json_schema") fallBackToJsonObject();
    } catch (error) {
      if (error instanceof OpenAI.APIError && error.status === 400 && responseFormat?.type === "json_schema") {
        // Some models or schemas aren't supported in strict mode: describe the schema in the prompt instead.
        fallBackToJsonObject();
        continue;
      }
      if (error instanceof OpenAI.APIUserAbortError) {
        console.warn(`[llm] ${task}: no reply within ${Math.round(timeoutMs / 1000)} s; using rules instead`);
      } else if (error instanceof OpenAI.AuthenticationError) {
        console.error("[llm] the API key was rejected; using rules instead");
      } else if (error instanceof OpenAI.RateLimitError) {
        console.warn(`[llm] ${task}: rate limited; using rules instead`);
      } else if (error instanceof OpenAI.APIError) {
        console.warn(`[llm] ${task}: API error ${error.status}; using rules instead`);
      } else {
        console.warn(`[llm] ${task}: ${error instanceof Error ? error.message : "request failed"}; using rules instead`);
      }
      return null;
    }
  }
  console.warn(`[llm] ${task}: no valid output after retries, using rules instead`);
  return null;
}
