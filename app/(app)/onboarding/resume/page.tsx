import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { OnboardingSteps } from "@/components/onboarding/steps";
import { ResumeUpload } from "@/components/onboarding/resume-upload";
import { gateStep } from "../_lib/gate";

// Server actions on this page may call the LLM (see lib/ai/llm.ts).
export const maxDuration = 120;

export const metadata: Metadata = { title: "Upload your resume" };

export default async function ResumeStepPage({ searchParams }: { searchParams: Promise<{ update?: string }> }) {
  const { update } = await searchParams;
  const { profile, editing } = await gateStep("resume", { allowDone: update === "1" });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {editing ? (
        <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to my Career Profile
        </Link>
      ) : (
        <OnboardingSteps current="resume" />
      )}

      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {editing ? "Upload a newer resume" : "Let's start with your resume"}
        </h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          {editing
            ? "We'll pick out anything new — education, experience, projects and skills — and let you review it before it's added to your Career Profile. Nothing is removed."
            : "We'll read it and draft your Career Profile for you: education, experience, projects and skills. You'll review everything before it's saved."}
        </p>
      </div>

      <ResumeUpload userId={profile.id} update={editing} />

      <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
        <li className="flex items-start gap-2 rounded-xl border bg-card p-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          Skills are matched against 80+ skills employers ask for.
        </li>
        <li className="flex items-start gap-2 rounded-xl border bg-card p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          Nothing is saved to your profile until you confirm it.
        </li>
        <li className="flex items-start gap-2 rounded-xl border bg-card p-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          Your file stays private unless you choose to share it.
        </li>
      </ul>
    </div>
  );
}
