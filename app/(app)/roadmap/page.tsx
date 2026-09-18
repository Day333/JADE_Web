import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Compass, Flag, Footprints, ListChecks, MapPin, PartyPopper, Target } from "lucide-react";
import { ForYouLabel } from "@/components/app/match";
import { EmptyState, PageHeader } from "@/components/app/page-parts";
import { ReadinessCard } from "@/components/career/readiness-card";
import { GenerateRoadmapButton, RegenerateRoadmapButton } from "@/components/career/roadmap-controls";
import { RoadmapStage, type StageView } from "@/components/career/roadmap-stage";
import { Button } from "@/components/ui/button";
import { LEVEL_LABELS, computeReadiness, skillLevels } from "@/lib/ai/matching";
import { requireProfile } from "@/lib/auth";
import { getCatalog, skillName } from "@/lib/data/catalog";
import { loadOpenJobs, rankJobs, strongMatches } from "@/lib/data/jobs";
import { loadCareerProfile } from "@/lib/data/profile";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

// Server actions on this page may call the LLM (see lib/ai/llm.ts).
export const maxDuration = 120;

export const metadata: Metadata = { title: "Your Career Roadmap" };

function YouAreHere() {
  return (
    <li className="relative pb-5 pl-14" aria-label="You are here">
      <span aria-hidden className="absolute bottom-0 left-[19px] top-0 w-0.5 bg-gradient-to-b from-emerald-500 to-emerald-500/30" />
      <span
        aria-hidden
        className="absolute left-[8px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white ring-4 ring-emerald-500/20 dark:bg-emerald-500 dark:text-emerald-950"
      >
        <MapPin className="h-3.5 w-3.5" />
      </span>
      <span className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white shadow-sm dark:bg-emerald-500 dark:text-emerald-950">
        You are here
      </span>
    </li>
  );
}

