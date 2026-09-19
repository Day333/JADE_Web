/** Hand-written model outputs for the data-analyst-sydney case, used by the self-test. */

import type { CareerPlan } from "@/lib/ai/career-plan";

/** Grounded in the case's input: should pass every rule-based check. */
export const goodPlan: CareerPlan = {
  headline: "Your 6-month plan to become a Data Analyst",
  summary:
    "You are 58% ready. Your Python work on the Sydney bus delay analysis is a strong base; the plan closes your SQL, Data Visualization and Statistics gaps, then moves you into applications from March 2027.",
  horizon: "6 months · Oct 2026 – Mar 2027",
  whereYouAre: {
    strengths: [
      "Python, used in your Sydney bus delay analysis",
      "Excel at a working level",
      "Explaining ideas clearly from your time at Bright Minds Tutoring",
    ],
    gaps: ["SQL: Basic today, Proficient needed", "Data Visualization (core, not shown yet)", "Statistics for testing changes"],
  },
  strategy: [
    { title: "Close SQL and Data Visualization first", detail: "Both appear in the Northwind Analytics internship; learn them in roadmap order." },
    { title: "Prove it with one dashboard project", detail: "Extend the Sydney bus delay analysis into a public dashboard with a statistics section." },
    { title: "Apply early", detail: "Target the Data Analyst Intern role and graduate programs from March 2027." },
  ],
  phases: [
    {
      name: "Foundation",
      timeframe: "Oct – Nov 2026",
      goal: "Reach Proficient SQL and build your first dashboards.",
      actions: ["Complete 30 SQL practice queries", "Build one Tableau dashboard", "Write short notes on each query pattern"],
      deliverable: "SQL exercises and one dashboard on GitHub",
    },
    {
      name: "Build & prove",
      timeframe: "Dec 2026 – Jan 2027",
      goal: "Add Statistics and ship the project.",
      actions: ["Revise hypothesis testing", "Add a before/after test to the bus delay analysis", "Publish the dashboard"],
      deliverable: "A portfolio-ready analytics project",
    },
    {
      name: "Launch",
      timeframe: "Feb – Mar 2027",
      goal: "Get interviews for Data Analyst Intern roles.",
      actions: ["Polish your portfolio", "Apply to the Northwind Analytics internship", "Message one recruiter per week"],
      deliverable: "Applications submitted",
    },
  ],
  weeklyRhythm: ["Three 90-minute SQL or visualisation sessions", "One project build session", "Friday review of new opportunities"],
  milestones: [
    { when: "Nov 2026", milestone: "First dashboard live", measure: "Public link on your Career Profile" },
    { when: "Jan 2027", milestone: "Project shipped", measure: "README with a statistics section" },
    { when: "Mar 2027", milestone: "Applications out", measure: "3+ applications to roles with 70%+ match" },
  ],
  targetOpportunities: [{ jobId: "job-northwind-da-intern", why: "Best match; Data Visualization is the only gap." }],
  alternativePaths: [{ careerId: "business-analyst", why: "Uses your Excel and explaining skills." }],
  risks: [
    { risk: "Learning without shipping", mitigation: "Publish each dashboard before moving on." },
    { risk: "Applying too late", mitigation: "Track internship deadlines from January." },
  ],
  thisWeek: ["Start the SQL stage on your roadmap", "Save the Northwind Analytics internship", "Block three study sessions"],
};
