import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingSteps } from "@/components/onboarding/steps";
import { RoleChoice } from "@/components/onboarding/role-choice";
import { homePathFor, requireProfile } from "@/lib/auth";
import { STEP_PATHS, type OnboardingStep } from "./_lib/gate";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const profile = await requireProfile({ allowOnboarding: true });
  const step = profile.onboarding_step as OnboardingStep;
  if (step === "done") redirect(homePathFor(profile));
  if (step !== "role") redirect(STEP_PATHS[step]);

  const firstName = profile.full_name?.split(/\s+/)[0];

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <OnboardingSteps current="role" />
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Welcome to JADE{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-muted-foreground">
          Tell us why you&apos;re here and we&apos;ll set things up for you. It only takes a few minutes.
        </p>
      </div>
      <RoleChoice />
    </div>
  );
}
