import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { OnboardingSteps } from "@/components/onboarding/steps";
import { PreferencesForm } from "@/components/onboarding/preferences-form";
import { getCatalog } from "@/lib/data/catalog";
import { createClient } from "@/lib/supabase/server";
import { gateStep } from "../_lib/gate";

export const metadata: Metadata = { title: "Your career preferences" };

export default async function PreferencesStepPage({ searchParams }: { searchParams: Promise<{ retake?: string }> }) {
  const { retake } = await searchParams;
  const { profile, editing } = await gateStep("preferences", { allowDone: retake === "1" });
  const supabase = await createClient();
  const [catalog, { data: prefs }] = await Promise.all([
    getCatalog(),
    supabase.from("career_preferences").select("*").eq("user_id", profile.id).maybeSingle(),
  ]);

  const answers = (prefs?.answers && typeof prefs.answers === "object" && !Array.isArray(prefs.answers)
    ? prefs.answers
    : {}) as Record<string, number>;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {editing ? (
        <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to my Career Profile
        </Link>
      ) : (
        <OnboardingSteps current="preferences" />
      )}
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {editing ? "Retake the career preference questionnaire" : "What kind of work suits you?"}
        </h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          There are no right answers. Your choices help us match you with careers that fit how you like to work — not
          just what you know.
        </p>
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" aria-hidden /> About 3–5 minutes
        </p>
      </div>
      <PreferencesForm
        mode={editing ? "retake" : "onboarding"}
        careers={catalog.careers.map((c) => ({ id: c.id, title: c.title, field: c.field }))}
        initial={{
          answers,
          interestedIndustries: prefs?.interested_industries ?? [],
          workTypes: prefs?.work_types ?? [],
          companyTypes: prefs?.company_types ?? [],
          preferredLocations: prefs?.preferred_locations ?? [],
          interestedCareers: prefs?.interested_careers ?? [],
        }}
      />
    </div>
  );
}
