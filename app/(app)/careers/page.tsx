import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Map as MapIcon, Target } from "lucide-react";
import { Fold } from "@/components/app/fold";
import { ForYouLabel } from "@/components/app/match";
import { EmptyState, PageHeader } from "@/components/app/page-parts";
import { CareerCard } from "@/components/career/career-card";
import { CareerExplorer, type ExplorerCareer } from "@/components/career/career-explorer";
import { HiddenPotentialSection } from "@/components/career/hidden-potential";
import { Button } from "@/components/ui/button";
import { findHiddenPotential, recommendCareers } from "@/lib/ai";
import { MIN_SHOWN_MATCH } from "@/lib/ai/matching";
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
  const goalId = data.goal?.career_id ?? null;
  const goalMatch = goalId ? ranked.find((m) => m.career.id === goalId) : undefined;
  const rankOf = new Map(ranked.map((m, i) => [m.career.id, i + 1]));
  // Low matches are left out everywhere; the goal is always shown.
  const shown = ranked.filter((m) => m.score >= MIN_SHOWN_MATCH || m.career.id === goalId);
  // Once a goal is set, the other top candidates fold away below it.
  const top = shown.filter((m) => m.career.id !== goalId).slice(0, goalMatch ? 4 : 5);

  const explorer: ExplorerCareer[] = shown.map((m) => ({
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

        {goalMatch ? (
          <div className="space-y-4">
            <CareerCard match={goalMatch} catalog={catalog} rank={rankOf.get(goalMatch.career.id)} featured isGoal />
            {top.length > 0 && (
              <Fold
                summary={
                  <>
                    <p className="font-semibold">
                      Other recommended careers <span className="font-normal text-muted-foreground">· {top.length}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground group-open/fold:hidden">
                      {top.map((m) => `${m.career.title} (${m.score}%)`).join(" · ")}
                    </p>
                  </>
                }
              >
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {top.map((match) => (
                    <CareerCard key={match.career.id} match={match} catalog={catalog} rank={rankOf.get(match.career.id)} />
                  ))}
                </div>
              </Fold>
            )}
          </div>
        ) : top.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {top.map((match, i) => (
              <CareerCard
                key={match.career.id}
                match={match}
                catalog={catalog}
                rank={rankOf.get(match.career.id)}
                featured={i === 0}
                className={i === 0 ? "md:col-span-2" : undefined}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Compass}
            title={`No career reaches a ${MIN_SHOWN_MATCH}% match yet`}
            description="Add more skills, projects and experience to your Career Profile, or take the preference questionnaire, so we can find careers that fit you."
            action={
              <Button asChild>
                <Link href="/profile">Update your Career Profile</Link>
              </Button>
            }
          />
        )}
      </div>

      <HiddenPotentialSection items={hidden} defaultOpen={!goalMatch} />

      {explorer.length > 0 && (
        <section aria-labelledby="explore-heading" className="space-y-5">
          <div className="space-y-1">
            <h2 id="explore-heading" className="text-xl font-bold tracking-tight">
              Explore all careers
            </h2>
            <p className="text-sm text-muted-foreground">
              Every career in JADE where your match is {MIN_SHOWN_MATCH}% or higher. Open one to see what the job involves, your strengths
              and your gaps.
            </p>
          </div>
          <CareerExplorer careers={explorer} minMatch={MIN_SHOWN_MATCH} />
        </section>
      )}
    </div>
  );
}
