import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CompanyForm } from "@/components/onboarding/company-form";
import { OnboardingSteps } from "@/components/onboarding/steps";
import { homePathFor, requireProfile } from "@/lib/auth";
import { STEP_PATHS, type OnboardingStep } from "../_lib/gate";

export const metadata: Metadata = { title: "Set up your company" };

export default async function CompanyOnboardingPage() {
  const profile = await requireProfile({ allowOnboarding: true });
  const step = profile.onboarding_step as OnboardingStep;
  if (step === "done") redirect(homePathFor(profile));
  // Only people who have not chosen the job seeker path yet can switch to hiring.
  if (step !== "role") redirect(STEP_PATHS[step]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <OnboardingSteps current="company" flow="recruiter" />
      <div className="space-y-2">
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tell candidates about your company</h1>
        <p className="text-muted-foreground">
          This appears on your job posts and company page. You can change it any time.
        </p>
      </div>
      <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-8">
        <CompanyForm />
      </div>
    </div>
  );
}
