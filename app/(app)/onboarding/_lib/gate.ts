import "server-only";

import { redirect } from "next/navigation";
import { homePathFor, requireProfile } from "@/lib/auth";

export type OnboardingStep = "role" | "resume" | "review" | "preferences" | "done";

const ORDER: OnboardingStep[] = ["role", "resume", "review", "preferences", "done"];

export const STEP_PATHS: Record<OnboardingStep, string> = {
  role: "/onboarding",
  resume: "/onboarding/resume",
  review: "/onboarding/review",
  preferences: "/onboarding/preferences",
  done: "/onboarding/complete",
};

/**
 * Guard an onboarding step page. Users who have not reached the step yet are
 * sent to their current step; users who finished onboarding go home, unless
 * the page is opened in its "edit later" mode (`allowDone`), which is only
 * for job seekers.
 */
export async function gateStep(page: OnboardingStep, { allowDone = false } = {}) {
  const profile = await requireProfile({ allowOnboarding: true });
  const step = profile.onboarding_step as OnboardingStep;
  if (step === "done") {
    if (!allowDone || profile.role !== "seeker") redirect(homePathFor(profile));
    return { profile, editing: true };
  }
  if (ORDER.indexOf(step) < ORDER.indexOf(page)) redirect(STEP_PATHS[step]);
  return { profile, editing: false };
}
