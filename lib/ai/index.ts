import "server-only";

/**
 * AI features used by pages and server actions. Each one asks the LLM first
 * (see llm.ts, not connected yet) and falls back to the rule-based engine.
 */
import { askLLM } from "@/lib/ai/llm";
import {
  discoverHiddenPotential,
  rankCareers,
  type CareerMatch,
  type HiddenPotential,
} from "@/lib/ai/matching";
import { parseResumeText, type ParsedResume } from "@/lib/ai/resume-parser";
import { planRoadmap, type PlannedStage } from "@/lib/ai/roadmap";
import type { CareerProfileData, Catalog } from "@/lib/types";

export async function parseResume(text: string, catalog: Catalog): Promise<ParsedResume> {
  const fromLLM = await askLLM<ParsedResume>("parse_resume", { text });
  return fromLLM ?? parseResumeText(text, catalog.skills);
}

export async function recommendCareers(data: CareerProfileData, catalog: Catalog): Promise<CareerMatch[]> {
  // An LLM could re-rank or explain these; the scores stay rule-based.
  return rankCareers(data, catalog);
}

export async function findHiddenPotential(
  data: CareerProfileData,
  catalog: Catalog,
  ranked?: CareerMatch[],
): Promise<HiddenPotential[]> {
  const rules = discoverHiddenPotential(data, catalog, ranked);
  const fromLLM = await askLLM<HiddenPotential[]>("hidden_potential", {
    profile: data,
    candidates: rules.map((r) => r.match.career.id),
  });
  return fromLLM ?? rules;
}

export async function generateRoadmapPlan(
  data: CareerProfileData,
  catalog: Catalog,
  careerId: string,
): Promise<PlannedStage[]> {
  const fromLLM = await askLLM<PlannedStage[]>("roadmap", { profile: data, careerId });
  return fromLLM ?? planRoadmap(data, catalog, careerId);
}

export type { CareerMatch, HiddenPotential, ParsedResume, PlannedStage };
