/**
 * Career preference questionnaire. Each question places the user on one of
 * seven dimensions (1-5). Careers carry a preference profile on the same
 * dimensions, which is used for matching.
 */

export type PreferenceDimension = "technical" | "team" | "research" | "coding" | "growth" | "startup" | "client";

export type PreferenceScores = Partial<Record<PreferenceDimension, number>>;

export interface PreferenceQuestion {
  id: string;
  dimension: PreferenceDimension;
  prompt: string;
  /** Statement for a score of 1 */
  left: string;
  /** Statement for a score of 5 */
  right: string;
}

export const PREFERENCE_QUESTIONS: PreferenceQuestion[] = [
  { id: "q1", dimension: "technical", prompt: "At work I would rather solve…", left: "Business and people problems", right: "Technical problems" },
  { id: "q2", dimension: "technical", prompt: "Which topic excites you more?", left: "Markets, customers and strategy", right: "How systems and algorithms work" },
  { id: "q3", dimension: "team", prompt: "I do my best work…", left: "On my own, with deep focus", right: "In a team, bouncing ideas around" },
  { id: "q4", dimension: "team", prompt: "On a group project I usually…", left: "Own a clear piece by myself", right: "Coordinate closely with everyone" },
  { id: "q5", dimension: "research", prompt: "I am more drawn to…", left: "Shipping practical products", right: "Exploring open questions" },
  { id: "q6", dimension: "research", prompt: "A great week is one where I…", left: "Launched something people use", right: "Discovered something new" },
  { id: "q7", dimension: "coding", prompt: "Most of my day, I would like to be…", left: "Talking, writing and presenting", right: "Writing code and building" },
  { id: "q8", dimension: "coding", prompt: "Which feels more rewarding?", left: "A meeting that aligned everyone", right: "Finally fixing a tricky bug" },
  { id: "q9", dimension: "growth", prompt: "In a career I value…", left: "Stability and predictability", right: "Fast growth, even with more risk" },
  { id: "q10", dimension: "growth", prompt: "Given the choice, I would take…", left: "A secure role with a clear path", right: "A stretch role with an uncertain outcome" },
  { id: "q11", dimension: "startup", prompt: "I would rather work at…", left: "A large, established company", right: "A small, fast-moving startup" },
  { id: "q12", dimension: "startup", prompt: "I prefer…", left: "Clear processes and structure", right: "Wearing many hats" },
  { id: "q13", dimension: "client", prompt: "I would enjoy working mostly with…", left: "My internal team", right: "Clients and external customers" },
  { id: "q14", dimension: "client", prompt: "Presenting to a client sounds…", left: "Stressful, I would avoid it", right: "Energising, I would enjoy it" },
];

/** Average the 1-5 answers per dimension. Unanswered dimensions are omitted. */
export function scorePreferences(answers: Record<string, number>): PreferenceScores {
  const sums = new Map<PreferenceDimension, { total: number; count: number }>();
  for (const q of PREFERENCE_QUESTIONS) {
    const value = answers[q.id];
    if (typeof value !== "number" || value < 1 || value > 5) continue;
    const entry = sums.get(q.dimension) ?? { total: 0, count: 0 };
    entry.total += value;
    entry.count += 1;
    sums.set(q.dimension, entry);
  }
  const scores: PreferenceScores = {};
  for (const [dimension, { total, count }] of sums) {
    scores[dimension] = Math.round((total / count) * 10) / 10;
  }
  return scores;
}

/** Rows shown on the Career Preference Profile (star ratings, 1-5). */
export function preferenceDisplayRows(scores: PreferenceScores) {
  const get = (d: PreferenceDimension) => scores[d] ?? 3;
  return [
    { label: "Technical Work", value: get("technical") },
    { label: "Hands-on Building", value: get("coding") },
    { label: "Research", value: get("research") },
    { label: "Team Collaboration", value: get("team") },
    { label: "Client Interaction", value: get("client") },
    { label: "Business Orientation", value: 6 - get("technical") },
    { label: "Appetite for Growth", value: get("growth") },
    { label: "Startup Environment", value: get("startup") },
  ];
}

export const INDUSTRY_OPTIONS = [
  "Technology",
  "Financial Services",
  "Consulting",
  "Healthcare",
  "Government",
  "Education",
  "Retail & E-commerce",
  "Media & Entertainment",
  "Energy & Resources",
  "Telecommunications",
  "Non-profit",
];

export const WORK_TYPE_OPTIONS = [
  { value: "internship", label: "Internship" },
  { value: "graduate", label: "Graduate Program" },
  { value: "part_time", label: "Part-time" },
  { value: "full_time", label: "Full-time" },
];

export const COMPANY_TYPE_OPTIONS = [
  "Large company",
  "Startup",
  "Scale-up",
  "Consulting firm",
  "Government",
  "Research / University",
  "Non-profit",
];

export const LOCATION_OPTIONS = ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Canberra", "Hobart", "Remote"];
