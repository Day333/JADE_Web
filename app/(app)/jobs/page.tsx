import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BellRing, Briefcase, Compass, Mail, Sparkles, Target } from "lucide-react";
import { ForYouLabel } from "@/components/app/match";
import { EmptyState, PageHeader } from "@/components/app/page-parts";
import { JobCard } from "@/components/jobs/job-card";
import { JobFilters, type FilterOption, type JobFilterValues } from "@/components/jobs/job-filters";
import { Button } from "@/components/ui/button";
import { skillLevels } from "@/lib/ai/matching";
import { requireProfile } from "@/lib/auth";
import { getCatalog, skillName } from "@/lib/data/catalog";
import { loadOpenJobs, rankJobs, strongMatches, STRONG_MATCH_THRESHOLD } from "@/lib/data/jobs";
import { loadCareerProfile } from "@/lib/data/profile";
import { JOB_TYPE_LABELS } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus, JobType } from "@/lib/types";

export const metadata: Metadata = { title: "Jobs & Opportunities" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FILTER_KEYS = ["q", "location", "career", "industry", "company", "type", "level", "grad", "sort"] as const;

function uniqueOptions(values: (string | null | undefined)[]): FilterOption[] {
  return [...new Set(values.filter((v): v is string => Boolean(v && v.trim())))]
    .sort((a, b) => a.localeCompare(b))
    .map((v) => ({ value: v, label: v }));
}

export default async function JobsPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireProfile({ role: "seeker" });
  const sp = await searchParams;
  const values: JobFilterValues = {};
  for (const key of FILTER_KEYS) {
    const raw = sp[key];
    const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    if (value) values[key] = value.slice(0, 120);
  }

  const supabase = await createClient();
  const [catalog, data, jobs, appsResult, invitesResult] = await Promise.all([
    getCatalog(),
    loadCareerProfile(profile.id),
    loadOpenJobs(),
    supabase.from("applications").select("id, job_id, status").eq("user_id", profile.id),
    supabase
      .from("invitations")
      .select("id", { count: "exact", head: true })
      .eq("candidate_id", profile.id)
      .eq("status", "pending"),
  ]);
  if (!data) redirect("/onboarding");

  const levels = skillLevels(data);
  const applications = new Map<string, { id: string; status: ApplicationStatus }>(
    (appsResult.data ?? []).map((a) => [a.job_id, { id: a.id, status: a.status }]),
  );
  const ranked = rankJobs(data, catalog, jobs);
  const strong = strongMatches(ranked);
  const recommended = ranked.slice(0, 6);
  const pendingInvites = invitesResult.count ?? 0;
  const goalCareer = data.goal ? catalog.careerById.get(data.goal.career_id) : null;

  // Filter options come from the listings that are actually open.
  const options = {
    location: uniqueOptions(jobs.map((j) => j.location)),
    career: [...new Set(jobs.map((j) => j.career_id).filter((id): id is string => Boolean(id)))]
      .map((id) => ({ value: id, label: catalog.careerById.get(id)?.title ?? id }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    industry: uniqueOptions(jobs.map((j) => j.industry ?? j.company?.industry)),
    company: [...new Map(jobs.filter((j) => j.company).map((j) => [j.company!.slug, j.company!.name])).entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    type: (Object.keys(JOB_TYPE_LABELS) as JobType[]).map((t) => ({ value: t, label: JOB_TYPE_LABELS[t] })),
    level: uniqueOptions(jobs.map((j) => j.experience_level)),
    grad: [...new Set(jobs.flatMap((j) => j.grad_years))]
      .sort((a, b) => a - b)
      .map((y) => ({ value: String(y), label: String(y) })),
  };

  const q = values.q?.toLowerCase();
  const filtered = ranked.filter(({ job }) => {
    if (values.location && job.location !== values.location) return false;
    if (values.career && job.career_id !== values.career) return false;
    if (values.industry && (job.industry ?? job.company?.industry) !== values.industry) return false;
    if (values.company && job.company?.slug !== values.company) return false;
    if (values.type && job.job_type !== values.type) return false;
    if (values.level && job.experience_level !== values.level) return false;
    if (values.grad && job.grad_years.length > 0 && !job.grad_years.includes(Number(values.grad))) return false;
    if (q) {
      const haystack = [
        job.title,
        job.company?.name,
        job.location,
        job.industry,
        job.career_id ? catalog.careerById.get(job.career_id)?.title : "",
        ...[...job.required_skills, ...job.preferred_skills].map((id) => skillName(catalog, id)),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
  if (values.sort === "newest") {
    filtered.sort((a, b) => new Date(b.job.created_at).getTime() - new Date(a.job.created_at).getTime());
  }
  const topStrength = strong[0]?.match.strengths.slice(0, 2).map((id) => skillName(catalog, id));

  // With hundreds of listings, render a page at a time; "Show more" re-requests with a higher cap.
  const PAGE_SIZE = 48;
  const showRaw = Number(Array.isArray(sp.show) ? sp.show[0] : sp.show);
  const show = Number.isFinite(showRaw) && showRaw > 0 ? Math.floor(showRaw) : PAGE_SIZE;
  const visible = filtered.slice(0, show);
  const showMoreHref = () => {
    const params = new URLSearchParams({ ...values });
    params.set("show", String(show + PAGE_SIZE));
    return `/jobs?${params.toString()}`;
  };

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow={<ForYouLabel>Opportunities</ForYouLabel>}
        title="Jobs & Opportunities"
        description="Every listing is matched against your Career Profile, so you can see where you already fit and what would make you stronger."
        actions={
          <Button asChild variant="outline">
            <Link href="/applications">
              <Briefcase />
              Application Tracker
              {applications.size > 0 && <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{applications.size}</span>}
            </Link>
          </Button>
        }
        className="mb-0"
      />

      {pendingInvites > 0 && (
        <Link
          href="/applications#invitations"
          className="flex items-center gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 transition hover:bg-violet-500/15"
        >
          <span className="rounded-full bg-violet-500/15 p-2 text-violet-700 dark:text-violet-300">
            <Mail className="h-5 w-5" />
          </span>
          <span className="flex-1 text-sm">
            <span className="font-semibold">
              You have {pendingInvites} pending invitation{pendingInvites === 1 ? "" : "s"} from recruiters.
            </span>{" "}
            <span className="text-muted-foreground">Review and respond in your Application Tracker.</span>
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      )}

      <section aria-labelledby="recommended-heading" className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <ForYouLabel>Jobs Recommended For You</ForYouLabel>
              <h2 id="recommended-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
                We found{" "}
                <span className="bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent dark:from-emerald-400 dark:to-cyan-400">
                  {strong.length}
                </span>{" "}
                {strong.length === 1 ? "opportunity" : "opportunities"} for you
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {strong.length > 0
                  ? `Roles where you match at least ${STRONG_MATCH_THRESHOLD}% of what the employer is looking for${
                      topStrength && topStrength.length > 0 ? `, thanks to strengths like ${topStrength.join(" and ")}` : ""
                    }.`
                  : `No role is a ${STRONG_MATCH_THRESHOLD}%+ match yet. These are your closest opportunities, and each shows exactly which skills would close the gap.`}
              </p>
            </div>
            {data.skills.length === 0 ? (
              <Button asChild>
                <Link href="/profile">
                  <Sparkles />
                  Add skills for better matches
                </Link>
              </Button>
            ) : !goalCareer ? (
              <Button asChild variant="outline" className="bg-background/60">
                <Link href="/careers">
                  <Target />
                  Set a career goal
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="h-auto min-h-9 whitespace-normal bg-background/60 py-2 text-left">
                <Link href="/skill-gap">
                  <Target />
                  Your skill gap for {goalCareer.title}
                </Link>
              </Button>
            )}
          </div>
          {!goalCareer && data.skills.length > 0 && (
            <p className="relative mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <BellRing className="h-3.5 w-3.5" />
              Set a career goal and we&apos;ll notify you the moment a matching job is posted.
            </p>
          )}
        </div>

        {recommended.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recommended.map(({ job, match }) => (
              <JobCard
                key={job.id}
                job={job}
                match={match}
                catalog={catalog}
                levels={levels}
                application={applications.get(job.id)}
                detailed
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Briefcase}
            title="No open opportunities right now"
            description="New listings appear here as soon as employers publish them."
          />
        )}
      </section>

      <section id="browse" aria-labelledby="browse-heading" className="scroll-mt-24 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="browse-heading" className="text-xl font-semibold tracking-tight">
              Browse all opportunities
            </h2>
            <p className="text-sm text-muted-foreground">
              {filtered.length} of {ranked.length} open {ranked.length === 1 ? "listing" : "listings"}
              {values.sort === "newest" ? ", newest first" : ", best match first"}
            </p>
          </div>
        </div>
        <JobFilters key={JSON.stringify(values)} values={values} options={options} />
        {filtered.length > 0 ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible.map(({ job, match }) => (
                <JobCard
                  key={job.id}
                  job={job}
                  match={match}
                  catalog={catalog}
                  levels={levels}
                  application={applications.get(job.id)}
                />
              ))}
            </div>
            {filtered.length > visible.length && (
              <div className="flex flex-col items-center gap-1 pt-2">
                <Button asChild variant="outline">
                  <Link href={showMoreHref()} scroll={false}>
                    Show more jobs
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Showing {visible.length} of {filtered.length}
                </p>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={Compass}
            title="No jobs match these filters"
            description="Try removing a filter or searching for a broader term."
            action={
              <Button asChild variant="outline">
                <Link href="/jobs#browse">Clear filters</Link>
              </Button>
            }
          />
        )}
      </section>
    </div>
  );
}
