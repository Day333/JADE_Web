/**
 * A tiny OpenAI-compatible chat endpoint for the self-test: streams scripted
 * replies (SSE) and records every request so tests can inspect them.
 */

import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";

export interface MockReply {
  status?: number;
  content?: string;
  finish?: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export interface MockRequest {
  headers: IncomingHttpHeaders;
  body: Record<string, unknown>;
}

export async function startMockLLM() {
  const queue: MockReply[] = [];
  const requests: MockRequest[] = [];

  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      requests.push({ headers: req.headers, body });
      const reply = queue.shift() ?? { status: 500 };
      if (reply.status && reply.status !== 200) {
        res.writeHead(reply.status, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { message: "mock error", type: "server_error" } }));
        return;
      }
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
      const base = { id: "mock", object: "chat.completion.chunk", created: 0, model: String(body.model ?? "mock") };
      const send = (data: object) => res.write(`data: ${JSON.stringify({ ...base, ...data })}\n\n`);
      const content = reply.content ?? "";
      const half = Math.ceil(content.length / 2);
      for (const part of [content.slice(0, half), content.slice(half)]) {
        send({ choices: [{ index: 0, delta: { content: part }, finish_reason: null }] });
      }
      send({ choices: [{ index: 0, delta: {}, finish_reason: reply.finish ?? "stop" }] });
      const streamOptions = body.stream_options as { include_usage?: boolean } | undefined;
      if (streamOptions?.include_usage) {
        const usage = reply.usage ?? { prompt_tokens: 1200, completion_tokens: 800 };
        send({ choices: [], usage: { ...usage, total_tokens: usage.prompt_tokens + usage.completion_tokens } });
      }
      res.end("data: [DONE]\n\n");
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    baseURL: `http://127.0.0.1:${port}/v1`,
    queue,
    requests,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
