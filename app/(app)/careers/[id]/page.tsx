import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CircleAlert,
  ClipboardList,
  Map as MapIcon,
  MessagesSquare,
  Route,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { MatchBadge, MeterRow, ReadinessRing, SkillChip } from "@/components/app/match";
import { FollowButton } from "@/components/app/social-buttons";
import { CareerPath } from "@/components/career/career-path";
import { Panel } from "@/components/career/panel";
import { SetGoalButton } from "@/components/career/set-goal-button";
import { Button } from "@/components/ui/button";
import { LEVEL_LABELS, computeReadiness, matchCareer, matchJob, skillEvidence } from "@/lib/ai/matching";
import { requireProfile } from "@/lib/auth";
import { getCatalog, skillName } from "@/lib/data/catalog";
import { loadOpenJobs } from "@/lib/data/jobs";
import { loadCareerProfile } from "@/lib/data/profile";
import { JOB_TYPE_LABELS } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

// Server actions on this page may call the LLM (see lib/ai/llm.ts).
export const maxDuration = 120;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const catalog = await getCatalog();
  return { title: catalog.careerById.get(id)?.title ?? "Career" };
}

function fitMessage(score: number) {
  if (score >= 80) return "Excellent fit. You already cover most of what this career needs.";
  if (score >= 60) return "Good fit. A few skills to strengthen and you will be competitive.";
  if (score >= 40) return "Possible with some growth. Your roadmap can close the gap.";
  return "A stretch for now, but reachable with a focused plan.";
}

