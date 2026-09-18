import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Map as MapIcon, Target } from "lucide-react";
import { ForYouLabel } from "@/components/app/match";
import { EmptyState, PageHeader } from "@/components/app/page-parts";
import { CareerCard } from "@/components/career/career-card";
import { CareerExplorer, type ExplorerCareer } from "@/components/career/career-explorer";
import { HiddenPotentialSection } from "@/components/career/hidden-potential";
import { Button } from "@/components/ui/button";
import { findHiddenPotential, recommendCareers } from "@/lib/ai";
import { requireProfile } from "@/lib/auth";
import { getCatalog } from "@/lib/data/catalog";
import { loadCareerProfile } from "@/lib/data/profile";

export const metadata: Metadata = { title: "Careers" };

export default async function CareersPage() {
  const profile = await requireProfile({ role: "seeker" });
  const [data, catalog] = await Promise.all([loadCareerProfile(profile.id), getCatalog()]);

  if (!data || data.skills.length === 0) {
    return (
      <>
        <PageHeader eyebrow={<ForYouLabel>Career Discovery</ForYouLabel>} title="Careers Recommended For You" />
        <EmptyState
          icon={Compass}
          title="Add your skills to discover careers"
          description="We match you to careers using the skills, projects and experience in your Career Profile. Upload a resume or add a few skills to see your recommendations."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/onboarding/resume">Upload your resume</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/profile">Add skills to your profile</Link>
              </Button>
            </div>
          }
        />
      </>
    );
  }

  const ranked = await recommendCareers(data, catalog);
  const hidden = await findHiddenPotential(data, catalog, ranked);
  const top = ranked.slice(0, 5);
  const goalId = data.goal?.career_id ?? null;
  const goalMatch = goalId ? ranked.find((m) => m.career.id === goalId) : undefined;
  const goalInTop = goalId ? top.some((m) => m.career.id === goalId) : false;

  const explorer: ExplorerCareer[] = ranked.map((m) => ({
    id: m.career.id,
    title: m.career.title,
    field: m.career.field,
    summary: m.career.summary,
    score: m.score,
    isGoal: m.career.id === goalId,
  }));

  return (
    <div className="space-y-12">
      <div>
        <PageHeader
          className="mb-6"
          eyebrow={<ForYouLabel>Career Discovery</ForYouLabel>}
          title="Careers Recommended For You"
          description="Based on your skills, experience, projects and career preferences. There is no single right answer — explore a few and see what fits."
          actions={
            goalMatch ? (
              <>
                <Button asChild variant="outline">
                  <Link href="/skill-gap">
                    <Target aria-hidden /> Your Skill Gap
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/roadmap">
                    <MapIcon aria-hidden /> Your Roadmap
                  </Link>
                </Button>
              </>
            ) : undefined
          }
        />

        {goalMatch && !goalInTop && (
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p>
              <span className="font-semibold">Your current goal:</span> {goalMatch.career.title} · {goalMatch.score}% match
            </p>
            <Link
              href={`/careers/${goalMatch.career.id}`}
              className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              View career <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {top.map((match, i) => (
            <CareerCard
              key={match.career.id}
              match={match}
              catalog={catalog}
              rank={i + 1}
              featured={i === 0}
              isGoal={match.career.id === goalId}
              className={i === 0 ? "md:col-span-2" : undefined}
            />
          ))}
        </div>
      </div>

      <HiddenPotentialSection items={hidden} />

      <section aria-labelledby="explore-heading" className="space-y-5">
        <div className="space-y-1">
          <h2 id="explore-heading" className="text-xl font-bold tracking-tight">
            Explore all careers
          </h2>
          <p className="text-sm text-muted-foreground">
            Every career in JADE with your personal match. Open one to see what the job involves, your strengths and your gaps.
          </p>
        </div>
        <CareerExplorer careers={explorer} />
      </section>
    </div>
  );
}
