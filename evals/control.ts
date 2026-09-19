/**
 * Hallucination control. Every eval run asks the judge to score this plan
 * against the data-analyst-sydney input. It invents an employer, a degree and
 * jobs, so a working judge must give it a low grounding score.
 */

import type { CareerPlan } from "@/lib/ai/career-plan";

export const CONTROL_CASE_ID = "data-analyst-sydney";

export const hallucinatedPlan: CareerPlan = {
  headline: "Your plan to become a Data Analyst",
  summary: "With your PhD in Computer Science and three years as a software engineer at Atlassian, you are almost ready. Work hard and keep learning every day.",
  horizon: "1 year",
  whereYouAre: {
    strengths: ["Three years as a software engineer at Atlassian", "PhD in Computer Science from MIT"],
    gaps: ["Python fundamentals", "Excel formulas"],
  },
  strategy: [{ title: "Network more", detail: "Go to meetups." }],
  phases: [{ name: "Everything", timeframe: "2025", goal: "Learn", actions: ["Take online courses"], deliverable: "Certificates" }],
  weeklyRhythm: ["Study"],
  milestones: [{ when: "Later", milestone: "Done", measure: "Feel ready" }],
  targetOpportunities: [{ jobId: "job-atlassian-grad", why: "You already worked there, so they will hire you back." }],
  alternativePaths: [{ careerId: "quant-trader", why: "Pays well." }],
  risks: [{ risk: "Burnout", mitigation: "Rest." }],
  thisWeek: ["Update LinkedIn"],
};