export default async function CareerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile({ role: "seeker" });
  const [data, catalog] = await Promise.all([loadCareerProfile(profile.id), getCatalog()]);
  const career = catalog.careerById.get(id);
  if (!career || !data) notFound();

  const match = matchCareer(data, catalog, id)!;
  const requirements = catalog.requirementsByCareer.get(id) ?? [];
  const levelOf = new Map(data.skills.map((s) => [s.skill_id, s.level]));
  const isGoal = data.goal?.career_id === id;
  const goalTitle = data.goal ? catalog.careerById.get(data.goal.career_id)?.title ?? null : null;
  const readiness = isGoal ? computeReadiness(data, catalog, id) : null;

  const supabase = await createClient();
  const [jobs, communities, following, followers] = await Promise.all([
    loadOpenJobs(),
    supabase.from("communities").select("id, slug, name, description").eq("career_id", id),
    supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", profile.id)
      .eq("target_type", "career")
      .eq("target_id", id)
      .maybeSingle(),
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("target_type", "career").eq("target_id", id),
  ]);

  const relatedJobs = jobs
    .filter((job) => job.career_id === id)
    .map((job) => ({ job, match: matchJob(data, catalog, job) }))
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, 3);

  const core = requirements.filter((r) => r.importance === 3);
  const supporting = requirements.filter((r) => r.importance < 3);
  const strengths = [...match.have].sort(
    (a, b) => Number(b.status === "ready") - Number(a.status === "ready") || b.importance - a.importance,
  );
  const gaps = [...match.gaps].sort(
    (a, b) => b.importance - a.importance || Number(b.status === "missing") - Number(a.status === "missing"),
  );
  const followerCount = followers.count ?? 0;

  const chipFor = (skillId: string, target: number) => {
    const level = levelOf.get(skillId) ?? 0;
    return level <= 0 ? "missing" : level >= target ? "ready" : "improving";
  };

  return (
    <div className="space-y-8">
      <Link
        href="/careers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> All careers
      </Link>

      <header className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-500/10 via-card to-cyan-500/5 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-full border bg-background/60 px-2.5 py-0.5 text-xs font-medium">{career.field}</span>
              <span className="inline-flex items-center gap-1 text-xs">
                <Users className="h-3.5 w-3.5" aria-hidden />
                {followerCount} {followerCount === 1 ? "person follows" : "people follow"} this career
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{career.title}</h1>
            <p className="text-base text-muted-foreground sm:text-lg">{career.summary}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:shrink-0 lg:justify-end">
            {isGoal ? (
              <>
                <span className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white dark:bg-emerald-500 dark:text-emerald-950">
                  <Target className="h-4 w-4" aria-hidden /> Your current goal
                </span>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <Button asChild variant="outline">
                    <Link href="/skill-gap">View Skill Gap</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/roadmap">View Roadmap</Link>
                  </Button>
                </div>
              </>
            ) : (
              <SetGoalButton careerId={id} careerTitle={career.title} currentGoalTitle={goalTitle} />
            )}
            <FollowButton
              targetType="career"
              targetId={id}
              initialFollowing={Boolean(following.data)}
              label="Follow career"
              size={isGoal ? "default" : "lg"}
              variant="outline"
            />
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Your Match — first on phones, right column on desktop */}
        <aside className="space-y-6 lg:col-start-3 lg:row-start-1">
          <section aria-labelledby="your-match" className="rounded-xl border bg-card p-5 sm:p-6 lg:sticky lg:top-24">
            <h2 id="your-match" className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden /> Your Match
            </h2>
            <div className="mt-4 flex items-center gap-5">
              <ReadinessRing value={match.score} label="Match" size={120} />
              <p className="text-sm text-muted-foreground">{fitMessage(match.score)}</p>
            </div>
            <div className="mt-5 space-y-3">
              <MeterRow label="Skill fit" value={Math.round(match.skillScore * 100)} />
              {match.preferenceFit !== null ? (
                <MeterRow label="Preference fit" value={Math.round(match.preferenceFit * 100)} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  <Link href="/onboarding/preferences" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                    Answer the career questions
                  </Link>{" "}
                  to see how well this career fits the way you like to work.
                </p>
              )}
            </div>
            {readiness && (
              <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
                <p className="font-medium">Career Readiness: {readiness.overall}%</p>
                <p className="text-muted-foreground">You are getting closer to {career.title}.</p>
                <Link
                  href="/roadmap"
                  className="mt-1 inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  Continue your roadmap <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            )}
            {!isGoal && (
              <p className="mt-5 border-t pt-4 text-xs text-muted-foreground">
                Set this as your goal to get a personal Skill Gap analysis and a month-by-month Career Roadmap.
              </p>
            )}
          </section>
        </aside>

        <div className="space-y-6 lg:col-span-2 lg:col-start-1 lg:row-start-1">
          <Panel
            title="What does this career do?"
            icon={ClipboardList}
            description={`Day to day, ${/^[aeiou]/i.test(career.title) ? "an" : "a"} ${career.title} will:`}
          >
            {career.responsibilities.length > 0 && (
              <ul className="grid gap-2 sm:grid-cols-2">
                {career.responsibilities.map((item) => (
                  <li key={item} className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Typical Skills"
            icon={Star}
            description={
              <span className="inline-flex flex-wrap gap-x-3 gap-y-1">
                <span>✓ You have it</span>
                <span>◐ Improving</span>
                <span>△ Not yet</span>
              </span>
            }
          >
            <div className="space-y-4">
              {core.length > 0 && (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden /> Core skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {core.map((r) => (
                      <SkillChip key={r.skill_id} name={skillName(catalog, r.skill_id)} status={chipFor(r.skill_id, r.target_level)} className="text-sm" />
                    ))}
                  </div>
                </div>
              )}
              {supporting.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Supporting skills</p>
                  <div className="flex flex-wrap gap-2">
                    {supporting.map((r) => (
                      <SkillChip key={r.skill_id} name={skillName(catalog, r.skill_id)} status={chipFor(r.skill_id, r.target_level)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Panel>

          <div className="grid gap-6 md:grid-cols-2">
            <Panel title="Your Strengths" icon={TrendingUp} description="Skills you bring to this career today.">
              {strengths.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  None of this career&apos;s skills are on your profile yet.{" "}
                  <Link href="/profile" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                    Add skills you have
                  </Link>
                </p>
              ) : (
                <ul className="space-y-3">
                  {strengths.map((s) => {
                    const evidence = skillEvidence(data, catalog, s.skillId)[0];
                    return (
                      <li key={s.skillId} className="flex items-start gap-2.5 text-sm">
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                            s.status === "ready"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-sky-500/15 text-sky-700 dark:text-sky-300",
                          )}
                        >
                          <Check className="h-3 w-3" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium">
                            {skillName(catalog, s.skillId)}{" "}
                            <span className="font-normal text-muted-foreground">
                              · {LEVEL_LABELS[s.level]}
                              {s.status === "improving" && ` (target ${LEVEL_LABELS[s.target]})`}
                            </span>
                          </p>
                          {evidence && <p className="truncate text-xs text-muted-foreground">{evidence}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel title="Your Gaps" icon={CircleAlert} description="What to build next to become competitive.">
              {gaps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No gaps: you meet every skill this career typically asks for.</p>
              ) : (
                <ul className="space-y-3">
                  {gaps.map((g) => (
                    <li key={g.skillId} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                        <CircleAlert className="h-3 w-3" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">
                          {skillName(catalog, g.skillId)}{" "}
                          <span className="font-normal text-muted-foreground">
                            ·{" "}
                            {g.status === "missing"
                              ? `Needed at ${LEVEL_LABELS[g.target]}`
                              : `${LEVEL_LABELS[g.level]} → ${LEVEL_LABELS[g.target]}`}
                          </span>
                        </p>
                        {g.importance === 3 && <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Core skill</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {gaps.length > 0 && (
                <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                  {isGoal ? (
                    <Link href="/skill-gap" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                      See your full Skill Gap analysis →
                    </Link>
                  ) : (
                    "Set this career as your goal to get a step-by-step plan for these skills."
                  )}
                </p>
              )}
            </Panel>
          </div>

          <Panel title="Typical Career Path" icon={Route} description="How people usually progress in this career.">
            <CareerPath steps={career.career_path} />
          </Panel>

          <Panel
            title={`Open roles for ${career.title}`}
            icon={BriefcaseBusiness}
            description="Ranked by your match."
            actions={
              <Link href="/jobs" className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                All jobs
              </Link>
            }
          >
            {relatedJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open roles for this career right now. Follow the career and we will let you know when new ones are posted.
              </p>
            ) : (
              <ul className="divide-y">
                {relatedJobs.map(({ job, match: jobMatch }) => (
                  <li key={job.id}>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="-mx-2 flex items-start justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-accent/50"
                    >
                      <div className="min-w-0">
                        <p className="font-medium leading-snug">{job.title}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {[job.company?.name, job.location, JOB_TYPE_LABELS[job.job_type]].filter(Boolean).join(" · ")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{jobMatch.message}</p>
                      </div>
                      <MatchBadge score={jobMatch.score} className="shrink-0 whitespace-nowrap" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {communities.data && communities.data.length > 0 && (
            <Panel title="Community" icon={MessagesSquare} description="Learn from people who work in or are moving into this career.">
              <ul className="space-y-3">
                {communities.data.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{c.name}</p>
                      {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                    </div>
                    <Button asChild variant="outline" size="sm" className="shrink-0">
                      <Link href={`/community/c/${c.slug}`}>
                        Join the discussion <ArrowRight aria-hidden />
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {!isGoal && (
            <div className="flex flex-col items-start gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <MapIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <div>
                  <p className="font-semibold">Ready to aim for {career.title}?</p>
                  <p className="text-sm text-muted-foreground">We will analyse your skill gap and build your personal Career Roadmap.</p>
                </div>
              </div>
              <SetGoalButton careerId={id} careerTitle={career.title} currentGoalTitle={goalTitle} size="default" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
