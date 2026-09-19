import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Circle, Compass, MessagesSquare, Sparkles, Target, TrendingUp } from "lucide-react";
import { GettingStarted } from "@/components/app/getting-started";
import { ForYouLabel, MatchBadge, MeterRow, ReadinessRing, SkillChip, type ChipStatus } from "@/components/app/match";
import { EmptyState } from "@/components/app/page-parts";
import { Slogan } from "@/components/app/slogan";
import { UserAvatar } from "@/components/app/user-avatar";
import { Button } from "@/components/ui/button";
import { findHiddenPotential, recommendCareers } from "@/lib/ai";
import { computeReadiness, computeSkillGap, MIN_SHOWN_MATCH } from "@/lib/ai/matching";
import { requireProfile } from "@/lib/auth";
import { getCatalog, skillName } from "@/lib/data/catalog";
import { loadOpenJobs, rankJobs, strongMatches } from "@/lib/data/jobs";
import { loadCareerProfile } from "@/lib/data/profile";
import { POST_TYPE_LABELS, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { CareerProfileData, Catalog } from "@/lib/types";

export const metadata = { title: "Home" };

function Section({ title, label, action, children }: { title: string; label?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {label && <ForYouLabel>{label}</ForYouLabel>}
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** The user's strongest skills, marked against their goal when they have one. */
function summarySkills(data: CareerProfileData, catalog: Catalog) {
  const goalId = data.goal?.career_id;
  if (goalId) {
    const gap = computeSkillGap(data, catalog, goalId);
    if (gap) {
      const items: { name: string; status: ChipStatus }[] = [
        ...gap.ready.slice(0, 4).map((i) => ({ name: i.name, status: "ready" as const })),
        ...gap.improving.slice(0, 2).map((i) => ({ name: i.name, status: "improving" as const })),
        ...gap.missing.slice(0, 3).map((i) => ({ name: i.name, status: "missing" as const })),
      ];
      return items;
    }
  }
  return [...data.skills]
    .sort((a, b) => b.level - a.level)
    .slice(0, 8)
    .map((s) => ({ name: skillName(catalog, s.skill_id), status: "neutral" as const }));
}

async function loadNextTasks(userId: string) {
  const supabase = await createClient();
  const { data: roadmap } = await supabase
    .from("roadmaps")
    .select("id, roadmap_stages(id, title, period_label, position, roadmap_tasks(id, title, is_done, position))")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (!roadmap) return null;
  const stages = [...roadmap.roadmap_stages].sort((a, b) => a.position - b.position);
  const tasks = stages.flatMap((s) =>
    [...s.roadmap_tasks].sort((a, b) => a.position - b.position).map((t) => ({ ...t, stage: s.title, period: s.period_label })),
  );
  return { done: tasks.filter((t) => t.is_done).length, total: tasks.length, next: tasks.filter((t) => !t.is_done).slice(0, 3) };
}

async function loadFeed(userId: string, goalCareerId: string | null | undefined, university: string | null) {
  const supabase = await createClient();
  const [{ data: follows }, { data: goalCommunities }, { data: uniCommunities }] = await Promise.all([
    supabase.from("follows").select("target_id").eq("follower_id", userId).eq("target_type", "community"),
    goalCareerId
      ? supabase.from("communities").select("id").eq("career_id", goalCareerId)
      : Promise.resolve({ data: [] as { id: string }[] }),
    university
      ? supabase.from("communities").select("id").eq("kind", "university").ilike("name", `%${university.replace(/[%_,()]/g, " ").trim()}%`)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ]);
  const communityIds = [
    ...new Set([...(follows ?? []).map((f) => f.target_id), ...(goalCommunities ?? []).map((c) => c.id), ...(uniCommunities ?? []).map((c) => c.id)]),
  ];
  // Explicit FK hints: posts and profiles are also linked through likes, saves and comments.
  const select =
    "id, title, type, created_at, like_count, comment_count, author:profiles!posts_author_id_fkey(id, full_name), community:communities!posts_community_id_fkey(name, slug)";
  let posts = communityIds.length
    ? (await supabase.from("posts").select(select).in("community_id", communityIds).order("created_at", { ascending: false }).limit(5)).data ?? []
    : [];
  if (posts.length < 3) {
    const latest = (await supabase.from("posts").select(select).order("created_at", { ascending: false }).limit(5)).data ?? [];
    posts = [...posts, ...latest.filter((p) => !posts.some((q) => q.id === p.id))].slice(0, 5);
  }
  return posts;
}

export default async function DashboardPage() {
  const profile = await requireProfile({ role: "seeker" });
  const [data, catalog, jobs] = await Promise.all([loadCareerProfile(profile.id), getCatalog(), loadOpenJobs()]);
  if (!data) return null;

  const goalCareer = data.goal ? catalog.careerById.get(data.goal.career_id) ?? null : null;
  const readiness = goalCareer ? computeReadiness(data, catalog, goalCareer.id) : null;
  const ranked = rankJobs(data, catalog, jobs);
  const strong = strongMatches(ranked);
  const rankedCareers = await recommendCareers(data, catalog);
  const careers = rankedCareers.filter((m) => m.score >= MIN_SHOWN_MATCH);
  const supabase = await createClient();
  const [nextTasks, feed, hidden, applications, plans, practised, posted, journeys] = await Promise.all([
    loadNextTasks(profile.id),
    loadFeed(profile.id, goalCareer?.id, profile.university),
    goalCareer ? Promise.resolve([]) : findHiddenPotential(data, catalog, rankedCareers),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("user_id", profile.id).neq("status", "saved"),
    supabase.from("career_plans").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase.from("practice_progress").select("question_id", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", profile.id),
    supabase.from("journey_entries").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
  ]);
  const applicationCount = applications.count ?? 0;
  const gettingStarted = [
    { key: "goal", done: Boolean(data.goal) },
    { key: "plan", done: (plans.count ?? 0) > 0 },
    { key: "practice", done: (practised.count ?? 0) > 0 },
    { key: "apply", done: applicationCount > 0 },
    { key: "community", done: (posted.count ?? 0) > 0 || (journeys.count ?? 0) > 0 },
  ];
  const skills = summarySkills(data, catalog);
  const firstName = profile.full_name?.split(/\s+/)[0] ?? "there";
  const education = data.educations[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Welcome back, {firstName}</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {goalCareer ? (
              <>
                You are <span className="text-emerald-600 dark:text-emerald-400">{readiness!.overall}% ready</span> for {goalCareer.title}
              </>
            ) : (
              "Let's find the career that fits you"
            )}
          </h1>
        </div>
        <Slogan className="shrink-0 text-sm text-muted-foreground sm:text-base" />
      </div>

      <GettingStarted steps={gettingStarted} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Career Profile Summary */}
        <section className="rounded-xl border bg-card p-5 sm:p-6 lg:col-span-2">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-start gap-4">
              <UserAvatar name={profile.full_name} seed={profile.id} size="lg" />
              <div className="min-w-0 space-y-1">
                <p className="text-lg font-semibold leading-tight">{profile.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {[profile.degree ?? education?.degree, profile.university ?? education?.school].filter(Boolean).join(" · ") ||
                    profile.headline ||
                    "Complete your education details"}
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Career Goal: </span>
                  {goalCareer ? (
                    <Link href={`/careers/${goalCareer.id}`} className="font-medium hover:underline">
                      {goalCareer.title}
                    </Link>
                  ) : (
                    <Link href="/careers" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
                      Not set yet · choose one
                    </Link>
                  )}
                </p>
              </div>
            </div>
            {readiness && (
              <div className="flex items-center gap-4">
                <ReadinessRing value={readiness.overall} size={104} label="Readiness" />
              </div>
            )}
          </div>
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium">{goalCareer ? `Your skills for ${goalCareer.title}` : "Your main skills"}</p>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <SkillChip key={s.name} name={s.name} status={s.status} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No skills yet. Upload a resume or add skills to your profile.</p>
            )}
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Skills", value: data.skills.length, href: "/profile" },
              { label: "Projects", value: data.projects.length, href: "/profile" },
              { label: "Experiences", value: data.experiences.length, href: "/profile" },
              { label: "Applications", value: applicationCount, href: "/applications" },
            ].map((stat) => (
              <Link key={stat.label} href={stat.href} className="rounded-lg border bg-muted/30 px-3 py-2 hover:bg-accent">
                <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                <dd className="text-xl font-semibold tabular-nums">{stat.value}</dd>
              </Link>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            {profile.open_to_opportunities ? (
              <span className="text-emerald-600 dark:text-emerald-400">● Open to opportunities: recruiters can find you</span>
            ) : (
              <>
                Not visible to recruiters.{" "}
                <Link href="/settings" className="underline underline-offset-2">
                  Turn on Open to Opportunities
                </Link>
              </>
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/profile">
                View Full Profile <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            {goalCareer && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/skill-gap">See my skill gap</Link>
              </Button>
            )}
          </div>
        </section>

        {/* Current Career Goal */}
        <Section
          title={goalCareer ? goalCareer.title : "Choose a career goal"}
          label={goalCareer ? "Target career" : "Your next step"}
        >
          {goalCareer && readiness ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <MeterRow label="Skills" value={readiness.skills} />
                <MeterRow label="Projects" value={readiness.projects} />
                <MeterRow label="Experience" value={readiness.experience} />
                <MeterRow label="Portfolio" value={readiness.portfolio} />
              </div>
              {nextTasks && nextTasks.next.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">
                    Next up <span className="font-normal text-muted-foreground">({nextTasks.done}/{nextTasks.total} tasks done)</span>
                  </p>
                  <ul className="space-y-2">
                    {nextTasks.next.map((t) => (
                      <li key={t.id} className="flex gap-2 text-sm">
                        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span>
                          {t.title}
                          <span className="block text-xs text-muted-foreground">{t.period}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {nextTasks && nextTasks.next.length === 0 && nextTasks.total > 0 && (
                <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Roadmap complete. Time to apply!
                </p>
              )}
              <Button asChild className="w-full">
                <Link href="/roadmap">
                  Continue My Roadmap <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/plan">
                  <Sparkles className="h-4 w-4" /> View my AI Career Plan
                </Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/progress">
                  <TrendingUp className="h-4 w-4" /> My progress &amp; badges
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {careers.length > 0
                  ? "Careers that match your profile right now:"
                  : `No career reaches a ${MIN_SHOWN_MATCH}% match yet. Add skills and projects to your profile to find careers that fit.`}
              </p>
              <ul className="space-y-2">
                {careers.slice(0, 3).map((m) => (
                  <li key={m.career.id}>
                    <Link href={`/careers/${m.career.id}`} className="flex items-center justify-between gap-2 rounded-lg border p-3 hover:bg-accent">
                      <span className="text-sm font-medium">{m.career.title}</span>
                      <MatchBadge score={m.score} />
                    </Link>
                  </li>
                ))}
              </ul>
              {hidden[0] && (
                <Link href={`/careers/${hidden[0].match.career.id}`} className="block rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/5 p-3 hover:bg-emerald-500/10">
                  <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="h-3.5 w-3.5" /> Hidden potential
                  </span>
                  <span className="mt-1 block text-sm font-medium">{hidden[0].match.career.title}</span>
                  <span className="block text-xs text-muted-foreground">{hidden[0].reasons.slice(0, 2).join(" · ")}</span>
                </Link>
              )}
              <Button asChild className="w-full">
                <Link href="/careers">
                  <Compass className="h-4 w-4" /> Discover my careers
                </Link>
              </Button>
            </div>
          )}
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recommended Opportunities */}
        <div className="lg:col-span-2">
          <Section
            title={strong.length > 0 ? `We found ${strong.length} opportunities for you` : "Recommended Opportunities"}
            label="Recommended for you"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/jobs">
                  All jobs <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            }
          >
            {ranked.length === 0 ? (
              <EmptyState icon={BriefcaseBusiness} title="No open jobs right now" description="Check back soon." />
            ) : (
              <ul className="grid gap-3 md:grid-cols-3">
                {ranked.slice(0, 3).map(({ job, match }) => (
                  <li key={job.id} className="flex flex-col rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium leading-snug">{job.title}</p>
                        <p className="text-sm text-muted-foreground">{job.company?.name}</p>
                      </div>
                    </div>
                    <MatchBadge score={match.score} className="mt-2 self-start" />
                    <div className="mt-3 flex flex-wrap gap-1">
                      {match.strengths.slice(0, 3).map((id) => (
                        <SkillChip key={id} name={skillName(catalog, id)} status="have" />
                      ))}
                      {match.gaps.slice(0, 2).map((g) => (
                        <SkillChip key={g.skillId} name={skillName(catalog, g.skillId)} status="gap" />
                      ))}
                    </div>
                    <p className="mt-3 flex-1 text-xs text-muted-foreground">{match.message}</p>
                    <Button asChild size="sm" variant="outline" className="mt-3">
                      <Link href={`/jobs/${job.id}`}>View Job</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* Community Feed */}
        <Section
          title="From the community"
          label={goalCareer ? `For ${goalCareer.title}s` : "For you"}
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/community">
                Feed <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        >
          {feed.length === 0 ? (
            <EmptyState
              icon={MessagesSquare}
              title="No posts yet"
              description="Share your experience and help someone one step behind you."
              action={
                <Button asChild size="sm">
                  <Link href="/community/new">Write a post</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y">
              {feed.map((post) => (
                <li key={post.id} className="py-3 first:pt-0 last:pb-0">
                  <Link href={`/community/post/${post.id}`} className="group block">
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{POST_TYPE_LABELS[post.type]}</span>
                    <span className="block text-sm font-medium leading-snug group-hover:underline">{post.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {post.author?.full_name ?? "Member"}
                      {post.community ? ` · ${post.community.name}` : ""} · {timeAgo(post.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {!goalCareer && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 sm:flex-row sm:items-center">
          <Target className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          <p className="flex-1 text-sm">
            <span className="font-medium">Set a career goal</span> to unlock your Skill Gap, a month-by-month Career Roadmap and your
            Career Readiness score.
          </p>
          <Button asChild size="sm">
            <Link href="/careers">Choose a goal</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