export default async function RoadmapPage() {
  const profile = await requireProfile({ role: "seeker" });
  const [data, catalog] = await Promise.all([loadCareerProfile(profile.id), getCatalog()]);
  const goalId = data?.goal?.career_id;
  const career = goalId ? catalog.careerById.get(goalId) : undefined;

  if (!data || !goalId || !career) {
    return (
      <>
        <PageHeader eyebrow={<ForYouLabel>Your Career Roadmap</ForYouLabel>} title="Your Career Roadmap" />
        <EmptyState
          icon={Compass}
          title="Set a career goal to get your roadmap"
          description="Pick a career you want to grow into. We will turn your skill gap into a month-by-month plan with concrete tasks."
          action={
            <Button asChild>
              <Link href="/careers">
                Explore careers <ArrowRight aria-hidden />
              </Link>
            </Button>
          }
        />
      </>
    );
  }

  const supabase = await createClient();
  const [{ data: roadmap, error }, jobs] = await Promise.all([
    supabase
      .from("roadmaps")
      .select("id, career_id, created_at, roadmap_stages(*, roadmap_tasks(*))")
      .eq("user_id", profile.id)
      .eq("is_active", true)
      .maybeSingle(),
    loadOpenJobs(),
  ]);

  const readiness = computeReadiness(data, catalog, goalId);
  const strongCount = strongMatches(rankJobs(data, catalog, jobs)).length;

  if (!roadmap || roadmap.career_id !== goalId) {
    return (
      <div className="space-y-8">
        <PageHeader
          className="mb-0"
          eyebrow={<ForYouLabel>Your Career Roadmap</ForYouLabel>}
          title={`Your roadmap to ${career.title}`}
        />
        <ReadinessCard careerTitle={career.title} readiness={readiness} />
        <EmptyState
          icon={Target}
          title={error ? "We could not load your roadmap" : "Your roadmap is not ready yet"}
          description={
            error
              ? "Something went wrong while loading your roadmap. You can generate a fresh one from your current profile."
              : `Your goal is ${career.title}. Generate a month-by-month plan from your current skill gap.`
          }
          action={<GenerateRoadmapButton />}
        />
      </div>
    );
  }

  // ---- Build the stage views -------------------------------------------------
  const levels = skillLevels(data);
  const requirements = catalog.requirementsByCareer.get(goalId) ?? [];
  const careerSkills = requirements.filter((r) => r.importance >= 2).map((r) => r.skill_id);

  const stages = [...roadmap.roadmap_stages].sort((a, b) => a.position - b.position);
  const views: StageView[] = stages.map((stage, index) => {
    const tasks = [...stage.roadmap_tasks].sort((a, b) => a.position - b.position);
    const stageSkills = [...new Set([stage.skill_id, ...tasks.map((t) => t.skill_id)].filter((s): s is string => Boolean(s)))];
    const preselected = new Set(stageSkills.length > 0 ? stageSkills : careerSkills.slice(0, 3));
    const offered = [...new Set([...stageSkills, ...careerSkills])].slice(0, 12);
    return {
      id: stage.id,
      index,
      periodLabel: stage.period_label,
      title: stage.title,
      description: stage.description,
      kind: stage.kind,
      completedAt: stage.completed_at,
      evidenceNote: stage.evidence_note,
      evidenceUrl: stage.evidence_url,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        isDone: t.is_done,
        targetLabel: t.skill_id && t.target_level ? LEVEL_LABELS[t.target_level] : null,
      })),
      skill: stage.skill_id
        ? { id: stage.skill_id, name: skillName(catalog, stage.skill_id), level: levels.get(stage.skill_id) ?? 0 }
        : null,
      projectSkills: offered.map((id) => ({ id, name: skillName(catalog, id), selected: preselected.has(id) })),
      projects: data.projects
        .filter((p) => p.roadmap_stage_id === stage.id)
        .map((p) => ({ id: p.id, name: p.name, url: p.url })),
    };
  });

  const isComplete = (v: StageView) => (v.tasks.length > 0 ? v.tasks.every((t) => t.isDone) : Boolean(v.completedAt));
  const currentIndex = views.findIndex((v) => !isComplete(v));
  const allTasks = views.flatMap((v) => v.tasks);
  const doneTasks = allTasks.filter((t) => t.isDone).length;
  const completedStages = views.filter(isComplete).length;
  const current = currentIndex >= 0 ? views[currentIndex] : null;
  const nextTask = current?.tasks.find((t) => !t.isDone) ?? null;
  const progress = allTasks.length > 0 ? Math.round((doneTasks / allTasks.length) * 100) : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow={<ForYouLabel>Your Career Roadmap</ForYouLabel>}
        title={`Your roadmap to ${career.title}`}
        description={`A month-by-month plan built from your skill gap on ${formatDate(roadmap.created_at)}. Tick off tasks as you go: your skills, readiness and job matches update automatically.`}
        actions={
          <>
            <Button asChild>
              <Link href="/plan">AI Career Plan</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/skill-gap">View Skill Gap</Link>
            </Button>
            <RegenerateRoadmapButton careerTitle={career.title} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <ReadinessCard careerTitle={career.title} readiness={readiness} size="lg" className="lg:col-span-2" />
        <section aria-label="Roadmap progress" className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:p-6">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5" aria-hidden /> Roadmap progress
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums">{progress}%</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-[width] duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {doneTasks} of {allTasks.length} tasks · {completedStages} of {views.length} stages complete
            </p>
          </div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <Footprints className="h-3.5 w-3.5" aria-hidden /> Your Next Step
            </p>
            {current && nextTask ? (
              <>
                <p className="mt-1 text-sm font-medium">{nextTask.title}</p>
                <a
                  href={`#stage-${current.id}`}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  {current.title} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </a>
              </>
            ) : (
              <p className="mt-1 text-sm font-medium">Roadmap complete. Time to apply!</p>
            )}
          </div>
          <Link
            href="/jobs"
            className="mt-auto flex items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-accent/50"
          >
            <span className="flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <span>
                <strong className="tabular-nums">{strongCount}</strong> strong job {strongCount === 1 ? "match" : "matches"} for you
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          </Link>
        </section>
      </div>

      <section aria-labelledby="timeline-heading" className="mx-auto max-w-3xl">
        <h2 id="timeline-heading" className="sr-only">
          Roadmap stages
        </h2>
        <ol className="relative">
          {views.map((view, i) => (
            <FragmentWithMarker key={view.id} showMarker={i === currentIndex}>
              <RoadmapStage stage={view} isCurrent={i === currentIndex} />
            </FragmentWithMarker>
          ))}
          {currentIndex === -1 && (
            <li className="relative pb-5 pl-14">
              <span aria-hidden className="absolute bottom-0 left-[19px] top-0 w-0.5 bg-emerald-500" />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white dark:bg-emerald-500 dark:text-emerald-950">
                <PartyPopper className="h-3.5 w-3.5" aria-hidden /> Roadmap complete
              </span>
            </li>
          )}
          <li className="relative pl-14">
            <span
              aria-hidden
              className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/20"
            >
              <Flag className="h-5 w-5" />
            </span>
            <div className="rounded-xl border-2 border-dashed border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 p-4 sm:p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Target</p>
              <p className="mt-1 text-xl font-bold">{career.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {readiness.overall}% ready today. You are getting closer to {career.title}.
              </p>
              <Link
                href={`/careers/${career.id}`}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
              >
                About this career <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </li>
        </ol>
      </section>
    </div>
  );
}

function FragmentWithMarker({ showMarker, children }: { showMarker: boolean; children: React.ReactNode }) {
  return (
    <>
      {showMarker && <YouAreHere />}
      {children}
    </>
  );
}
