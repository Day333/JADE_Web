/**
 * Release-gate thresholds for the AI Career Plan eval. Tune as the product matures.
 */

export const config = {
  latency: {
    /** The /plan route allows 300 s; kimi-k3 usually answers in ~50 s. */
    maxMsPerCall: 150_000,
  },

  cost: {
    /** Currency of the prices below and of maxPerCase (DashScope bills in CNY or USD by region). */
    currency: "USD",
    /** Budget for one plan generation. Only enforced when the model's price is known. */
    maxPerCase: 0.05,
    /**
     * Price per 1M tokens by model id, from your provider's pricing page.
     * Models missing here get a warning with their token counts instead of a cost check.
     */
    pricesPerMTok: {} as Record<string, { input: number; output: number }>,
  },

  grounding: {
    /** Share of the core/important gaps and improving skills the plan must address. */
    minGapCoverage: 0.6,
    minPhases: 2,
    maxPhases: 5,
  },

  gate: {
    /**
     * Only hallucination blocks a release. These rule checks catch the model
     * inventing jobs or careers; every other rule check is reported as a warning.
     */
    blockingChecks: ["job_ids_valid", "career_ids_valid"],
  },

  judge: {
    /** Scores are 1–5. Release is blocked if any case scores below this on grounding (hallucination). */
    minGrounding: 3,
    /** Personalization, feasibility and actionability below this are warnings only. */
    warnBelow: 3,
    /**
     * Each run also judges a control plan full of invented facts. If the judge
     * gives it more than this on grounding, it can't spot hallucinations and
     * its scores aren't trusted (release blocked).
     */
    controlMaxGrounding: 2,
  },
};
