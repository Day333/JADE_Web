/**
 * Release gate. Only hallucination blocks a release:
 *   - a blocking rule check fails (the model invented a job or career id),
 *   - the judge scores any case below config.judge.minGrounding,
 *   - the judge can't be trusted: it errors, or it scores the hallucinated
 *     control plan above config.judge.controlMaxGrounding,
 *   - in CI, the LLM isn't configured (nothing real was checked).
 * Everything else (other rule checks, low personalization/feasibility/actionability,
 * hallucinations the judge lists without failing grounding) is reported as a warning.
 */

import type { CheckResult } from "./checks";
import { config } from "./config";
import { JUDGE_DIMENSIONS, type JudgeDimension, type JudgeResult } from "./judge";

export interface CaseOutcome {
  caseId: string;
  checks: CheckResult[];
  judge: JudgeResult;
}

export interface GateResult {
  pass: boolean;
  reasons: string[];
  warnings: string[];
  judgeMeans: Partial<Record<JudgeDimension, number>>;
}

export function evaluateGate(
  cases: CaseOutcome[],
  opts: { llmConfigured: boolean; requireLLM: boolean; control?: JudgeResult; sameModel?: boolean },
): GateResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const { minGrounding, warnBelow, controlMaxGrounding } = config.judge;

  if (!opts.llmConfigured) {
    const msg = "LLM not configured, so only the rule-based fallback was evaluated";
    if (opts.requireLLM) reasons.push(`${msg} (required in CI)`);
    else warnings.push(msg);
  }
  if (opts.sameModel) warnings.push("the judge is the same model as the generator; scores may be generous");

  for (const c of cases) {
    for (const ch of c.checks) {
      const line = `[${c.caseId}] ${ch.name}: ${ch.detail}`;
      if (ch.status === "fail" && config.gate.blockingChecks.includes(ch.name)) reasons.push(line);
      else if (ch.status === "fail" || ch.status === "warn") warnings.push(line);
    }

    const j = c.judge;
    if (j.status === "error") reasons.push(`[${c.caseId}] judge error, hallucination not verified: ${j.reason}`);
    if (j.status === "skipped") warnings.push(`[${c.caseId}] judge skipped: ${j.reason}`);
    if (j.status !== "scored") continue;

    const listed = j.scores.hallucinations.length ? ` Hallucinations: ${j.scores.hallucinations.join(" | ")}` : "";
    if (j.scores.grounding.score < minGrounding) {
      reasons.push(`[${c.caseId}] judge grounding ${j.scores.grounding.score} < ${minGrounding}: ${j.scores.grounding.reason}${listed}`);
    } else if (listed) {
      warnings.push(`[${c.caseId}] judge noted possible hallucinations (grounding ${j.scores.grounding.score}):${listed}`);
    }
    for (const dim of JUDGE_DIMENSIONS.filter((d) => d !== "grounding")) {
      if (j.scores[dim].score < warnBelow) warnings.push(`[${c.caseId}] judge ${dim} ${j.scores[dim].score}: ${j.scores[dim].reason}`);
    }
  }

  if (opts.control?.status === "scored") {
    const g = opts.control.scores.grounding.score;
    if (g > controlMaxGrounding) {
      reasons.push(`judge gave grounding ${g} to the hallucinated control plan (max ${controlMaxGrounding}), so it can't be trusted to spot hallucinations`);
    }
  } else if (opts.control?.status === "error") {
    reasons.push(`judge failed on the hallucination control: ${opts.control.reason}`);
  }

  const judgeMeans: GateResult["judgeMeans"] = {};
  const scored = cases.flatMap((c) => (c.judge.status === "scored" ? [c.judge.scores] : []));
  if (scored.length > 0) {
    for (const dim of JUDGE_DIMENSIONS) judgeMeans[dim] = scored.reduce((sum, s) => sum + s[dim].score, 0) / scored.length;
  }

  return { pass: reasons.length === 0, reasons, warnings, judgeMeans };
}
