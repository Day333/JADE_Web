import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OnboardingSteps } from "@/components/onboarding/steps";
import { ReviewForm } from "@/components/onboarding/review-form";
import type { ParsedResume } from "@/lib/ai/resume-parser";
import { getCatalog } from "@/lib/data/catalog";
import { createClient } from "@/lib/supabase/server";
import { gateStep } from "../_lib/gate";
import { buildDraft } from "./draft";

export const metadata: Metadata = { title: "Review your profile" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ReviewStepPage({
  searchParams,
}: {
  searchParams: Promise<{ update?: string; manual?: string; resume?: string }>;
}) {
  const { update, manual, resume } = await searchParams;
  const { profile, editing } = await gateStep("review", { allowDone: update === "1" });
  const supabase = await createClient();
  const userId = profile.id;

  let parsed: ParsedResume | null = null;
  let fileName: string | null = null;
  if (manual !== "1") {
    const base = supabase.from("resumes").select("id, file_name, parsed").eq("user_id", userId);
    const { data } = await (resume && UUID_RE.test(resume)
      ? base.eq("id", resume)
      : base.order("created_at", { ascending: false }).limit(1)
    ).maybeSingle();
    parsed = (data?.parsed as ParsedResume | null) ?? null;
    fileName = data?.file_name ?? null;
  }

  const [catalog, educations, experiences, projects, certifications, skills] = await Promise.all([
    getCatalog(),
    supabase.from("educations").select("school, degree").eq("user_id", userId),
    supabase.from("experiences").select("title, organization").eq("user_id", userId),
    supabase.from("projects").select("name").eq("user_id", userId),
    supabase.from("certifications").select("name").eq("user_id", userId),
    supabase.from("user_skills").select("skill_id, level").eq("user_id", userId),
  ]);

  const { draft, hidden, foundSkills, otherSkills } = buildDraft(parsed, profile, catalog, {
    educations: educations.data ?? [],
    experiences: experiences.data ?? [],
    projects: projects.data ?? [],
    certifications: certifications.data ?? [],
    skills: skills.data ?? [],
  });

  const options = catalog.skills
    .filter((s) => !s.is_custom)
    .map((s) => ({ id: s.id, name: s.name, category: s.category, aliases: s.aliases }));

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {editing ? (
        <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to my Career Profile
        </Link>
      ) : (
        <OnboardingSteps current="review" />
      )}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {editing ? "Review what's new" : "Review Your Profile"}
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          {editing
            ? "Here's what we found in your newer resume. Edit or remove anything, then add it to your Career Profile."
            : "Check what we found, fix anything that's off and add what's missing. Nothing is saved until you confirm."}
        </p>
      </div>
      <ReviewForm
        initialDraft={draft}
        mode={editing ? "update" : "onboarding"}
        foundSkills={foundSkills}
        otherSkills={otherSkills}
        hidden={hidden}
        fileName={parsed ? fileName : null}
        options={options}
      />
    </div>
  );
}
